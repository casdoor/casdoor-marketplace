package routers

import (
	"bytes"
	"compress/gzip"
	"io"
	"net/http"
	"net/http/httputil"
	"net/url"
	"os"
	"strconv"
	"strings"

	"github.com/beego/beego/context"
	"github.com/casdoor/casdoor-marketplace/object"
)

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

var frontendProxy *httputil.ReverseProxy

// InitFrontendProxy points the pages at the Next.js server (StartFrontend) listening on port.
func InitFrontendProxy(port int) {
	target := &url.URL{Scheme: "http", Host: "127.0.0.1:" + strconv.Itoa(port)}
	frontendProxy = httputil.NewSingleHostReverseProxy(target)
	director := frontendProxy.Director
	frontendProxy.Director = func(r *http.Request) {
		// the original Host keeps the absolute URLs Next writes right; compression is done here after injecting analytics
		host := r.Host
		director(r)
		r.Host = host
		r.Header.Set("X-Accept-Encoding", r.Header.Get("Accept-Encoding"))
		r.Header.Del("Accept-Encoding")
	}
	frontendProxy.ModifyResponse = modifyFrontendResponse
}

// StaticFilter answers everything but /api/: the catalog under /data/, the language redirects, and the pages, which
// the Next.js server renders.
func StaticFilter(ctx *context.Context) {
	urlPath := ctx.Request.URL.Path
	if strings.HasPrefix(urlPath, "/api/") {
		return
	}
	if ctx.Request.Method != http.MethodGet && ctx.Request.Method != http.MethodHead {
		return
	}

	relPath := strings.TrimPrefix(urlPath, "/")
	if strings.HasPrefix(relPath, "data/") {
		serveData(ctx, strings.TrimPrefix(relPath, "data/"))
		return
	}
	// the catalog used to be at /integrations/; it is the home page now
	if strings.Trim(relPath, "/") == "integrations" {
		http.Redirect(ctx.ResponseWriter, ctx.Request, "/", http.StatusMovedPermanently)
		return
	}
	if redirectEnglishPrefix(ctx, strings.Trim(relPath, "/")) {
		return
	}
	if isPagePath(relPath) && redirectToPreferredLanguage(ctx, relPath) {
		return
	}

	frontendProxy.ServeHTTP(ctx.ResponseWriter, ctx.Request)
}

// isPagePath tells the addresses of pages (they end with "/") from files and the admin console.
func isPagePath(relPath string) bool {
	if relPath != "" && !strings.HasSuffix(relPath, "/") {
		return false
	}
	return !strings.HasPrefix(relPath, "_next/") && !strings.HasPrefix(relPath, "admin/") && !strings.HasPrefix(relPath, "og/")
}

func modifyFrontendResponse(resp *http.Response) error {
	contentType := resp.Header.Get("Content-Type")
	if !strings.HasPrefix(contentType, "text/html") && !isCompressible(contentType) {
		return nil
	}
	data, err := io.ReadAll(resp.Body)
	if err != nil {
		return err
	}
	_ = resp.Body.Close()

	if strings.HasPrefix(contentType, "text/html") && !strings.HasPrefix(resp.Request.URL.Path, "/admin") {
		data = injectAnalytics(data)
	}
	if frontendCdnUrl != "" {
		if strings.HasPrefix(contentType, "text/html") {
			rewriteLinkHeaderForCdn(resp.Header)
			data = rewriteHtmlForCdn(data)
		} else if strings.HasPrefix(contentType, "text/x-component") {
			data = bytes.ReplaceAll(data, nextStaticPattern, cdnStaticPrefix())
		}
	}
	if len(data) > 1024 && acceptsGzip(resp.Request.Header.Get("X-Accept-Encoding")) {
		var buf bytes.Buffer
		zw := gzip.NewWriter(&buf)
		_, _ = zw.Write(data)
		_ = zw.Close()
		data = buf.Bytes()
		resp.Header.Set("Content-Encoding", "gzip")
	}
	resp.Header.Add("Vary", "Accept-Encoding")
	resp.Header.Set("Content-Length", strconv.Itoa(len(data)))
	resp.Body = io.NopCloser(bytes.NewReader(data))
	return nil
}

// injectAnalytics puts the analytics set in the admin console into the <head> of a page. The code has none, so a
// deployment only reports to the analytics its own admins set.
func injectAnalytics(data []byte) []byte {
	analytics := object.GetAnalyticsHtml()
	if analytics == "" {
		return data
	}
	return bytes.Replace(data, []byte("</head>"), []byte(analytics+"</head>"), 1)
}

func writeBody(ctx *context.Context, status int, data []byte) {
	header := ctx.ResponseWriter.Header()
	header.Add("Vary", "Accept-Encoding")
	if len(data) > 1024 && isCompressible(header.Get("Content-Type")) && acceptsGzip(ctx.Request.Header.Get("Accept-Encoding")) {
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

func isFile(path string) bool {
	info, err := os.Stat(path)
	return err == nil && !info.IsDir()
}

func isDir(path string) bool {
	info, err := os.Stat(path)
	return err == nil && info.IsDir()
}

func isCompressible(contentType string) bool {
	return strings.HasPrefix(contentType, "text/") || strings.HasPrefix(contentType, "application/json") ||
		strings.HasPrefix(contentType, "application/xml") || strings.HasPrefix(contentType, "image/svg+xml") ||
		strings.HasPrefix(contentType, "application/javascript")
}

func acceptsGzip(acceptEncoding string) bool {
	for _, part := range strings.Split(acceptEncoding, ",") {
		coding, params, _ := strings.Cut(strings.TrimSpace(part), ";")
		if strings.EqualFold(strings.TrimSpace(coding), "gzip") && strings.ReplaceAll(strings.TrimSpace(params), " ", "") != "q=0" {
			return true
		}
	}
	return false
}
