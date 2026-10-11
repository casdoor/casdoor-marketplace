package routers

import (
	"net/http"
	"slices"
	"strconv"
	"strings"

	"github.com/beego/beego/context"
)

// English pages are at the root of web/build, the other languages under <language>/
// (web/scripts/move-default-locale.mjs). Keep this list in step with `locales` in web/src/lib/i18n.ts.
var prefixedLanguages = []string{"zh"}

const languageCookie = "lang"

// redirectEnglishPrefix sends /en/... to the same address without the prefix.
func redirectEnglishPrefix(ctx *context.Context, relPath string) bool {
	if relPath != "en" && !strings.HasPrefix(relPath, "en/") {
		return false
	}
	redirect(ctx, "/"+strings.TrimPrefix(strings.TrimPrefix(relPath, "en"), "/"), http.StatusMovedPermanently)
	return true
}

// redirectToPreferredLanguage sends a first-time visitor whose browser prefers another language from an English page
// to the same page in that language. The language switcher sets the cookie, after which the choice is left alone.
func redirectToPreferredLanguage(ctx *context.Context, relPath string) bool {
	for _, language := range prefixedLanguages {
		if relPath == language || strings.HasPrefix(relPath, language+"/") {
			return false
		}
	}
	ctx.ResponseWriter.Header().Add("Vary", "Accept-Language")
	if _, err := ctx.Request.Cookie(languageCookie); err == nil {
		return false
	}
	preferred := getPreferredLanguage(ctx.Request.Header.Get("Accept-Language"))
	if !slices.Contains(prefixedLanguages, preferred) {
		return false
	}
	redirect(ctx, "/"+preferred+"/"+relPath, http.StatusFound)
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
