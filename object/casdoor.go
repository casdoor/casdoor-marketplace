package object

import (
	"encoding/base64"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strings"
	"time"

	"github.com/casdoor/casdoor-marketplace/conf"
)

// User is who signed in with Casdoor. The site keeps no user table: the session holds the user.
type User struct {
	Owner       string `json:"owner"`
	Name        string `json:"name"`
	DisplayName string `json:"displayName"`
	Avatar      string `json:"avatar"`
	IsAdmin     bool   `json:"isAdmin"`
}

const AdminUserName = "admin"

var casdoorHttpClient = &http.Client{Timeout: 15 * time.Second}

func getCasdoorEndpoint() string {
	return strings.TrimSuffix(conf.GetConfigString("casdoorEndpoint"), "/")
}

func IsCasdoorConfigured() bool {
	return getCasdoorEndpoint() != "" && conf.GetConfigString("clientId") != "" && conf.GetConfigString("clientSecret") != ""
}

func GetSigninUrl(redirectUri string, state string) string {
	query := url.Values{
		"client_id":     {conf.GetConfigString("clientId")},
		"response_type": {"code"},
		"redirect_uri":  {redirectUri},
		"scope":         {"read"},
		"state":         {state},
	}
	return getCasdoorEndpoint() + "/login/oauth/authorize?" + query.Encode()
}

// GetUserByOAuthCode exchanges the code Casdoor sends to the callback for an access token and reads the user from it.
// The token comes straight from Casdoor over TLS for our client secret, so its claims are trusted as they are.
func GetUserByOAuthCode(code string) (*User, error) {
	form := url.Values{
		"grant_type":    {"authorization_code"},
		"client_id":     {conf.GetConfigString("clientId")},
		"client_secret": {conf.GetConfigString("clientSecret")},
		"code":          {code},
	}
	resp, err := casdoorHttpClient.PostForm(getCasdoorEndpoint()+"/api/login/oauth/access_token", form)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, err
	}

	var token struct {
		AccessToken      string `json:"access_token"`
		Error            string `json:"error"`
		ErrorDescription string `json:"error_description"`
	}
	err = json.Unmarshal(body, &token)
	if err != nil {
		return nil, fmt.Errorf("casdoor returned %d: %s", resp.StatusCode, string(body))
	}
	if token.AccessToken == "" {
		return nil, fmt.Errorf("casdoor: %s %s", token.Error, token.ErrorDescription)
	}

	parts := strings.Split(token.AccessToken, ".")
	if len(parts) != 3 {
		return nil, fmt.Errorf("casdoor returned an access token that is not a JWT")
	}
	payload, err := base64.RawURLEncoding.DecodeString(parts[1])
	if err != nil {
		return nil, err
	}

	user := &User{}
	err = json.Unmarshal(payload, user)
	if err != nil {
		return nil, err
	}
	if user.Name == "" {
		return nil, fmt.Errorf("casdoor returned a token without a user name")
	}
	if organization := conf.GetConfigString("casdoorOrganization"); organization != "" && user.Owner != organization {
		return nil, fmt.Errorf("user %s/%s does not belong to organization %s", user.Owner, user.Name, organization)
	}
	if user.DisplayName == "" {
		user.DisplayName = user.Name
	}
	// everyone of the organization can sign in; the site is run by its user named admin
	user.IsAdmin = user.Name == AdminUserName
	return user, nil
}
