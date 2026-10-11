package object

import (
	"fmt"
	"sort"
	"time"
)

// Integration is one entry of the catalog. Its versions are in IntegrationVersion and the files of each version
// (bundle.json, logo, screenshots) in IntegrationFile, so the database alone holds everything the site serves.
type Integration struct {
	Id                  string   `xorm:"varchar(100) notnull pk" json:"id"`
	Owner               string   `xorm:"varchar(200) index" json:"owner"`
	Type                string   `xorm:"varchar(20) index" json:"type"`
	Name                string   `xorm:"varchar(200)" json:"name"`
	Description         string   `xorm:"varchar(1000)" json:"description"`
	Author              string   `xorm:"varchar(200)" json:"author"`
	License             string   `xorm:"varchar(100)" json:"license"`
	Homepage            string   `xorm:"varchar(500)" json:"homepage"`
	Logo                string   `xorm:"varchar(500)" json:"logo"`
	Categories          []string `xorm:"mediumtext json" json:"categories"`
	Tags                []string `xorm:"mediumtext json" json:"tags"`
	Screenshots         []string `xorm:"mediumtext json" json:"screenshots"`
	Verified            bool     `json:"verified"`
	RequiresGlobalAdmin bool     `json:"requiresGlobalAdmin"`
	Latest              string   `xorm:"varchar(50)" json:"latest"`
	CreatedTime         string   `xorm:"varchar(100)" json:"createdTime"`
	UpdatedTime         string   `xorm:"varchar(100)" json:"updatedTime"`
}

const (
	VersionStatusPending   = "Pending"
	VersionStatusPublished = "Published"
	VersionStatusRejected  = "Rejected"
	VersionStatusRevoked   = "Revoked"
)

type IntegrationVersion struct {
	IntegrationId  string `xorm:"varchar(100) notnull pk" json:"integrationId"`
	Version        string `xorm:"varchar(50) notnull pk" json:"version"`
	CasdoorVersion string `xorm:"varchar(100)" json:"casdoorVersion"`
	Sha256         string `xorm:"varchar(100)" json:"sha256"`
	Status         string `xorm:"varchar(20) index" json:"status"`
	StatusReason   string `xorm:"varchar(1000)" json:"statusReason"`
	PublishedAt    string `xorm:"varchar(100)" json:"publishedAt"`
	CreatedTime    string `xorm:"varchar(100)" json:"createdTime"`
}

// IntegrationFile is a file of a version, served at /data/integrations/<id>/<version>/<path>.
type IntegrationFile struct {
	IntegrationId string `xorm:"varchar(100) notnull pk" json:"integrationId"`
	Version       string `xorm:"varchar(50) notnull pk" json:"version"`
	Path          string `xorm:"varchar(200) notnull pk" json:"path"`
	Content       []byte `xorm:"mediumblob" json:"-"`
	Sha256        string `xorm:"varchar(100)" json:"sha256"`
}

// The format of index.json, which Casdoor instances and the site's pages read; it mirrors the build of
// casdoor/casdoor-integrations.
type indexText struct {
	En string `json:"en"`
}

type indexVersion struct {
	Version        string `json:"version"`
	CasdoorVersion string `json:"casdoorVersion"`
	Url            string `json:"url"`
	Sha256         string `json:"sha256"`
	PublishedAt    string `json:"publishedAt"`
}

type indexIntegration struct {
	Id                  string         `json:"id"`
	Type                string         `json:"type"`
	Name                indexText      `json:"name"`
	Description         indexText      `json:"description"`
	Author              string         `json:"author"`
	License             string         `json:"license"`
	Homepage            string         `json:"homepage,omitempty"`
	Tags                []string       `json:"tags,omitempty"`
	Categories          []string       `json:"categories"`
	Logo                string         `json:"logo,omitempty"`
	Screenshots         []string       `json:"screenshots,omitempty"`
	Verified            bool           `json:"verified"`
	RequiresGlobalAdmin bool           `json:"requiresGlobalAdmin,omitempty"`
	Latest              string         `json:"latest"`
	Versions            []indexVersion `json:"versions"`
}

type indexRevoked struct {
	Id      string `json:"id"`
	Version string `json:"version"`
	Reason  string `json:"reason"`
}

type Index struct {
	SchemaVersion int                `json:"schemaVersion"`
	GeneratedAt   string             `json:"generatedAt"`
	Integrations  []indexIntegration `json:"integrations"`
	Revoked       []indexRevoked     `json:"revoked"`
}

var typeOrder = map[string]int{"app": 0, "provider": 1, "theme": 2, "action": 3}

func GetVersionFileUrl(id string, version string, path string) string {
	return fmt.Sprintf("integrations/%s/%s/%s", id, version, path)
}

// GetIndex builds index.json from the published versions.
func GetIndex() (*Index, error) {
	var integrations []*Integration
	err := engine.Find(&integrations)
	if err != nil {
		return nil, err
	}
	var versions []*IntegrationVersion
	err = engine.In("status", VersionStatusPublished, VersionStatusRevoked).Find(&versions)
	if err != nil {
		return nil, err
	}

	byId := map[string][]*IntegrationVersion{}
	for _, v := range versions {
		byId[v.IntegrationId] = append(byId[v.IntegrationId], v)
	}

	index := &Index{SchemaVersion: 1, GeneratedAt: time.Now().UTC().Format(time.RFC3339), Integrations: []indexIntegration{}, Revoked: []indexRevoked{}}
	for _, i := range integrations {
		entry := indexIntegration{
			Id:                  i.Id,
			Type:                i.Type,
			Name:                indexText{En: i.Name},
			Description:         indexText{En: i.Description},
			Author:              i.Author,
			License:             i.License,
			Homepage:            i.Homepage,
			Tags:                i.Tags,
			Categories:          i.Categories,
			Logo:                i.Logo,
			Screenshots:         i.Screenshots,
			Verified:            i.Verified,
			RequiresGlobalAdmin: i.RequiresGlobalAdmin,
			Latest:              i.Latest,
			Versions:            []indexVersion{},
		}
		hasLatest := false
		for _, v := range byId[i.Id] {
			entry.Versions = append(entry.Versions, indexVersion{
				Version:        v.Version,
				CasdoorVersion: v.CasdoorVersion,
				Url:            GetVersionFileUrl(i.Id, v.Version, "bundle.json"),
				Sha256:         v.Sha256,
				PublishedAt:    v.PublishedAt,
			})
			if v.Status == VersionStatusRevoked {
				index.Revoked = append(index.Revoked, indexRevoked{Id: i.Id, Version: v.Version, Reason: v.StatusReason})
			}
			if v.Version == i.Latest {
				hasLatest = true
			}
		}
		if !hasLatest {
			continue
		}
		sort.Slice(entry.Versions, func(a, b int) bool { return entry.Versions[a].PublishedAt < entry.Versions[b].PublishedAt })
		index.Integrations = append(index.Integrations, entry)
	}

	sort.SliceStable(index.Integrations, func(a, b int) bool {
		x, y := index.Integrations[a], index.Integrations[b]
		if typeOrder[x.Type] != typeOrder[y.Type] {
			return typeOrder[x.Type] < typeOrder[y.Type]
		}
		return x.Id < y.Id
	})
	return index, nil
}

// GetIntegrationFile returns a file of a published or revoked version (instances that installed a revoked version
// still need to read it), or nil.
func GetIntegrationFile(id string, version string, path string) (*IntegrationFile, error) {
	v := &IntegrationVersion{}
	existed, err := engine.ID([]interface{}{id, version}).Get(v)
	if err != nil {
		return nil, err
	}
	if !existed || (v.Status != VersionStatusPublished && v.Status != VersionStatusRevoked) {
		return nil, nil
	}

	file := &IntegrationFile{}
	existed, err = engine.ID([]interface{}{id, version, path}).Get(file)
	if err != nil || !existed {
		return nil, err
	}
	return file, nil
}
