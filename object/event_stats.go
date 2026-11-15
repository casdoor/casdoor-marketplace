package object

import (
	"sort"
	"strconv"
	"strings"
	"time"

	"github.com/xorm-io/xorm"
)

type ActionCount struct {
	Source    string `json:"source"`
	Action    string `json:"action"`
	Result    string `json:"result"`
	Count     int64  `json:"count"`
	Visitors  int64  `json:"visitors"`
	Instances int64  `json:"instances"`
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
	// Casdoor instances: views of the integration in their Marketplace page, installs and the instances that installed
	InstanceViews    int64 `json:"instanceViews"`
	Installs         int64 `json:"installs"`
	InstallInstances int64 `json:"installInstances"`
	InstallErrors    int64 `json:"installErrors"`
	Uninstalls       int64 `json:"uninstalls"`
	// files from /data and from Casdoor's download-marketplace-file
	Downloads int64 `json:"downloads"`
	// the instances seen in the last 7 days that have it installed, and how many times in all
	ActiveInstances int64 `json:"activeInstances"`
	ActiveInstalls  int64 `json:"activeInstalls"`
	// the bundle.json downloads from jsDelivr, where most Casdoor instances get the free integrations
	CdnHits int64 `json:"cdnHits"`
}

type NameCount struct {
	Name  string `json:"name"`
	Count int64  `json:"count"`
}

type InstanceStats struct {
	Total int64 `json:"total"`
	// seen in the last 7 days
	Active int64 `json:"active"`
	// sent the list of their installed integrations in the last 7 days
	Reporting int64        `json:"reporting"`
	Versions  []*NameCount `json:"versions"`
	Editions  []*NameCount `json:"editions"`
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
	Instances    *InstanceStats     `json:"instances"`
	Cdn          *CdnStats          `json:"cdn"`
}

const activeDays = 7

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

// GetEventStats sums up the events of the last days, leaving out crawlers and scripts
func GetEventStats(days int) (*EventStats, error) {
	now := time.Now()
	since := now.In(eventZone).AddDate(0, 0, -days+1).Format("2006-01-02") + " 00:00:00"
	activeSince := eventTime(now.AddDate(0, 0, -activeDays))
	stats := &EventStats{Days: days, Since: since}

	rows, err := engine.QueryString(`select source, action, result, count(*) as count, count(distinct nullif(visitor_id, '')) as visitors,
		count(distinct nullif(instance_id, '')) as instances from event where created_time >= ? and is_bot = 0
		group by source, action, result order by count desc`, since)
	if err != nil {
		return nil, err
	}
	for _, row := range rows {
		stats.Actions = append(stats.Actions, &ActionCount{
			Source: row["source"], Action: row["action"], Result: row["result"],
			Count: parseInt64(row["count"]), Visitors: parseInt64(row["visitors"]), Instances: parseInt64(row["instances"]),
		})
	}

	rows, err = engine.QueryString(`select left(created_time, 10) as day, source, action, count(*) as count from event
		where created_time >= ? and is_bot = 0 and result = '' group by day, source, action order by day`, since)
	if err != nil {
		return nil, err
	}
	for _, row := range rows {
		stats.Daily = append(stats.Daily, &DailyCount{Day: row["day"], Source: row["source"], Action: row["action"], Count: parseInt64(row["count"])})
	}

	stats.Integrations, err = getIntegrationStats(since, activeSince, days)
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

	stats.Instances, err = getInstanceStats(activeSince)
	if err != nil {
		return nil, err
	}
	stats.Cdn = GetCdnStats(days)
	for _, stat := range stats.Integrations {
		stat.CdnHits = stats.Cdn.BundleHits[stat.IntegrationId]
	}
	return stats, nil
}

func getIntegrationStats(since string, activeSince string, days int) ([]*IntegrationStat, error) {
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

	rows, err := engine.QueryString(`select integration_id, source, action, result, count(*) as count,
		count(distinct nullif(visitor_id, '')) as visitors, count(distinct nullif(instance_id, '')) as instances from event
		where created_time >= ? and is_bot = 0 and integration_id <> '' group by integration_id, source, action, result`, since)
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
		case "instance/view":
			stat.InstanceViews += count
		case "instance/install":
			if row["result"] == "" {
				stat.Installs += count
				stat.InstallInstances += parseInt64(row["instances"])
			} else {
				stat.InstallErrors += count
			}
		case "instance/uninstall":
			if row["result"] == "" {
				stat.Uninstalls += count
			}
		case "data/download", "instance/download":
			if row["result"] == "" {
				stat.Downloads += count
			}
		}
	}

	rows, err = engine.QueryString(`select ii.integration_id, count(*) as instances, sum(ii.count) as installs from instance_install ii
		join instance i on i.id = ii.instance_id where i.last_seen >= ? group by ii.integration_id`, activeSince)
	if err != nil {
		return nil, err
	}
	for _, row := range rows {
		stat := get(row["integration_id"])
		stat.ActiveInstances = parseInt64(row["instances"])
		stat.ActiveInstalls = parseInt64(row["installs"])
	}

	res := []*IntegrationStat{}
	for _, stat := range byId {
		res = append(res, stat)
	}
	sort.Slice(res, func(i, j int) bool {
		a, b := res[i], res[j]
		if a.ActiveInstances != b.ActiveInstances {
			return a.ActiveInstances > b.ActiveInstances
		}
		if a.Installs != b.Installs {
			return a.Installs > b.Installs
		}
		if a.PageViews != b.PageViews {
			return a.PageViews > b.PageViews
		}
		return a.IntegrationId < b.IntegrationId
	})
	return res, nil
}

func getInstanceStats(activeSince string) (*InstanceStats, error) {
	stats := &InstanceStats{}
	var err error
	stats.Total, err = engine.Count(&Instance{})
	if err != nil {
		return nil, err
	}
	stats.Active, err = engine.Where("last_seen >= ?", activeSince).Count(&Instance{})
	if err != nil {
		return nil, err
	}
	stats.Reporting, err = engine.Where("last_report >= ?", activeSince).Count(&Instance{})
	if err != nil {
		return nil, err
	}
	stats.Versions, err = queryNameCounts(`select casdoor_version as name, count(*) as count from instance where last_seen >= ?
		group by casdoor_version order by count desc limit 20`, activeSince)
	if err != nil {
		return nil, err
	}
	stats.Editions, err = queryNameCounts(`select edition as name, count(*) as count from instance where last_seen >= ?
		group by edition order by count desc`, activeSince)
	if err != nil {
		return nil, err
	}
	return stats, nil
}

type EventFilter struct {
	Source        string
	Action        string
	IntegrationId string
	InstanceId    string
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
		if filter.InstanceId != "" {
			s = s.And("instance_id = ?", filter.InstanceId)
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

// GetInstances lists the instances, the most recently seen first, with what they have installed
func GetInstances() ([]*InstanceWithInstalls, error) {
	instances := []*Instance{}
	err := engine.Desc("last_seen").Limit(500).Find(&instances)
	if err != nil {
		return nil, err
	}
	installs := []*InstanceInstall{}
	err = engine.Find(&installs)
	if err != nil {
		return nil, err
	}
	byInstance := map[string][]string{}
	for _, install := range installs {
		name := install.IntegrationId
		if install.Count > 1 {
			name += " ×" + strconv.Itoa(install.Count)
		}
		byInstance[install.InstanceId] = append(byInstance[install.InstanceId], name)
	}
	res := []*InstanceWithInstalls{}
	for _, instance := range instances {
		names := byInstance[instance.Id]
		sort.Strings(names)
		res = append(res, &InstanceWithInstalls{Instance: instance, Installs: strings.Join(names, ", ")})
	}
	return res, nil
}

type InstanceWithInstalls struct {
	*Instance
	Installs string `json:"installs"`
}
