// Command import_integrations copies the build of casdoor/casdoor-integrations (its dist branch, or the dist/
// directory after `npm run build` there) into the database of conf/app.conf: integrations, versions and their files.
// A version already in the database is left alone, since versions do not change once published; a different sha256
// for it is reported. Integrations new to the database belong to the admin user.
//
// Run it from the repository root; without -apply it only prints what it would do:
//
//	go run ./tools/import_integrations -dir ../casdoor-integrations/dist [-apply]
package main

import (
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"flag"
	"fmt"
	"os"
	"path/filepath"
	"time"

	"github.com/casdoor/casdoor-marketplace/conf"
	"github.com/casdoor/casdoor-marketplace/object"
)

type text struct {
	En string `json:"en"`
}

type version struct {
	Version        string `json:"version"`
	CasdoorVersion string `json:"casdoorVersion"`
	Url            string `json:"url"`
	Sha256         string `json:"sha256"`
	PublishedAt    string `json:"publishedAt"`
}

type integration struct {
	Id                  string    `json:"id"`
	Type                string    `json:"type"`
	Name                text      `json:"name"`
	Description         text      `json:"description"`
	Author              string    `json:"author"`
	License             string    `json:"license"`
	Homepage            string    `json:"homepage"`
	Logo                string    `json:"logo"`
	Categories          []string  `json:"categories"`
	Tags                []string  `json:"tags"`
	Screenshots         []string  `json:"screenshots"`
	Verified            bool      `json:"verified"`
	RequiresGlobalAdmin bool      `json:"requiresGlobalAdmin"`
	Latest              string    `json:"latest"`
	Versions            []version `json:"versions"`
}

type index struct {
	Integrations []integration `json:"integrations"`
	Revoked      []struct {
		Id      string `json:"id"`
		Version string `json:"version"`
		Reason  string `json:"reason"`
	} `json:"revoked"`
}

func main() {
	dir := flag.String("dir", "", "the dist directory of casdoor-integrations")
	apply := flag.Bool("apply", false, "write to the database")
	flag.Parse()
	if *dir == "" {
		flag.Usage()
		os.Exit(2)
	}
	if conf.GetConfigString("dataSourceName") == "" {
		fmt.Println("dataSourceName is empty in conf/app.conf")
		os.Exit(1)
	}
	object.InitAdapter()

	data, err := os.ReadFile(filepath.Join(*dir, "index.json"))
	if err != nil {
		panic(err)
	}
	var idx index
	err = json.Unmarshal(data, &idx)
	if err != nil {
		panic(err)
	}
	revoked := map[string]string{}
	for _, r := range idx.Revoked {
		revoked[r.Id+"@"+r.Version] = r.Reason
	}

	engine := object.GetEngine()
	now := time.Now().Format(time.RFC3339)
	for _, i := range idx.Integrations {
		existing := &object.Integration{}
		existed, err := engine.ID(i.Id).Get(existing)
		if err != nil {
			panic(err)
		}
		row := &object.Integration{
			Id: i.Id, Owner: existing.Owner, Type: i.Type, Name: i.Name.En, Description: i.Description.En, Author: i.Author,
			License: i.License, Homepage: i.Homepage, Logo: i.Logo, Categories: i.Categories, Tags: i.Tags,
			Screenshots: i.Screenshots, Verified: i.Verified, RequiresGlobalAdmin: i.RequiresGlobalAdmin, Latest: i.Latest,
			CreatedTime: existing.CreatedTime, UpdatedTime: now,
		}
		if !existed {
			row.Owner = conf.GetConfigString("casdoorOrganization") + "/" + object.AdminUserName
			row.CreatedTime = now
		}

		var actions []string
		var newVersions []*object.IntegrationVersion
		var newFiles []*object.IntegrationFile
		for _, v := range i.Versions {
			existingVersion := &object.IntegrationVersion{}
			versionExisted, err := engine.ID([]interface{}{i.Id, v.Version}).Get(existingVersion)
			if err != nil {
				panic(err)
			}
			if versionExisted {
				if existingVersion.Sha256 != v.Sha256 {
					actions = append(actions, fmt.Sprintf("%s: sha256 differs from the database, left alone", v.Version))
				}
				continue
			}

			status, reason := object.VersionStatusPublished, ""
			if r, ok := revoked[i.Id+"@"+v.Version]; ok {
				status, reason = object.VersionStatusRevoked, r
			}
			newVersions = append(newVersions, &object.IntegrationVersion{
				IntegrationId: i.Id, Version: v.Version, CasdoorVersion: v.CasdoorVersion, Sha256: v.Sha256, Status: status,
				StatusReason: reason, PublishedAt: v.PublishedAt, CreatedTime: now,
			})

			versionDir := filepath.Join(*dir, "integrations", i.Id, v.Version)
			entries, err := os.ReadDir(versionDir)
			if err != nil {
				panic(err)
			}
			var names []string
			for _, e := range entries {
				if e.IsDir() {
					continue
				}
				content, err := os.ReadFile(filepath.Join(versionDir, e.Name()))
				if err != nil {
					panic(err)
				}
				sum := sha256.Sum256(content)
				newFiles = append(newFiles, &object.IntegrationFile{
					IntegrationId: i.Id, Version: v.Version, Path: e.Name(), Content: content, Sha256: hex.EncodeToString(sum[:]),
				})
				names = append(names, e.Name())
			}
			actions = append(actions, fmt.Sprintf("add %s (%s) with %v", v.Version, status, names))
		}

		verb := "update"
		if !existed {
			verb = "add"
		}
		fmt.Printf("%s %s (%s, owner %s): %v\n", verb, i.Id, i.Type, row.Owner, actions)
		if !*apply {
			continue
		}

		if existed {
			_, err = engine.ID(i.Id).AllCols().Update(row)
		} else {
			_, err = engine.Insert(row)
		}
		if err != nil {
			panic(err)
		}
		for _, v := range newVersions {
			if _, err = engine.Insert(v); err != nil {
				panic(err)
			}
		}
		for _, f := range newFiles {
			if _, err = engine.Insert(f); err != nil {
				panic(err)
			}
		}
	}
	if !*apply {
		fmt.Println("\nplan only, rerun with -apply to write it")
	}
}
