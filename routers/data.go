package routers

import (
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"sync"
	"time"

	"github.com/beego/beego/context"
	"github.com/beego/beego/logs"
	"github.com/casdoor/casdoor-marketplace/object"
)

// Without a database (local frontend work), /data is served from the copy of casdoor-integrations that
// web/scripts/fetch-integrations.mjs puts here.
const localDataDir = "web/public/data"

const indexCacheTtl = 30 * time.Second

var (
	dataMutex sync.Mutex
	// the free catalog for instances and the full one for the site's pages
	indexCache    = map[bool][]byte{}
	indexCachedAt = map[bool]time.Time{}
	// the versions withdrawn right now, for status.json
	statusCache    []byte
	statusCachedAt time.Time
	// the files of a version never change, so they are kept once read
	fileCache = map[string]*object.IntegrationFile{}
)

// internalToken lets the site's Next.js server, which this process starts, read the files of paid integrations
// for the pages; anyone else needs a license
var internalToken = newInternalToken()

func newInternalToken() string {
	b := make([]byte, 32)
	if _, err := rand.Read(b); err != nil {
		panic(err)
	}
	return hex.EncodeToString(b)
}

const (
	internalHeader = "X-Marketplace-Internal"
	licenseHeader  = "X-Casdoor-License"
)

func isInternalRequest(ctx *context.Context) bool {
	return ctx.Input.Header(internalHeader) == internalToken
}

// getRequestLicense returns the license a Casdoor instance sent, nil when it sent none, or an error for a bad one
func getRequestLicense(ctx *context.Context) (*object.License, error) {
	text := ctx.Input.Header(licenseHeader)
	if text == "" {
		return nil, nil
	}
	return object.ParseLicense(text)
}

func writeForbidden(ctx *context.Context, message string) {
	ctx.ResponseWriter.Header().Set("Content-Type", "text/plain; charset=utf-8")
	ctx.ResponseWriter.Header().Set("Cache-Control", "no-store")
	writeBody(ctx, http.StatusForbidden, []byte(message))
}

// serveData answers /data/index.json and /data/integrations/<id>/<version>/<path>, the catalog Casdoor instances read
// (marketplaceUrl) and the site's pages are built from.
func serveData(ctx *context.Context, relPath string) {
	if !object.HasDatabase() {
		path := filepath.Join(localDataDir, filepath.FromSlash(relPath))
		if !filepath.IsLocal(relPath) || !isFile(path) {
			http.NotFound(ctx.ResponseWriter, ctx.Request)
			return
		}
		data, err := os.ReadFile(path)
		if err != nil {
			http.Error(ctx.ResponseWriter, err.Error(), http.StatusInternalServerError)
			return
		}
		writeData(ctx, relPath, data, "no-cache")
		return
	}

	if relPath == "paid-index.json" {
		license, err := getRequestLicense(ctx)
		if err != nil {
			writeForbidden(ctx, err.Error())
			return
		}
		index, err := object.GetPaidIndex(license)
		if err != nil {
			logs.Error("GetPaidIndex(): %v", err)
			http.Error(ctx.ResponseWriter, err.Error(), http.StatusInternalServerError)
			return
		}
		data, err := json.MarshalIndent(index, "", "  ")
		if err != nil {
			http.Error(ctx.ResponseWriter, err.Error(), http.StatusInternalServerError)
			return
		}
		recordDataEvent(ctx, "index", "", "", relPath, license)
		writeData(ctx, relPath, data, "private, no-store")
		return
	}

	if relPath == "status.json" {
		serveStatus(ctx)
		return
	}

	if relPath == "index.json" {
		data, err := getIndexJson(isInternalRequest(ctx))
		if err != nil {
			logs.Error("getIndexJson(): %v", err)
			http.Error(ctx.ResponseWriter, err.Error(), http.StatusInternalServerError)
			return
		}
		if !isInternalRequest(ctx) {
			recordDataEvent(ctx, "index", "", "", relPath, nil)
		}
		writeData(ctx, relPath, data, "no-cache")
		return
	}

	parts := strings.SplitN(relPath, "/", 4)
	if len(parts) != 4 || parts[0] != "integrations" {
		http.NotFound(ctx.ResponseWriter, ctx.Request)
		return
	}
	if parts[3] == "meta.json" {
		serveVersionMeta(ctx, parts[1], parts[2])
		return
	}
	file, err := getIntegrationFile(parts[1], parts[2], parts[3])
	if err != nil {
		logs.Error("getIntegrationFile(): %v", err)
		http.Error(ctx.ResponseWriter, err.Error(), http.StatusInternalServerError)
		return
	}
	if file == nil {
		http.NotFound(ctx.ResponseWriter, ctx.Request)
		return
	}

	edition, err := object.GetIntegrationEdition(parts[1])
	if err != nil {
		http.Error(ctx.ResponseWriter, err.Error(), http.StatusInternalServerError)
		return
	}
	// the logo and screenshots of a paid integration are public, its content needs a license
	isPublicAsset := strings.HasPrefix(parts[3], "logo.") || strings.HasPrefix(parts[3], "screenshots/")
	if edition == "" || isPublicAsset || isInternalRequest(ctx) {
		if !isPublicAsset && !isImage(parts[3]) && !isInternalRequest(ctx) {
			recordDataEvent(ctx, "download", parts[1], parts[2], parts[3], nil)
		}
		writeData(ctx, relPath, file.Content, "public, max-age=86400")
		return
	}

	license, err := getRequestLicense(ctx)
	if err != nil {
		writeForbidden(ctx, err.Error())
		return
	}
	if !license.Allows(edition) {
		writeForbidden(ctx, fmt.Sprintf("%s needs a Casdoor %s edition license or higher, see https://casdoor.cn/pricing", parts[1], strings.ToLower(edition)))
		return
	}
	if license.IsExpired() {
		publishedAt, err := object.GetIntegrationVersionPublishedAt(parts[1], parts[2])
		if err != nil {
			http.Error(ctx.ResponseWriter, err.Error(), http.StatusInternalServerError)
			return
		}
		if !license.AllowsVersion(edition, publishedAt) {
			writeForbidden(ctx, fmt.Sprintf("the license expired at %s, %s %s was published after it, see https://casdoor.cn/pricing", license.ExpireTime, parts[1], parts[2]))
			return
		}
	}
	content, err := object.WatermarkFile(parts[1], parts[2], parts[3], file.Content, license)
	if err != nil {
		http.Error(ctx.ResponseWriter, err.Error(), http.StatusInternalServerError)
		return
	}
	object.AddPaidDownload(license, parts[1], parts[2], parts[3], ctx.Input.IP())
	recordDataEvent(ctx, "download", parts[1], parts[2], parts[3], license)
	writeData(ctx, relPath, content, "private, no-store")
}

// serveStatus answers /data/status.json, which Casdoor reads each time an admin opens its Marketplace page: the versions
// withdrawn right now, which the CDN copy of the catalog may not have yet. Each read is counted as a browse.
func serveStatus(ctx *context.Context) {
	data, err := getStatusJson()
	if err != nil {
		logs.Error("getStatusJson(): %v", err)
		http.Error(ctx.ResponseWriter, err.Error(), http.StatusInternalServerError)
		return
	}
	if !isInternalRequest(ctx) {
		license, err := getRequestLicense(ctx)
		if err != nil {
			license = nil
		}
		recordDataEvent(ctx, "browse", "", "", "status.json", license)
	}
	writeData(ctx, "status.json", data, "no-store")
}

// the steps Casdoor reads meta.json again for, with ?step=, and the actions they are recorded as
var metaStepActions = map[string]string{
	"installed":   "installed",
	"failed":      "install_failed",
	"uninstalled": "uninstalled",
}

// the stages an install fails at, ?stage= with step=failed
var metaFailStages = map[string]bool{"revoked": true, "download": true, "variables": true, "create": true, "save": true}

// serveVersionMeta answers /data/integrations/<id>/<version>/meta.json, which Casdoor reads before installing a version
// it got from the CDN: the checksum the bundle must have and whether the version is still published. It is never cached,
// so a revocation takes effect at once; each read is counted as an install. Casdoor reads it again with ?step= when the
// install has ended (installed, or failed with ?stage=) and when the version is uninstalled. It also reads it with
// ?step=view when an admin opens the integration in its Marketplace page, which is counted as a view.
func serveVersionMeta(ctx *context.Context, id string, version string) {
	step := ctx.Input.Query("step")
	action := "install"
	if step == "view" {
		action = "view"
	} else if step != "" {
		serveVersionMetaStep(ctx, id, version, step)
		return
	}

	license, err := getRequestLicense(ctx)
	if err != nil {
		writeForbidden(ctx, err.Error())
		return
	}
	meta, err := object.GetVersionMeta(id, version, license)
	if err != nil {
		logs.Error("GetVersionMeta(): %v", err)
		http.Error(ctx.ResponseWriter, err.Error(), http.StatusInternalServerError)
		return
	}
	if meta == nil {
		http.NotFound(ctx.ResponseWriter, ctx.Request)
		return
	}
	data, err := json.Marshal(meta)
	if err != nil {
		http.Error(ctx.ResponseWriter, err.Error(), http.StatusInternalServerError)
		return
	}
	if !isInternalRequest(ctx) {
		recordDataEvent(ctx, action, id, version, "meta.json", license)
	}
	writeData(ctx, "meta.json", data, "no-store")
}

// serveVersionMetaStep records how an install ended or that a version was uninstalled. It answers the meta even for a
// version no longer in the Marketplace, and always with 200, so Casdoor does not ask the other node, which writes to the
// same database, again.
func serveVersionMetaStep(ctx *context.Context, id string, version string, step string) {
	action, ok := metaStepActions[step]
	if !ok || !object.IsValidIntegrationId(id) {
		http.Error(ctx.ResponseWriter, "invalid step", http.StatusBadRequest)
		return
	}
	stage := ""
	if step == "failed" {
		stage = ctx.Input.Query("stage")
		if !metaFailStages[stage] {
			stage = "other"
		}
	}

	license, err := getRequestLicense(ctx)
	if err != nil {
		license = nil
	}
	meta, err := object.GetVersionMeta(id, version, license)
	if err != nil {
		logs.Error("GetVersionMeta(): %v", err)
	}
	if meta == nil {
		meta = &object.VersionMeta{Id: id, Version: version}
	}
	data, err := json.Marshal(meta)
	if err != nil {
		http.Error(ctx.ResponseWriter, err.Error(), http.StatusInternalServerError)
		return
	}
	if !isInternalRequest(ctx) {
		target := "meta.json"
		if stage != "" {
			target = stage
		}
		recordDataEvent(ctx, action, id, version, target, license)
	}
	writeData(ctx, "meta.json", data, "no-store")
}

// the logos and screenshots the pages show are not downloads of an integration
func isImage(path string) bool {
	switch strings.ToLower(filepath.Ext(path)) {
	case ".png", ".jpg", ".jpeg", ".webp", ".gif", ".svg", ".ico":
		return true
	}
	return false
}

// recordDataEvent counts a catalog or file someone fetched from /data, mostly the backends of Casdoor instances
func recordDataEvent(ctx *context.Context, action string, id string, version string, path string, license *object.License) {
	event := &object.Event{
		Source:        object.EventSourceData,
		Action:        action,
		IntegrationId: id,
		Version:       version,
		Target:        path,
		ClientIp:      ctx.Input.IP(),
		UserAgent:     ctx.Input.UserAgent(),
		Host:          ctx.Input.Host(),
	}
	if license != nil {
		event.LicenseId, event.Edition = license.Id, license.Edition
	}
	object.AddEvent(event)
}

func getIndexJson(includePaid bool) ([]byte, error) {
	dataMutex.Lock()
	defer dataMutex.Unlock()

	if indexCache[includePaid] != nil && time.Since(indexCachedAt[includePaid]) < indexCacheTtl {
		return indexCache[includePaid], nil
	}
	index, err := object.GetIndex(includePaid)
	if err != nil {
		return nil, err
	}
	data, err := json.MarshalIndent(index, "", "  ")
	if err != nil {
		return nil, err
	}
	indexCache[includePaid], indexCachedAt[includePaid] = data, time.Now()
	return data, nil
}

func getStatusJson() ([]byte, error) {
	dataMutex.Lock()
	defer dataMutex.Unlock()

	if statusCache != nil && time.Since(statusCachedAt) < indexCacheTtl {
		return statusCache, nil
	}
	status, err := object.GetStatus()
	if err != nil {
		return nil, err
	}
	data, err := json.Marshal(status)
	if err != nil {
		return nil, err
	}
	statusCache, statusCachedAt = data, time.Now()
	return data, nil
}

func getIntegrationFile(id string, version string, path string) (*object.IntegrationFile, error) {
	key := id + "/" + version + "/" + path
	dataMutex.Lock()
	file, ok := fileCache[key]
	dataMutex.Unlock()
	if ok {
		return file, nil
	}

	file, err := object.GetIntegrationFile(id, version, path)
	if err != nil || file == nil {
		return nil, err
	}
	dataMutex.Lock()
	fileCache[key] = file
	dataMutex.Unlock()
	return file, nil
}

func writeData(ctx *context.Context, relPath string, data []byte, cacheControl string) {
	header := ctx.ResponseWriter.Header()
	if contentType, ok := contentTypes[strings.ToLower(filepath.Ext(relPath))]; ok {
		header.Set("Content-Type", contentType)
	}
	header.Set("Cache-Control", cacheControl)
	writeBody(ctx, http.StatusOK, data)
}
