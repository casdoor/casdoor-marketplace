package controllers

import (
	"crypto/rand"
	"encoding/hex"
	"net/http"
	"strings"

	"github.com/beego/beego/logs"
	"github.com/casdoor/casdoor-marketplace/object"
)

// where the browser goes after signing in when the sign-in link does not say
const consolePath = "/console/"

// getSigninRedirect returns the path the sign-in link asks to come back to, if it is a path of this site.
func (c *ApiController) getSigninRedirect() string {
	redirect := c.GetString("redirect")
	if !strings.HasPrefix(redirect, "/") || strings.HasPrefix(redirect, "//") || strings.ContainsAny(redirect, "\\\r\n") {
		return consolePath
	}
	return redirect
}

// The address Casdoor sends the code to; register it in the Casdoor application's redirect URLs for every host.
func (c *ApiController) getRedirectUri() string {
	host := c.Ctx.Request.Host
	scheme := "https"
	if strings.HasPrefix(host, "localhost:") || strings.HasPrefix(host, "127.0.0.1:") {
		scheme = "http"
	}
	return scheme + "://" + host + "/api/callback"
}

// Signin sends the browser to the Casdoor sign-in page.
func (c *ApiController) Signin() {
	if !object.IsCasdoorConfigured() {
		c.ResponseError("Casdoor is not configured, set casdoorEndpoint, clientId and clientSecret in conf/app.conf")
		return
	}

	buf := make([]byte, 16)
	_, err := rand.Read(buf)
	if err != nil {
		c.ResponseError(err.Error())
		return
	}
	state := hex.EncodeToString(buf)
	c.SetSession("oauthState", state)
	c.SetSession("signinRedirect", c.getSigninRedirect())
	c.Redirect(object.GetSigninUrl(c.getRedirectUri(), state), http.StatusFound)
}

// Callback signs the user in with the code from Casdoor and goes back to the page the sign-in started from.
func (c *ApiController) Callback() {
	state, _ := c.GetSession("oauthState").(string)
	c.DelSession("oauthState")
	if state == "" || c.GetString("state") != state {
		c.ResponseError("The sign-in has expired, please sign in again")
		return
	}

	user, err := object.GetUserByOAuthCode(c.GetString("code"))
	if err != nil {
		logs.Warn("signin failed: %v", err)
		c.ResponseError("Sign-in failed: " + err.Error())
		return
	}

	redirect, _ := c.GetSession("signinRedirect").(string)
	c.DelSession("signinRedirect")
	if redirect == "" {
		redirect = consolePath
	}

	c.SetSessionUser(user)
	logs.Info("signin: %s/%s (admin: %v)", user.Owner, user.Name, user.IsAdmin)
	c.Redirect(redirect, http.StatusFound)
}

func (c *ApiController) Signout() {
	c.SetSessionUser(nil)
	c.ResponseOk(nil)
}

type Account struct {
	User *object.User `json:"user"`
	// whether this deployment can sign in and keep settings at all
	HasCasdoor  bool `json:"hasCasdoor"`
	HasDatabase bool `json:"hasDatabase"`
}

func (c *ApiController) GetAccount() {
	c.ResponseOk(&Account{
		User:        c.GetSessionUser(),
		HasCasdoor:  object.IsCasdoorConfigured(),
		HasDatabase: object.HasDatabase(),
	})
}
