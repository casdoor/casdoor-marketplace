package object

import (
	"net/url"
	"sort"
	"strings"
	"time"
)

// DashboardTotals are the headline numbers of a period
type DashboardTotals struct {
	Visitors       int64 `json:"visitors"`
	PageViews      int64 `json:"pageViews"`
	Searches       int64 `json:"searches"`
	Clicks         int64 `json:"clicks"`
	Casdoors       int64 `json:"casdoors"`
	CatalogFetches int64 `json:"catalogFetches"`
	Browses        int64 `json:"browses"`
	Views          int64 `json:"views"`
	Installs       int64 `json:"installs"`
	Installed      int64 `json:"installed"`
	InstallFailed  int64 `json:"installFailed"`
	Uninstalled    int64 `json:"uninstalled"`
	PaidDownloads  int64 `json:"paidDownloads"`
}

type DashboardPoint struct {
	Bucket string `json:"bucket"`
	DashboardTotals
}

type FunnelStep struct {
	Key   string `json:"key"`
	Count int64  `json:"count"`
}

type GroupStat struct {
	Name         string `json:"name"`
	Integrations int64  `json:"integrations"`
	PageViews    int64  `json:"pageViews"`
	Installs     int64  `json:"installs"`
	Installed    int64  `json:"installed"`
	CdnHits      int64  `json:"cdnHits"`
}

type HeatCell struct {
	Weekday int   `json:"weekday"`
	Hour    int   `json:"hour"`
	Count   int64 `json:"count"`
}

type CatalogSummary struct {
	Integrations  int64  `json:"integrations"`
	Paid          int64  `json:"paid"`
	Published     int64  `json:"published"`
	Revoked       int64  `json:"revoked"`
	Pending       int64  `json:"pending"`
	LastPublished string `json:"lastPublished"`
}

type Dashboard struct {
	Days int `json:"days"`
	// hour when the period is today, otherwise day
	Bucket string `json:"bucket"`
	Since  string `json:"since"`
	Now    string `json:"now"`
	// the previous period is as long and ends as far into it as now is into this one, so a day not over yet is
	// compared with the same hours of the day before
	PreviousSince string             `json:"previousSince"`
	PreviousUntil string             `json:"previousUntil"`
	Totals        *DashboardTotals   `json:"totals"`
	Previous      *DashboardTotals   `json:"previous"`
	Series        []*DashboardPoint  `json:"series"`
	SiteFunnel    []*FunnelStep      `json:"siteFunnel"`
	CasdoorFunnel []*FunnelStep      `json:"casdoorFunnel"`
	Types         []*GroupStat       `json:"types"`
	Editions      []*GroupStat       `json:"editions"`
	Top           []*IntegrationStat `json:"top"`
	Hosts         []*NameCount       `json:"hosts"`
	Langs         []*NameCount       `json:"langs"`
	Referrers     []*NameCount       `json:"referrers"`
	Searches      []*NameCount       `json:"searches"`
	EmptySearches []*NameCount       `json:"emptySearches"`
	FailStages    []*NameCount       `json:"failStages"`
	Heatmap       []*HeatCell        `json:"heatmap"`
	Recent        []*Event           `json:"recent"`
	Catalog       *CatalogSummary    `json:"catalog"`
	Cdn           *CdnStats          `json:"cdn"`
}

const dashboardTotalsColumns = `count(distinct case when source = 'site' and visitor_id <> '' then visitor_id end) as visitors,
	coalesce(sum(source = 'site' and action = 'page_view'), 0) as page_views,
	coalesce(sum(source = 'site' and action = 'search'), 0) as searches,
	coalesce(sum(source = 'site' and action in ('click', 'copy')), 0) as clicks,
	count(distinct case when source = 'data' then client_ip end) as casdoors,
	coalesce(sum(source = 'data' and action = 'index'), 0) as catalog_fetches,
	coalesce(sum(source = 'data' and action = 'browse'), 0) as browses,
	coalesce(sum(source = 'data' and action = 'view'), 0) as views,
	coalesce(sum(source = 'data' and action = 'install'), 0) as installs,
	coalesce(sum(source = 'data' and action = 'installed'), 0) as installed,
	coalesce(sum(source = 'data' and action = 'install_failed'), 0) as install_failed,
	coalesce(sum(source = 'data' and action = 'uninstalled'), 0) as uninstalled,
	coalesce(sum(source = 'data' and action = 'download' and license_id <> ''), 0) as paid_downloads`

func parseDashboardTotals(row map[string]string) DashboardTotals {
	return DashboardTotals{
		Visitors: parseInt64(row["visitors"]), PageViews: parseInt64(row["page_views"]), Searches: parseInt64(row["searches"]),
		Clicks: parseInt64(row["clicks"]), Casdoors: parseInt64(row["casdoors"]), CatalogFetches: parseInt64(row["catalog_fetches"]),
		Browses: parseInt64(row["browses"]), Views: parseInt64(row["views"]), Installs: parseInt64(row["installs"]),
		Installed: parseInt64(row["installed"]), InstallFailed: parseInt64(row["install_failed"]), Uninstalled: parseInt64(row["uninstalled"]),
		PaidDownloads: parseInt64(row["paid_downloads"]),
	}
}

func getDashboardTotals(since string, until string) (*DashboardTotals, error) {
	rows, err := engine.QueryString(`select `+dashboardTotalsColumns+` from event
		where created_time >= ? and created_time < ? and is_bot = 0`, since, until)
	if err != nil {
		return nil, err
	}
	totals := &DashboardTotals{}
	if len(rows) > 0 {
		*totals = parseDashboardTotals(rows[0])
	}
	return totals, nil
}

func getDashboardSeries(since string, now time.Time, bucket string) ([]*DashboardPoint, error) {
	width := 10
	if bucket == "hour" {
		width = 13
	}
	rows, err := engine.QueryString(`select left(created_time, ?) as bucket, `+dashboardTotalsColumns+` from event
		where created_time >= ? and is_bot = 0 group by bucket`, width, since)
	if err != nil {
		return nil, err
	}
	byBucket := map[string]map[string]string{}
	for _, row := range rows {
		byBucket[row["bucket"]] = row
	}

	// every hour or day of the period, with zeros where nothing happened
	res := []*DashboardPoint{}
	start, _ := time.ParseInLocation(eventTimeLayout, since, eventZone)
	for t := start; !t.After(now); {
		var key string
		if bucket == "hour" {
			key = t.Format("2006-01-02 15")
			t = t.Add(time.Hour)
		} else {
			key = t.Format("2006-01-02")
			t = t.AddDate(0, 0, 1)
		}
		point := &DashboardPoint{Bucket: key}
		if row, ok := byBucket[key]; ok {
			point.DashboardTotals = parseDashboardTotals(row)
		}
		res = append(res, point)
	}
	return res, nil
}

func getFunnel(sql string, keys []string, args ...interface{}) ([]*FunnelStep, error) {
	rows, err := engine.QueryString(append([]interface{}{sql}, args...)...)
	if err != nil {
		return nil, err
	}
	res := []*FunnelStep{}
	for _, key := range keys {
		step := &FunnelStep{Key: key}
		if len(rows) > 0 {
			step.Count = parseInt64(rows[0][key])
		}
		res = append(res, step)
	}
	return res, nil
}

func addGroup(groups map[string]*GroupStat, name string, stat *IntegrationStat) {
	group, ok := groups[name]
	if !ok {
		group = &GroupStat{Name: name}
		groups[name] = group
	}
	group.Integrations++
	group.PageViews += stat.PageViews
	group.Installs += stat.Installs
	group.Installed += stat.Installed
	group.CdnHits += stat.CdnHits
}

func sortedGroups(groups map[string]*GroupStat, order []string) []*GroupStat {
	rank := map[string]int{}
	for i, name := range order {
		rank[name] = i + 1
	}
	res := []*GroupStat{}
	for _, group := range groups {
		res = append(res, group)
	}
	sort.Slice(res, func(i, j int) bool {
		a, b := rank[res[i].Name], rank[res[j].Name]
		if a == 0 {
			a = len(order) + 1
		}
		if b == 0 {
			b = len(order) + 1
		}
		if a != b {
			return a < b
		}
		return res[i].Name < res[j].Name
	})
	return res
}

// the referrers by site, without their paths
func groupReferrers(rows []*NameCount, limit int) []*NameCount {
	counts := map[string]int64{}
	for _, row := range rows {
		host := row.Name
		if u, err := url.Parse(row.Name); err == nil && u.Host != "" {
			host = strings.TrimPrefix(strings.ToLower(u.Host), "www.")
		}
		counts[host] += row.Count
	}
	res := []*NameCount{}
	for name, count := range counts {
		res = append(res, &NameCount{Name: name, Count: count})
	}
	sort.Slice(res, func(i, j int) bool {
		if res[i].Count != res[j].Count {
			return res[i].Count > res[j].Count
		}
		return res[i].Name < res[j].Name
	})
	if len(res) > limit {
		res = res[:limit]
	}
	return res
}

func getCatalogSummary() (*CatalogSummary, error) {
	summary := &CatalogSummary{}
	rows, err := engine.QueryString(`select count(*) as integrations, coalesce(sum(edition is not null and edition <> ''), 0) as paid from integration`)
	if err != nil {
		return nil, err
	}
	if len(rows) > 0 {
		summary.Integrations, summary.Paid = parseInt64(rows[0]["integrations"]), parseInt64(rows[0]["paid"])
	}
	rows, err = engine.QueryString(`select coalesce(sum(status = 'Published'), 0) as published, coalesce(sum(status = 'Revoked'), 0) as revoked,
		coalesce(sum(status = 'Pending'), 0) as pending, coalesce(max(case when status = 'Published' then published_at end), '') as last_published
		from integration_version`)
	if err != nil {
		return nil, err
	}
	if len(rows) > 0 {
		summary.Published, summary.Revoked = parseInt64(rows[0]["published"]), parseInt64(rows[0]["revoked"])
		summary.Pending, summary.LastPublished = parseInt64(rows[0]["pending"]), rows[0]["last_published"]
	}
	return summary, nil
}

// GetDashboard sums up the last days for the admin dashboard: the headline numbers against the period before, their
// trend by hour (today) or by day, the funnels of the site and of the Casdoor instances, and what is used the most
func GetDashboard(days int) (*Dashboard, error) {
	now := time.Now().In(eventZone)
	since := getSince(days)
	start, _ := time.ParseInLocation(eventTimeLayout, since, eventZone)
	dashboard := &Dashboard{
		Days: days, Bucket: "day", Since: since, Now: eventTime(now),
		PreviousSince: eventTime(start.AddDate(0, 0, -days)), PreviousUntil: eventTime(now.AddDate(0, 0, -days)),
	}
	if days == 1 {
		dashboard.Bucket = "hour"
	}

	var err error
	dashboard.Totals, err = getDashboardTotals(since, "9999")
	if err != nil {
		return nil, err
	}
	dashboard.Previous, err = getDashboardTotals(dashboard.PreviousSince, dashboard.PreviousUntil)
	if err != nil {
		return nil, err
	}
	dashboard.Series, err = getDashboardSeries(since, now, dashboard.Bucket)
	if err != nil {
		return nil, err
	}

	dashboard.SiteFunnel, err = getFunnel(`select
		count(distinct case when action = 'page_view' then visitor_id end) as visited,
		count(distinct case when action = 'page_view' and integration_id <> '' then visitor_id end) as opened,
		count(distinct case when action in ('click', 'copy') and integration_id <> '' then visitor_id end) as acted
		from event where created_time >= ? and is_bot = 0 and source = 'site' and visitor_id <> ''`,
		[]string{"visited", "opened", "acted"}, since)
	if err != nil {
		return nil, err
	}
	dashboard.CasdoorFunnel, err = getFunnel(`select
		count(distinct client_ip) as reached,
		count(distinct case when action = 'install' then client_ip end) as started,
		count(distinct case when action = 'installed' then client_ip end) as installed
		from event where created_time >= ? and source = 'data'`,
		[]string{"reached", "started", "installed"}, since)
	if err != nil {
		return nil, err
	}

	dashboard.Cdn = GetCdnStats(days)
	stats, err := getIntegrationStats(since)
	if err != nil {
		return nil, err
	}
	types, editions := map[string]*GroupStat{}, map[string]*GroupStat{}
	listed := []*IntegrationStat{}
	for _, stat := range stats {
		stat.CdnHits = dashboard.Cdn.BundleHits[stat.IntegrationId]
		// events of an integration no longer in the catalog have no type
		if stat.Type == "" {
			continue
		}
		listed = append(listed, stat)
		addGroup(types, stat.Type, stat)
		edition := stat.Edition
		if edition == "" {
			edition = "Free"
		}
		addGroup(editions, edition, stat)
	}
	dashboard.Types = sortedGroups(types, []string{"app", "provider", "theme", "action"})
	dashboard.Editions = sortedGroups(editions, []string{"Free", "Commercial", "Enterprise"})
	sort.SliceStable(listed, func(i, j int) bool {
		a, b := listed[i], listed[j]
		if a.Installs != b.Installs {
			return a.Installs > b.Installs
		}
		if a.PageViews != b.PageViews {
			return a.PageViews > b.PageViews
		}
		return a.CdnHits > b.CdnHits
	})
	if len(listed) > 10 {
		listed = listed[:10]
	}
	dashboard.Top = listed

	dashboard.Hosts, err = queryNameCounts(`select host as name, count(*) as count from event where created_time >= ?
		and is_bot = 0 and action = 'page_view' group by host order by count desc limit 10`, since)
	if err != nil {
		return nil, err
	}
	dashboard.Langs, err = queryNameCounts(`select lang as name, count(*) as count from event where created_time >= ?
		and is_bot = 0 and action = 'page_view' group by lang order by count desc limit 10`, since)
	if err != nil {
		return nil, err
	}
	referrers, err := queryNameCounts(`select referrer as name, count(*) as count from event where created_time >= ?
		and is_bot = 0 and action = 'page_view' and referrer <> '' group by referrer order by count desc limit 500`, since)
	if err != nil {
		return nil, err
	}
	dashboard.Referrers = groupReferrers(referrers, 10)
	dashboard.Searches, err = queryNameCounts(`select lower(query) as name, count(*) as count from event where created_time >= ?
		and is_bot = 0 and action = 'search' and query <> '' group by name order by count desc limit 10`, since)
	if err != nil {
		return nil, err
	}
	dashboard.EmptySearches, err = queryNameCounts(`select lower(query) as name, count(*) as count from event where created_time >= ?
		and is_bot = 0 and action = 'search' and query <> '' and count = 0 group by name order by count desc limit 10`, since)
	if err != nil {
		return nil, err
	}
	dashboard.FailStages, err = queryNameCounts(`select target as name, count(*) as count from event where created_time >= ?
		and source = 'data' and action = 'install_failed' group by target order by count desc`, since)
	if err != nil {
		return nil, err
	}

	rows, err := engine.QueryString(`select weekday(created_time) as weekday, cast(substring(created_time, 12, 2) as unsigned) as hour,
		count(*) as count from event where created_time >= ? and is_bot = 0 and action = 'page_view' group by weekday, hour`, since)
	if err != nil {
		return nil, err
	}
	dashboard.Heatmap = []*HeatCell{}
	for _, row := range rows {
		dashboard.Heatmap = append(dashboard.Heatmap, &HeatCell{
			Weekday: int(parseInt64(row["weekday"])), Hour: int(parseInt64(row["hour"])), Count: parseInt64(row["count"]),
		})
	}

	dashboard.Recent = []*Event{}
	err = engine.Where("source = ?", EventSourceData).In("action", "view", "install", "installed", "install_failed", "uninstalled").
		Desc("created_time", "id").Limit(15).Find(&dashboard.Recent)
	if err != nil {
		return nil, err
	}

	dashboard.Catalog, err = getCatalogSummary()
	if err != nil {
		return nil, err
	}
	return dashboard, nil
}
