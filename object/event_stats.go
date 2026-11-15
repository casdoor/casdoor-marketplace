package object

import (
	"sort"
	"strconv"
	"time"

	"github.com/xorm-io/xorm"
)

type ActionCount struct {
	Source   string `json:"source"`
	Action   string `json:"action"`
	Count    int64  `json:"count"`
	Visitors int64  `json:"visitors"`
	// the addresses it came from, e.g. the Casdoor backends that fetched the catalog
	Addresses int64 `json:"addresses"`
}

type DailyCount struct {
	Day    string `json:"day"`
	Source string `json:"source"`
	Action string `json:"action"`
	Count  int64  `json:"count"`
}

type IntegrationStat struct {
	IntegrationId string `json:"integrationId"`
	Name          string `json:"name"`
	Type          string `json:"type"`
	Edition       string `json:"edition"`
	// the site: views of the detail page, the visitors who viewed it, and clicks and copies on it
	PageViews int64 `json:"pageViews"`
	Visitors  int64 `json:"visitors"`
	Clicks    int64 `json:"clicks"`
	// its files downloaded from /data, and from how many addresses
	Downloads         int64 `json:"downloads"`
	DownloadAddresses int64 `json:"downloadAddresses"`
	// the bundle.json downloads from jsDelivr, where most Casdoor instances get the free integrations
	CdnHits int64 `json:"cdnHits"`
}

type NameCount struct {
	Name  string `json:"name"`
	Count int64  `json:"count"`
}

// CatalogClient is an address that fetched the catalog from /data, mostly the backend of a Casdoor instance
type CatalogClient struct {
	ClientIp  string `json:"clientIp"`
	UserAgent string `json:"userAgent"`
	Fetches   int64  `json:"fetches"`
	Downloads int64  `json:"downloads"`
	Days      int64  `json:"days"`
	FirstSeen string `json:"firstSeen"`
	LastSeen  string `json:"lastSeen"`
	LicenseId string `json:"licenseId"`
	Hosts     string `json:"hosts"`
}

type EventStats struct {
	Days         int                `json:"days"`
	Since        string             `json:"since"`
	Actions      []*ActionCount     `json:"actions"`
	Daily        []*DailyCount      `json:"daily"`
	Integrations []*IntegrationStat `json:"integrations"`
	Searches     []*NameCount       `json:"searches"`
	Clicks       []*NameCount       `json:"clicks"`
	Referrers    []*NameCount       `json:"referrers"`
	Pages        []*NameCount       `json:"pages"`
	Licenses     []*NameCount       `json:"licenses"`
	Cdn          *CdnStats          `json:"cdn"`
}

func parseInt64(s string) int64 {
	n, _ := strconv.ParseInt(s, 10, 64)
	return n
}

func queryNameCounts(sql string, args ...interface{}) ([]*NameCount, error) {
	rows, err := engine.QueryString(append([]interface{}{sql}, args...)...)
	if err != nil {
		return nil, err
	}
	res := []*NameCount{}
	for _, row := range rows {
		res = append(res, &NameCount{Name: row["name"], Count: parseInt64(row["count"])})
	}
	return res, nil
}

func getSince(days int) string {
	return time.Now().In(eventZone).AddDate(0, 0, -days+1).Format("2006-01-02") + " 00:00:00"
}

// GetEventStats sums up the events of the last days, leaving out crawlers and scripts
func GetEventStats(days int) (*EventStats, error) {
	since := getSince(days)
	stats := &EventStats{Days: days, Since: since}

	rows, err := engine.QueryString(`select source, action, count(*) as count, count(distinct nullif(visitor_id, '')) as visitors,
		count(distinct client_ip) as addresses from event where created_time >= ? and is_bot = 0
		group by source, action order by count desc`, since)
	if err != nil {
		return nil, err
	}
	for _, row := range rows {
		stats.Actions = append(stats.Actions, &ActionCount{
			Source: row["source"], Action: row["action"], Count: parseInt64(row["count"]),
			Visitors: parseInt64(row["visitors"]), Addresses: parseInt64(row["addresses"]),
		})
	}

	rows, err = engine.QueryString(`select left(created_time, 10) as day, source, action, count(*) as count from event
		where created_time >= ? and is_bot = 0 group by day, source, action order by day`, since)
	if err != nil {
		return nil, err
	}
	for _, row := range rows {
		stats.Daily = append(stats.Daily, &DailyCount{Day: row["day"], Source: row["source"], Action: row["action"], Count: parseInt64(row["count"])})
	}

	stats.Integrations, err = getIntegrationStats(since)
	if err != nil {
		return nil, err
	}

	stats.Searches, err = queryNameCounts(`select lower(query) as name, count(*) as count from event where created_time >= ?
		and is_bot = 0 and action = 'search' and query <> '' group by name order by count desc limit 50`, since)
	if err != nil {
		return nil, err
	}
	stats.Clicks, err = queryNameCounts(`select target as name, count(*) as count from event where created_time >= ?
		and is_bot = 0 and source = 'site' and action in ('click', 'copy') group by target order by count desc limit 30`, since)
	if err != nil {
		return nil, err
	}
	stats.Referrers, err = queryNameCounts(`select referrer as name, count(*) as count from event where created_time >= ?
		and is_bot = 0 and action = 'page_view' and referrer <> '' group by referrer order by count desc limit 30`, since)
	if err != nil {
		return nil, err
	}
	stats.Pages, err = queryNameCounts(`select path as name, count(*) as count from event where created_time >= ?
		and is_bot = 0 and action = 'page_view' group by path order by count desc limit 30`, since)
	if err != nil {
		return nil, err
	}
	stats.Licenses, err = queryNameCounts(`select concat(license_id, ' (', edition, ')') as name, count(*) as count from event
		where created_time >= ? and source = 'data' and license_id <> '' group by license_id, edition order by count desc limit 30`, since)
	if err != nil {
		return nil, err
	}

	stats.Cdn = GetCdnStats(days)
	for _, stat := range stats.Integrations {
		stat.CdnHits = stats.Cdn.BundleHits[stat.IntegrationId]
	}
	return stats, nil
}

func getIntegrationStats(since string) ([]*IntegrationStat, error) {
	integrations := []*Integration{}
	err := engine.Cols("id", "name", "type", "edition").Find(&integrations)
	if err != nil {
		return nil, err
	}
	byId := map[string]*IntegrationStat{}
	get := func(id string) *IntegrationStat {
		stat, ok := byId[id]
		if !ok {
			stat = &IntegrationStat{IntegrationId: id}
			byId[id] = stat
		}
		return stat
	}
	for _, integration := range integrations {
		stat := get(integration.Id)
		stat.Name, stat.Type, stat.Edition = integration.Name, integration.Type, integration.Edition
	}

	rows, err := engine.QueryString(`select integration_id, source, action, count(*) as count,
		count(distinct nullif(visitor_id, '')) as visitors, count(distinct client_ip) as addresses from event
		where created_time >= ? and is_bot = 0 and integration_id <> '' group by integration_id, source, action`, since)
	if err != nil {
		return nil, err
	}
	for _, row := range rows {
		stat := get(row["integration_id"])
		count := parseInt64(row["count"])
		switch row["source"] + "/" + row["action"] {
		case "site/page_view":
			stat.PageViews += count
			stat.Visitors += parseInt64(row["visitors"])
		case "site/click", "site/copy":
			stat.Clicks += count
		case "data/download":
			stat.Downloads += count
			stat.DownloadAddresses += parseInt64(row["addresses"])
		}
	}

	res := []*IntegrationStat{}
	for _, stat := range byId {
		res = append(res, stat)
	}
	sort.Slice(res, func(i, j int) bool {
		a, b := res[i], res[j]
		if a.PageViews != b.PageViews {
			return a.PageViews > b.PageViews
		}
		if a.CdnHits != b.CdnHits {
			return a.CdnHits > b.CdnHits
		}
		return a.IntegrationId < b.IntegrationId
	})
	return res, nil
}

// GetCatalogClients lists the addresses that fetched the catalog from /data in the last days, the latest first
func GetCatalogClients(days int) ([]*CatalogClient, error) {
	rows, err := engine.QueryString(`select client_ip, max(user_agent) as user_agent, sum(action = 'index') as fetches,
		sum(action = 'download') as downloads, count(distinct left(created_time, 10)) as days, min(created_time) as first_seen,
		max(created_time) as last_seen, max(license_id) as license_id, group_concat(distinct host) as hosts from event
		where source = 'data' and created_time >= ? group by client_ip order by last_seen desc limit 500`, getSince(days))
	if err != nil {
		return nil, err
	}
	res := []*CatalogClient{}
	for _, row := range rows {
		res = append(res, &CatalogClient{
			ClientIp: row["client_ip"], UserAgent: row["user_agent"], Fetches: parseInt64(row["fetches"]),
			Downloads: parseInt64(row["downloads"]), Days: parseInt64(row["days"]), FirstSeen: row["first_seen"],
			LastSeen: row["last_seen"], LicenseId: row["license_id"], Hosts: row["hosts"],
		})
	}
	return res, nil
}

type EventFilter struct {
	Source        string
	Action        string
	IntegrationId string
	ClientIp      string
	VisitorId     string
	IncludeBots   bool
	Page          int
	PageSize      int
}

// GetEvents lists events, newest first
func GetEvents(filter *EventFilter) ([]*Event, int64, error) {
	session := func() *xorm.Session {
		s := engine.NewSession()
		if filter.Source != "" {
			s = s.Where("source = ?", filter.Source)
		}
		if filter.Action != "" {
			s = s.And("action = ?", filter.Action)
		}
		if filter.IntegrationId != "" {
			s = s.And("integration_id = ?", filter.IntegrationId)
		}
		if filter.ClientIp != "" {
			s = s.And("client_ip = ?", filter.ClientIp)
		}
		if filter.VisitorId != "" {
			s = s.And("visitor_id = ?", filter.VisitorId)
		}
		if !filter.IncludeBots {
			s = s.And("is_bot = 0")
		}
		return s
	}

	countSession := session()
	defer countSession.Close()
	count, err := countSession.Count(&Event{})
	if err != nil {
		return nil, 0, err
	}

	events := []*Event{}
	findSession := session()
	defer findSession.Close()
	err = findSession.Desc("id").Limit(filter.PageSize, (filter.Page-1)*filter.PageSize).Find(&events)
	if err != nil {
		return nil, 0, err
	}
	return events, count, nil
}
