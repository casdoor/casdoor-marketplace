package controllers

import (
	"crypto/rand"
	"encoding/hex"
	"net/http"
	"regexp"
	"strings"

	"github.com/beego/beego/context"
	"github.com/casdoor/casdoor-marketplace/object"
)

const (
	visitorCookie = "casdoor_marketplace_vid"
	// two years, like the cookies of Google Analytics
	visitorCookieMaxAge = 2 * 365 * 24 * 3600
)

var visitorIdRegex = regexp.MustCompile(`^[0-9a-f]{16}$`)

// GetVisitorId returns the visitor ID in the cookie of the browser, giving it one when it has none, so a visitor is
// counted once however many days and pages. Crawlers and scripts get no cookie; their events keep the hash of the IP
// address and the browser of the day.
func GetVisitorId(ctx *context.Context) string {
	if object.IsBotUserAgent(ctx.Input.UserAgent()) {
		return ""
	}
	if id := ctx.GetCookie(visitorCookie); visitorIdRegex.MatchString(id) {
		return id
	}

	b := make([]byte, 8)
	if _, err := rand.Read(b); err != nil {
		return ""
	}
	id := hex.EncodeToString(b)
	host, _, _ := strings.Cut(ctx.Input.Host(), ":")
	http.SetCookie(ctx.ResponseWriter, &http.Cookie{
		Name:     visitorCookie,
		Value:    id,
		Path:     "/",
		MaxAge:   visitorCookieMaxAge,
		HttpOnly: true,
		Secure:   host != "localhost" && host != "127.0.0.1",
		SameSite: http.SameSiteLaxMode,
	})
	return id
}
