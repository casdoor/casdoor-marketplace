package routers

import (
	"net/http"
	"strconv"
	"strings"

	"github.com/beego/beego/context"
)

// English pages are at the root of web/build, Chinese ones under zh/ (web/scripts/move-default-locale.mjs).
const languageCookie = "lang"

// redirectEnglishPrefix sends /en/... to the same address without the prefix.
func redirectEnglishPrefix(ctx *context.Context, relPath string) bool {
	if relPath != "en" && !strings.HasPrefix(relPath, "en/") {
		return false
	}
	redirect(ctx, "/"+strings.TrimPrefix(strings.TrimPrefix(relPath, "en"), "/"), http.StatusMovedPermanently)
	return true
}

// redirectToChinese sends a first-time visitor whose browser prefers Chinese from an English page to the Chinese
// one. The language switcher sets the cookie, after which the choice is left alone.
func redirectToChinese(ctx *context.Context, relPath string) bool {
	if relPath == "zh" || strings.HasPrefix(relPath, "zh/") {
		return false
	}
	ctx.ResponseWriter.Header().Add("Vary", "Accept-Language")
	if _, err := ctx.Request.Cookie(languageCookie); err == nil {
		return false
	}
	if getPreferredLanguage(ctx.Request.Header.Get("Accept-Language")) != "zh" {
		return false
	}
	redirect(ctx, "/zh/"+relPath, http.StatusFound)
	return true
}

func redirect(ctx *context.Context, target string, status int) {
	if !strings.HasSuffix(target, "/") {
		target += "/"
	}
	if ctx.Request.URL.RawQuery != "" {
		target += "?" + ctx.Request.URL.RawQuery
	}
	http.Redirect(ctx.ResponseWriter, ctx.Request, target, status)
}

// getPreferredLanguage returns the primary subtag ("zh", "en", ...) of the language with the highest weight.
func getPreferredLanguage(acceptLanguage string) string {
	best, bestWeight := "", 0.0
	for _, part := range strings.Split(acceptLanguage, ",") {
		tag, params, _ := strings.Cut(strings.TrimSpace(part), ";")
		weight := 1.0
		if q, ok := strings.CutPrefix(strings.TrimSpace(params), "q="); ok {
			if w, err := strconv.ParseFloat(q, 64); err == nil {
				weight = w
			}
		}
		if tag == "" || tag == "*" || weight <= bestWeight {
			continue
		}
		best, bestWeight = tag, weight
	}
	primary, _, _ := strings.Cut(strings.ToLower(best), "-")
	return primary
}
