package routers

import (
	"encoding/json"
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
	dataMutex     sync.Mutex
	indexCache    []byte
	indexCachedAt time.Time
	// the files of a version never change, so they are kept once read
	fileCache = map[string]*object.IntegrationFile{}
)

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

	if relPath == "index.json" {
		data, err := getIndexJson()
		if err != nil {
			logs.Error("getIndexJson(): %v", err)
			http.Error(ctx.ResponseWriter, err.Error(), http.StatusInternalServerError)
			return
		}
		writeData(ctx, relPath, data, "no-cache")
		return
	}

	parts := strings.SplitN(relPath, "/", 4)
	if len(parts) != 4 || parts[0] != "integrations" {
		http.NotFound(ctx.ResponseWriter, ctx.Request)
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
	writeData(ctx, relPath, file.Content, "public, max-age=86400")
}

func getIndexJson() ([]byte, error) {
	dataMutex.Lock()
	defer dataMutex.Unlock()

	if indexCache != nil && time.Since(indexCachedAt) < indexCacheTtl {
		return indexCache, nil
	}
	index, err := object.GetIndex()
	if err != nil {
		return nil, err
	}
	data, err := json.MarshalIndent(index, "", "  ")
	if err != nil {
		return nil, err
	}
	indexCache, indexCachedAt = data, time.Now()
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
