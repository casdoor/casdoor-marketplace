package object

import (
	"encoding/json"
	"fmt"
	"html"
	"net/url"
	"regexp"
	"strings"
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
	// CasdeskWidgets has one line per domain: "<page host or *> <Casdesk server URL> <Casdesk site>".
	CasdeskWidgets string `json:"casdeskWidgets"`
}

type casdeskWidget struct {
	host   string
	server string
	site   string
}

var (
	googleAnalyticsIdRegex = regexp.MustCompile(`^G-[A-Z0-9]{4,20}$`)
	baiduTongjiIdRegex     = regexp.MustCompile(`^[0-9a-f]{32}$`)
	casdeskHostRegex       = regexp.MustCompile(`^(\*|[a-z0-9]([a-z0-9.-]*[a-z0-9])?(:[0-9]{1,5})?)$`)
	casdeskSiteRegex       = regexp.MustCompile(`^[A-Za-z0-9_-]{1,100}$`)
)

func parseCasdeskWidgets(text string) ([]*casdeskWidget, error) {
	var res []*casdeskWidget
	for _, line := range strings.Split(text, "\n") {
		parts := strings.Fields(line)
		if len(parts) == 0 {
			continue
		}
		if len(parts) != 3 {
			return nil, fmt.Errorf("a Casdesk line is \"<domain or *> <Casdesk server URL> <site>\": %s", strings.TrimSpace(line))
		}
		host := strings.ToLower(parts[0])
		if !casdeskHostRegex.MatchString(host) {
			return nil, fmt.Errorf("not a domain: %s", parts[0])
		}
		u, err := url.Parse(parts[1])
		if err != nil || (u.Scheme != "https" && u.Scheme != "http") || u.Host == "" || u.RawQuery != "" || u.Fragment != "" || u.User != nil {
			return nil, fmt.Errorf("a Casdesk server URL looks like https://chat.example.com: %s", parts[1])
		}
		if !casdeskSiteRegex.MatchString(parts[2]) {
			return nil, fmt.Errorf("a Casdesk site name has only letters, digits, - and _: %s", parts[2])
		}
		res = append(res, &casdeskWidget{host: host, server: strings.TrimRight(u.String(), "/"), site: parts[2]})
	}
	return res, nil
}

// getCasdeskWidget picks the line for the host of the page, or the "*" line when no line names it.
func getCasdeskWidget(text string, host string) *casdeskWidget {
	widgets, err := parseCasdeskWidgets(text)
	if err != nil {
		return nil
	}
	host = strings.ToLower(host)
	var fallback *casdeskWidget
	for _, widget := range widgets {
		if widget.host == host {
			return widget
		}
		if widget.host == "*" && fallback == nil {
			fallback = widget
		}
	}
	return fallback
}

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
		case "casdeskWidgets":
			settings.CasdeskWidgets = row.Value
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
	if len(settings.CasdeskWidgets) > 1000 {
		return fmt.Errorf("the Casdesk lines are longer than 1000 characters")
	}
	_, err := parseCasdeskWidgets(settings.CasdeskWidgets)
	if err != nil {
		return err
	}

	now := time.Now().Format(time.RFC3339)
	rows := []*Setting{
		{Name: "googleAnalyticsId", Value: settings.GoogleAnalyticsId, UpdatedTime: now},
		{Name: "baiduTongjiId", Value: settings.BaiduTongjiId, UpdatedTime: now},
		{Name: "casdeskWidgets", Value: settings.CasdeskWidgets, UpdatedTime: now},
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

// GetAnalyticsHtml returns the scripts of the analytics and the Casdesk chat set in the admin console, to be put into
// the <head> of a page of this host and language.
func GetAnalyticsHtml(host string, lang string) string {
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
	if widget := getCasdeskWidget(settings.CasdeskWidgets, host); widget != nil {
		// The widget adds its element to <body>, so it loads once React has hydrated the page; otherwise the hydration
		// mismatch makes React render the page again and drop the widget.
		src, _ := json.Marshal(widget.server + "/widget.js")
		site, _ := json.Marshal(widget.site)
		language, _ := json.Marshal(lang)
		res += fmt.Sprintf(`<script>(function(){function l(){var s=document.createElement("script");s.src=%s;s.async=true;s.setAttribute("data-site",%s);s.setAttribute("data-lang",%s);document.body.appendChild(s)}function i(){(window.requestIdleCallback||setTimeout)(l)}if(document.readyState==="complete")i();else addEventListener("load",i)})()</script>`, src, site, language)
	}
	return res
}
