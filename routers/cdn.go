package routers

import (
	"bytes"
	"net/http"
	"os"
	"path/filepath"
	"regexp"
	"strings"

	"github.com/beego/beego/logs"
)

// A CDN can serve the frontend's static files (scripts, styles, fonts). CasWAF uploads a build's .next-build/static
// to its storage provider and writes the CDN's URL of the `_next/` folder, like https://cdn.example.com/x/_next/, to
// cdn.txt beside the build's server.js; the pages then point their `/_next/static/` URLs there. Without cdn.txt (no
// CDN, or `yarn dev`) everything is served from this site.
var frontendCdnUrl string

var cdnUrlRegex = regexp.MustCompile(`^https?://[^\s"'<>\\]+/$`)

func loadFrontendCdnUrl(frontendDir string) {
	data, err := os.ReadFile(filepath.Join(frontendDir, "cdn.txt"))
	if err != nil {
		frontendCdnUrl = ""
		return
	}
	cdnUrl := strings.TrimSpace(string(data))
	if !strings.HasSuffix(cdnUrl, "/") {
		cdnUrl += "/"
	}
	if !cdnUrlRegex.MatchString(cdnUrl) {
		logs.Warn("loadFrontendCdnUrl(): ignoring the invalid CDN URL %q", cdnUrl)
		frontendCdnUrl = ""
		return
	}
	frontendCdnUrl = cdnUrl
	logs.Info("the frontend's static files are served from %s", cdnUrl)
}

// The pages and the router payloads quote the static files as "/_next/static/..." (escaped as \"/_next/static/...\"
// inside the inline payloads, which this matches too).
var nextStaticPattern = []byte(`"/_next/static/`)

func cdnStaticPrefix() []byte {
	return []byte(`"` + frontendCdnUrl + "static/")
}

// rewriteHtmlForCdn points the page's static files at the CDN, and tells Turbopack's runtime to load the chunks it
// adds later from there too.
func rewriteHtmlForCdn(html []byte) []byte {
	html = bytes.ReplaceAll(html, nextStaticPattern, cdnStaticPrefix())
	script := []byte(`<script>self.TURBOPACK_CHUNK_BASE_PATH="` + frontendCdnUrl + `"</script>`)
	if index := bytes.Index(html, []byte("<head>")); index >= 0 {
		end := index + len("<head>")
		return append(html[:end:end], append(script, html[end:]...)...)
	}
	return html
}

// rewriteLinkHeaderForCdn points the preloads Next lists in the Link header (</_next/static/...>; rel=preload) at
// the CDN too, or the browser would fetch those files from both places.
func rewriteLinkHeaderForCdn(header http.Header) {
	values := header.Values("Link")
	if len(values) == 0 {
		return
	}
	header.Del("Link")
	for _, value := range values {
		header.Add("Link", strings.ReplaceAll(value, "</_next/static/", "<"+frontendCdnUrl+"static/"))
	}
}
