package object

import (
	"crypto/ed25519"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"strings"
	"time"
)

// The public key of the Casdoor edition licenses, the same as in casdoor's edition package
var licensePublicKey = ed25519.PublicKey(mustDecodeBase64("yu3Y2GTk/CNjdXfooXzLVUDCo19jTV3VXVDFLdHu+Bg="))

var editionRanks = map[string]int{"Community": 0, "Commercial": 1, "Enterprise": 2}

type License struct {
	Id         string `json:"id"`
	Licensee   string `json:"licensee"`
	Edition    string `json:"edition"`
	IssuedTime string `json:"issuedTime"`
	ExpireTime string `json:"expireTime"`
}

func mustDecodeBase64(s string) []byte {
	res, err := base64.StdEncoding.DecodeString(s)
	if err != nil {
		panic(err)
	}
	return res
}

// ParseLicense verifies a license of the form "<base64url payload>.<base64url Ed25519 signature of the payload part>".
// An expired license still covers the versions published before it expired
func ParseLicense(text string) (*License, error) {
	parts := strings.Split(strings.TrimSpace(text), ".")
	if len(parts) != 2 {
		return nil, fmt.Errorf("the license is malformed")
	}
	payload, err := base64.RawURLEncoding.DecodeString(parts[0])
	if err != nil {
		return nil, fmt.Errorf("the license is malformed")
	}
	signature, err := base64.RawURLEncoding.DecodeString(parts[1])
	if err != nil {
		return nil, fmt.Errorf("the license is malformed")
	}
	if !ed25519.Verify(licensePublicKey, []byte(parts[0]), signature) {
		return nil, fmt.Errorf("the license signature is invalid")
	}

	license := &License{}
	err = json.Unmarshal(payload, license)
	if err != nil {
		return nil, fmt.Errorf("the license is malformed")
	}
	if editionRanks[license.Edition] == 0 {
		return nil, fmt.Errorf("the license has an unknown edition: %s", license.Edition)
	}
	if license.ExpireTime != "" {
		if _, err = time.Parse(time.RFC3339, license.ExpireTime); err != nil {
			return nil, fmt.Errorf("the license has an invalid expire time")
		}
	}
	return license, nil
}

func (license *License) IsExpired() bool {
	if license == nil || license.ExpireTime == "" {
		return false
	}
	expireTime, err := time.Parse(time.RFC3339, license.ExpireTime)
	return err != nil || time.Now().After(expireTime)
}

// AllowsVersion tells whether the license is good for a version of an integration that needs the edition: after
// the license expired, only for the versions published before it expired
func (license *License) AllowsVersion(edition string, publishedAt string) bool {
	if !license.Allows(edition) {
		return false
	}
	if !license.IsExpired() {
		return true
	}
	expireTime, err := time.Parse(time.RFC3339, license.ExpireTime)
	if err != nil {
		return false
	}
	t, err := time.Parse(time.RFC3339, publishedAt)
	return err == nil && !t.After(expireTime)
}

// Allows tells whether the license is good for an integration that needs the edition
func (license *License) Allows(edition string) bool {
	return license != nil && editionRanks[license.Edition] >= editionRanks[edition]
}
