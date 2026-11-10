package object

import (
	"time"
)

// PaidDownload records who downloaded a file of a paid integration, by the license they sent
type PaidDownload struct {
	Id            int64  `xorm:"pk autoincr" json:"id"`
	CreatedTime   string `xorm:"varchar(100) index" json:"createdTime"`
	LicenseId     string `xorm:"varchar(100) index" json:"licenseId"`
	Licensee      string `xorm:"varchar(200)" json:"licensee"`
	IntegrationId string `xorm:"varchar(100) index" json:"integrationId"`
	Version       string `xorm:"varchar(50)" json:"version"`
	Path          string `xorm:"varchar(200)" json:"path"`
	ClientIp      string `xorm:"varchar(100)" json:"clientIp"`
}

func AddPaidDownload(license *License, id string, version string, path string, clientIp string) {
	if engine == nil {
		return
	}
	_, _ = engine.Insert(&PaidDownload{
		CreatedTime:   time.Now().Format(time.RFC3339),
		LicenseId:     license.Id,
		Licensee:      license.Licensee,
		IntegrationId: id,
		Version:       version,
		Path:          path,
		ClientIp:      clientIp,
	})
}

// GetIntegrationEdition returns the edition an integration needs, "" for a free one
func GetIntegrationEdition(id string) (string, error) {
	integration := &Integration{}
	existed, err := engine.ID(id).Cols("edition").Get(integration)
	if err != nil || !existed {
		return "", err
	}
	return integration.Edition, nil
}

func GetIntegrationVersionPublishedAt(id string, version string) (string, error) {
	v := &IntegrationVersion{}
	existed, err := engine.Where("integration_id = ? and version = ?", id, version).Cols("published_at").Get(v)
	if err != nil || !existed {
		return "", err
	}
	return v.PublishedAt, nil
}

func getWatermarkedBundleSha256(id string, version string, license *License) (string, error) {
	file, err := GetIntegrationFile(id, version, "bundle.json")
	if err != nil || file == nil {
		return "", err
	}
	bundle, err := watermarkBundle(id, version, file.Content, license)
	if err != nil {
		return "", err
	}
	return sha256Hex(bundle), nil
}
