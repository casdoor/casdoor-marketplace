package object

import (
	"fmt"
	"html"
	"regexp"
	"sync"
	"time"

	"github.com/beego/beego/logs"
)

// Setting is one item set in the admin console, stored by name.
type Setting struct {
	Name        string `xorm:"varchar(100) notnull pk" json:"name"`
	Value       string `xorm:"varchar(1000)" json:"value"`
	UpdatedTime string `xorm:"varchar(100)" json:"updatedTime"`
}

// SiteSettings are the settings of the admin console. Nothing is preset: a new deployment has no analytics.
type SiteSettings struct {
	GoogleAnalyticsId string `json:"googleAnalyticsId"`
	BaiduTongjiId     string `json:"baiduTongjiId"`
}

var (
	googleAnalyticsIdRegex = regexp.MustCompile(`^G-[A-Z0-9]{4,20}$`)
	baiduTongjiIdRegex     = regexp.MustCompile(`^[0-9a-f]{32}$`)
)

// Every node of a site reads the same database, so the cache expires rather than relying on being cleared.
const settingsCacheTtl = time.Minute

var (
	settingsMutex    sync.Mutex
	settingsCache    *SiteSettings
	settingsCachedAt time.Time
)

func GetSiteSettings() (*SiteSettings, error) {
	settings := &SiteSettings{}
	if engine == nil {
		return settings, nil
	}

	var rows []*Setting
	err := engine.Find(&rows)
	if err != nil {
		return nil, err
	}
	for _, row := range rows {
		switch row.Name {
		case "googleAnalyticsId":
			settings.GoogleAnalyticsId = row.Value
		case "baiduTongjiId":
			settings.BaiduTongjiId = row.Value
		}
	}
	return settings, nil
}

func UpdateSiteSettings(settings *SiteSettings) error {
	if engine == nil {
		return fmt.Errorf("the site has no database, set dataSourceName in conf/app.conf")
	}
	if settings.GoogleAnalyticsId != "" && !googleAnalyticsIdRegex.MatchString(settings.GoogleAnalyticsId) {
		return fmt.Errorf("a Google Analytics measurement ID looks like G-XXXXXXXXXX")
	}
	if settings.BaiduTongjiId != "" && !baiduTongjiIdRegex.MatchString(settings.BaiduTongjiId) {
		return fmt.Errorf("a Baidu Tongji site code is 32 hexadecimal characters, the part after hm.js?")
	}

	now := time.Now().Format(time.RFC3339)
	rows := []*Setting{
		{Name: "googleAnalyticsId", Value: settings.GoogleAnalyticsId, UpdatedTime: now},
		{Name: "baiduTongjiId", Value: settings.BaiduTongjiId, UpdatedTime: now},
	}
	for _, row := range rows {
		affected, err := engine.ID(row.Name).AllCols().Update(row)
		if err != nil {
			return err
		}
		if affected == 0 {
			_, err = engine.Insert(row)
			if err != nil {
				return err
			}
		}
	}

	settingsMutex.Lock()
	settingsCache = nil
	settingsMutex.Unlock()
	return nil
}

func getCachedSiteSettings() *SiteSettings {
	settingsMutex.Lock()
	defer settingsMutex.Unlock()

	if settingsCache != nil && time.Since(settingsCachedAt) < settingsCacheTtl {
		return settingsCache
	}
	settings, err := GetSiteSettings()
	if err != nil {
		logs.Warn("GetSiteSettings(): %v", err)
		if settingsCache != nil {
			return settingsCache
		}
		return &SiteSettings{}
	}
	settingsCache, settingsCachedAt = settings, time.Now()
	return settings
}

// GetAnalyticsHtml returns the scripts of the analytics set in the admin console, to be put into the <head> of pages.
func GetAnalyticsHtml() string {
	settings := getCachedSiteSettings()
	res := ""
	if id := settings.GoogleAnalyticsId; googleAnalyticsIdRegex.MatchString(id) {
		id = html.EscapeString(id)
		res += fmt.Sprintf(`<script async src="https://www.googletagmanager.com/gtag/js?id=%s"></script>`, id)
		res += fmt.Sprintf(`<script>window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag("js",new Date());gtag("config","%s");</script>`, id)
	}
	if id := settings.BaiduTongjiId; baiduTongjiIdRegex.MatchString(id) {
		res += fmt.Sprintf(`<script>var _hmt=_hmt||[];(function(){var hm=document.createElement("script");hm.src="https://hm.baidu.com/hm.js?%s";var s=document.getElementsByTagName("script")[0];s.parentNode.insertBefore(hm,s);})();</script>`, id)
	}
	return res
}
