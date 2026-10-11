package routers

import (
	"bytes"
	"compress/gzip"
	"net/http"
	"os"
	"path/filepath"
	"strings"

	"github.com/beego/beego/context"
)

const webDir = "web/build"

var contentTypes = map[string]string{
	".html":  "text/html; charset=utf-8",
	".css":   "text/css; charset=utf-8",
	".js":    "text/javascript; charset=utf-8",
	".json":  "application/json; charset=utf-8",
	".xml":   "application/xml; charset=utf-8",
	".txt":   "text/plain; charset=utf-8",
	".svg":   "image/svg+xml",
	".png":   "image/png",
	".jpg":   "image/jpeg",
	".jpeg":  "image/jpeg",
	".webp":  "image/webp",
	".ico":   "image/x-icon",
	".woff2": "font/woff2",
}

// StaticFilter serves the static export of the Next.js frontend in web/build.
func StaticFilter(ctx *context.Context) {
	urlPath := ctx.Request.URL.Path
	if strings.HasPrefix(urlPath, "/api/") {
		return
	}
	if ctx.Request.Method != http.MethodGet && ctx.Request.Method != http.MethodHead {
		return
	}

	relPath := strings.Trim(urlPath, "/")
	// the catalog used to be at /integrations/; it is the home page now
	if relPath == "integrations" {
		http.Redirect(ctx.ResponseWriter, ctx.Request, "/", http.StatusMovedPermanently)
		return
	}
	if redirectEnglishPrefix(ctx, relPath) {
		return
	}
	if relPath == "" {
		if redirectToPreferredLanguage(ctx, relPath) {
			return
		}
		relPath = "index.html"
	}
	if !filepath.IsLocal(relPath) {
		serveNotFound(ctx)
		return
	}

	if path := filepath.Join(webDir, relPath); isFile(path) {
		serveFile(ctx, path, http.StatusOK)
		return
	}
	if path := getSegmentPath(relPath); path != "" && isFile(path) {
		serveFile(ctx, path, http.StatusOK)
		return
	}

	// pages are <path>/index.html (trailingSlash in web/next.config.ts)
	path := filepath.Join(webDir, relPath, "index.html")
	if !isFile(path) {
		serveNotFound(ctx)
		return
	}
	if !strings.HasSuffix(urlPath, "/") {
		target := "/" + relPath + "/"
		if ctx.Request.URL.RawQuery != "" {
			target += "?" + ctx.Request.URL.RawQuery
		}
		http.Redirect(ctx.ResponseWriter, ctx.Request, target, http.StatusMovedPermanently)
		return
	}
	if redirectToPreferredLanguage(ctx, relPath+"/") {
		return
	}
	serveFile(ctx, path, http.StatusOK)
}

// The router prefetches segments as <page>/__next.integrations.$d$id.__PAGE__.txt, while the export writes them to
// <page>/__next.integrations/$d$id/__PAGE__.txt.
func getSegmentPath(relPath string) string {
	dir, name := filepath.Split(relPath)
	if !strings.HasPrefix(name, "__next.") || !strings.HasSuffix(name, ".txt") {
		return ""
	}
	parts := strings.Split(strings.TrimSuffix(name, ".txt"), ".")
	if len(parts) < 3 {
		return ""
	}
	segments := append([]string{parts[0] + "." + parts[1]}, parts[2:]...)
	return filepath.Join(webDir, dir, filepath.Join(segments...)+".txt")
}

func isFile(path string) bool {
	info, err := os.Stat(path)
	return err == nil && !info.IsDir()
}

func serveNotFound(ctx *context.Context) {
	path := filepath.Join(webDir, "404.html")
	if !isFile(path) {
		http.NotFound(ctx.ResponseWriter, ctx.Request)
		return
	}
	serveFile(ctx, path, http.StatusNotFound)
}

func serveFile(ctx *context.Context, path string, status int) {
	data, err := os.ReadFile(path)
	if err != nil {
		http.Error(ctx.ResponseWriter, err.Error(), http.StatusInternalServerError)
		return
	}

	header := ctx.ResponseWriter.Header()
	if contentType, ok := contentTypes[strings.ToLower(filepath.Ext(path))]; ok {
		header.Set("Content-Type", contentType)
	}
	if strings.Contains(filepath.ToSlash(path), "/_next/static/") {
		header.Set("Cache-Control", "public, max-age=31536000, immutable")
	} else {
		header.Set("Cache-Control", "no-cache")
	}

	header.Add("Vary", "Accept-Encoding")
	if len(data) > 1024 && isCompressible(header.Get("Content-Type")) && acceptsGzip(ctx.Request) {
		var buf bytes.Buffer
		zw := gzip.NewWriter(&buf)
		_, _ = zw.Write(data)
		_ = zw.Close()
		data = buf.Bytes()
		header.Set("Content-Encoding", "gzip")
	}

	ctx.ResponseWriter.WriteHeader(status)
	if ctx.Request.Method != http.MethodHead {
		_, _ = ctx.ResponseWriter.Write(data)
	}
}

func isCompressible(contentType string) bool {
	return strings.HasPrefix(contentType, "text/") || strings.HasPrefix(contentType, "application/json") ||
		strings.HasPrefix(contentType, "application/xml") || strings.HasPrefix(contentType, "image/svg+xml")
}

func acceptsGzip(r *http.Request) bool {
	for _, part := range strings.Split(r.Header.Get("Accept-Encoding"), ",") {
		coding, params, _ := strings.Cut(strings.TrimSpace(part), ";")
		if strings.EqualFold(strings.TrimSpace(coding), "gzip") && strings.ReplaceAll(strings.TrimSpace(params), " ", "") != "q=0" {
			return true
		}
	}
	return false
}
