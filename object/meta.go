package object

// VersionMeta is what Casdoor checks with the Marketplace before installing a version: the bundle it gets from the CDN
// must have this checksum, and a version revoked since the CDN copy of the catalog was built must not be installed.
// The Marketplace database is the authority; the CDN copy may be days old.
type VersionMeta struct {
	Id             string `json:"id"`
	Version        string `json:"version"`
	Status         string `json:"status"`
	Reason         string `json:"reason,omitempty"`
	Sha256         string `json:"sha256,omitempty"`
	CasdoorVersion string `json:"casdoorVersion,omitempty"`
	Latest         string `json:"latest"`
	Edition        string `json:"edition,omitempty"`
	PublishedAt    string `json:"publishedAt,omitempty"`
}

// GetVersionMeta returns nil for an integration or version that is not in the Marketplace or not published yet. For a
// paid integration the checksum is that of the bundle written for the license, and is left out without one.
func GetVersionMeta(id string, version string, license *License) (*VersionMeta, error) {
	integration := &Integration{}
	existed, err := engine.ID(id).Cols("id", "latest", "edition").Get(integration)
	if err != nil || !existed {
		return nil, err
	}
	v := &IntegrationVersion{}
	existed, err = engine.Where("integration_id = ? and version = ?", id, version).Get(v)
	if err != nil || !existed {
		return nil, err
	}
	if v.Status != VersionStatusPublished && v.Status != VersionStatusRevoked {
		return nil, nil
	}

	meta := &VersionMeta{
		Id:             id,
		Version:        version,
		Status:         v.Status,
		CasdoorVersion: v.CasdoorVersion,
		Latest:         integration.Latest,
		Edition:        integration.Edition,
		PublishedAt:    v.PublishedAt,
	}
	if v.Status == VersionStatusRevoked {
		meta.Reason = v.StatusReason
	}
	if integration.Edition == "" {
		meta.Sha256 = v.Sha256
	} else if license != nil && license.Allows(integration.Edition) {
		meta.Sha256, err = getWatermarkedBundleSha256(id, version, license)
		if err != nil {
			return nil, err
		}
	}
	return meta, nil
}
