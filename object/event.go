package object

import (
	"crypto/sha256"
	"encoding/hex"
	"net/url"
	"regexp"
	"strings"
	"sync"
	"time"

	"github.com/beego/beego/logs"
)

// Event is one thing someone did with the Marketplace: a page they opened or a link they clicked on the site, or a file
// a Casdoor instance or anyone else downloaded from /data, including the meta.json Casdoor reads to install a version
// and reads again, with only the step in the address, when the install has ended and when the version is uninstalled,
// the meta.json it reads with step=view when an admin opens an integration in its Marketplace page, and the status.json
// it reads each time an admin opens that page.
type Event struct {
	Id          int64  `xorm:"pk autoincr" json:"id"`
	CreatedTime string `xorm:"varchar(100) index" json:"createdTime"`
	// site (the pages) or data (the files under /data)
	Source          string `xorm:"varchar(20) index" json:"source"`
	Action          string `xorm:"varchar(50) index" json:"action"`
	IntegrationId   string `xorm:"varchar(100) index" json:"integrationId"`
	Version         string `xorm:"varchar(50)" json:"version"`
	IntegrationType string `xorm:"varchar(20)" json:"integrationType"`
	// what was clicked or the file downloaded
	Target   string `xorm:"varchar(200)" json:"target"`
	Query    string `xorm:"varchar(200)" json:"query"`
	Count    int    `json:"count"`
	Path     string `xorm:"varchar(500)" json:"path"`
	Referrer string `xorm:"varchar(500)" json:"referrer"`
	Lang     string `xorm:"varchar(20)" json:"lang"`
	Host     string `xorm:"varchar(100)" json:"host"`
	// the visitor's cookie on the pages; for crawlers, scripts and /data, a hash of the IP address, the browser and the day
	VisitorId string `xorm:"varchar(50) index" json:"visitorId"`
	User      string `xorm:"varchar(200)" json:"user"`
	// the license a Casdoor sent to get a paid integration
	Edition   string `xorm:"varchar(20)" json:"edition"`
	LicenseId string `xorm:"varchar(100)" json:"licenseId"`
	ClientIp  string `xorm:"varchar(100)" json:"clientIp"`
	UserAgent string `xorm:"varchar(500)" json:"userAgent"`
	IsBot     bool   `xorm:"index" json:"isBot"`
}

const (
	EventSourceSite = "site"
	EventSourceData = "data"
)

// the actions the pages report; page views and downloads are recorded by the backend itself
var reportableActions = map[string]bool{"search": true, "click": true, "copy": true, "filter": true}

func IsReportableAction(action string) bool {
	return reportableActions[action]
}

// The times are in China time on every node, so the days of the statistics are the same wherever an event was recorded
var eventZone = time.FixedZone("CST", 8*3600)

const eventTimeLayout = "2006-01-02 15:04:05"

func eventTime(t time.Time) string {
	return t.In(eventZone).Format(eventTimeLayout)
}

var integrationIdRegex = regexp.MustCompile(`^[a-z0-9][a-z0-9._-]{0,99}$`)

func IsValidIntegrationId(id string) bool {
	return integrationIdRegex.MatchString(id)
}

// the detail page of an integration, in English or under /<lang>/
var integrationPathRegex = regexp.MustCompile(`^/(?:[a-z]{2}/)?integrations/([a-z0-9][a-z0-9._-]*)/`)

func GetIntegrationIdFromPath(path string) string {
	match := integrationPathRegex.FindStringSubmatch(path)
	if match == nil {
		return ""
	}
	return match[1]
}

var langPathRegex = regexp.MustCompile(`^/([a-z]{2})(?:/|$)`)

func GetLangFromPath(path string) string {
	match := langPathRegex.FindStringSubmatch(path)
	if match == nil {
		return "en"
	}
	return match[1]
}

var botPatterns = []string{
	"bot", "spider", "crawl", "slurp", "curl", "wget", "python", "go-http-client", "java/", "httpclient", "headless",
	"lighthouse", "monitor", "uptime", "preview", "facebookexternalhit", "scrapy", "axios", "node-fetch", "okhttp",
	"libwww", "phantomjs", "feedfetcher", "dataprovider", "embedly", "validator", "check_http", "zgrab", "masscan",
	"casdog", "productfinder", "scanner", "fetcher",
}

// IsBotUserAgent tells crawlers, monitors and scripts from browsers
func IsBotUserAgent(userAgent string) bool {
	ua := strings.ToLower(userAgent)
	if ua == "" || !strings.HasPrefix(ua, "mozilla/") {
		return true
	}
	for _, pattern := range botPatterns {
		if strings.Contains(ua, pattern) {
			return true
		}
	}
	// "Mozilla/5.0 (compatible; ...)" is how crawlers and monitors name themselves; of the browsers only old IE did
	return strings.Contains(ua, "(compatible;") && !strings.Contains(ua, "msie")
}

// Many scanners and scrapers fetch the pages with the name of a browser but never run their script, so a page view
// counts as a person's only once the visitor's browser has reported from the page (ConfirmVisitor); the views before
// that are then counted too. Until then the view is kept as a bot's.
var confirmedVisitors = struct {
	sync.Mutex
	ids map[string]bool
}{ids: map[string]bool{}}

func isConfirmedVisitor(visitorId string) bool {
	confirmedVisitors.Lock()
	defer confirmedVisitors.Unlock()
	return confirmedVisitors.ids[visitorId]
}

func setConfirmedVisitors(visitorIds []string) {
	confirmedVisitors.Lock()
	defer confirmedVisitors.Unlock()
	if len(confirmedVisitors.ids) > 100000 {
		confirmedVisitors.ids = map[string]bool{}
	}
	for _, id := range visitorIds {
		confirmedVisitors.ids[id] = true
	}
}

const confirmAction = "confirm"

// ConfirmVisitor marks a visitor whose browser has run the page's script as a person. It goes through the same queue
// as the events, so the page views recorded before it are already written when it counts them.
func ConfirmVisitor(visitorId string) {
	if engine == nil || visitorId == "" {
		return
	}
	setConfirmedVisitors([]string{visitorId})
	select {
	case eventChan <- &Event{Action: confirmAction, VisitorId: visitorId}:
	default:
	}
}

func confirmVisitorViews(visitorIds []string) {
	if len(visitorIds) == 0 {
		return
	}
	// a person usually reports within seconds of the page; a day covers a page left open in the background
	since := eventTime(time.Now().Add(-24 * time.Hour))
	args := []interface{}{since}
	for _, id := range visitorIds {
		args = append(args, id)
	}
	_, err := engine.Exec(append([]interface{}{`update event set is_bot = 0 where source = 'site' and action = 'page_view'
		and is_bot = 1 and created_time >= ? and visitor_id in (?` + strings.Repeat(", ?", len(visitorIds)-1) + `)`}, args...)...)
	if err != nil {
		logs.Error("confirmVisitorViews(): %v", err)
	}
}

// markConfirmedViews counts the page views in a batch as a person's when their visitor was confirmed before, also by
// the other node, which shares the database
func markConfirmedViews(batch []*Event) {
	unknown := []string{}
	for _, event := range batch {
		if event.Action != "page_view" || !event.IsBot || !visitorIdRegex.MatchString(event.VisitorId) || IsBotUserAgent(event.UserAgent) {
			continue
		}
		if isConfirmedVisitor(event.VisitorId) {
			event.IsBot = false
		} else {
			unknown = append(unknown, event.VisitorId)
		}
	}
	if len(unknown) == 0 {
		return
	}

	args := []interface{}{}
	for _, id := range unknown {
		args = append(args, id)
	}
	rows, err := engine.QueryString(append([]interface{}{`select distinct visitor_id from event where source = 'site' and is_bot = 0
		and visitor_id in (?` + strings.Repeat(", ?", len(unknown)-1) + `)`}, args...)...)
	if err != nil {
		logs.Error("markConfirmedViews(): %v", err)
		return
	}
	confirmed := []string{}
	for _, row := range rows {
		confirmed = append(confirmed, row["visitor_id"])
	}
	setConfirmedVisitors(confirmed)
	for _, event := range batch {
		if event.Action == "page_view" && event.IsBot && isConfirmedVisitor(event.VisitorId) && !IsBotUserAgent(event.UserAgent) {
			event.IsBot = false
		}
	}
}

// the cookie of the pages; the hashes for crawlers and /data are as long, but crawlers are never confirmed
var visitorIdRegex = regexp.MustCompile(`^[0-9a-f]{16}$`)

func getVisitorId(clientIp string, userAgent string, t time.Time) string {
	sum := sha256.Sum256([]byte(clientIp + "|" + userAgent + "|" + t.In(eventZone).Format("2006-01-02")))
	return hex.EncodeToString(sum[:8])
}

// GetExternalReferrer keeps a referrer only when it is another site, without its query
func GetExternalReferrer(referrer string, host string) string {
	u, err := url.Parse(referrer)
	if err != nil || u.Host == "" || strings.EqualFold(u.Host, host) || strings.HasPrefix(u.Host, "marketplace.casdoor.") {
		return ""
	}
	return u.Scheme + "://" + u.Host + u.Path
}

func truncate(s string, n int) string {
	if len(s) <= n {
		return s
	}
	// don't cut a UTF-8 character in half
	for n > 0 && n < len(s) && s[n]&0xC0 == 0x80 {
		n--
	}
	return s[:n]
}

func (event *Event) normalize() {
	now := time.Now()
	if event.CreatedTime == "" {
		event.CreatedTime = eventTime(now)
	}
	if event.VisitorId == "" && event.ClientIp != "" {
		event.VisitorId = getVisitorId(event.ClientIp, event.UserAgent, now)
	}
	if event.Source == EventSourceSite {
		event.IsBot = IsBotUserAgent(event.UserAgent) || (event.Action == "page_view" && !isConfirmedVisitor(event.VisitorId))
	}
	event.IntegrationId = truncate(event.IntegrationId, 100)
	event.Version = truncate(event.Version, 50)
	event.IntegrationType = truncate(event.IntegrationType, 20)
	event.Target = truncate(event.Target, 200)
	event.Query = truncate(strings.TrimSpace(event.Query), 200)
	event.Path = truncate(event.Path, 500)
	event.Referrer = truncate(event.Referrer, 500)
	event.Lang = truncate(event.Lang, 20)
	event.Host = truncate(event.Host, 100)
	event.User = truncate(event.User, 200)
	event.Edition = truncate(event.Edition, 20)
	event.LicenseId = truncate(event.LicenseId, 100)
	event.ClientIp = truncate(event.ClientIp, 100)
	event.UserAgent = truncate(event.UserAgent, 500)
}

// Events are written by one goroutine in batches, so recording one never slows down a page or a download. When the
// database falls behind, the newest events are dropped instead of piling up.
var eventChan = make(chan *Event, 10000)

func init() {
	go writeEvents()
}

func AddEvent(event *Event) {
	if engine == nil {
		return
	}
	event.normalize()
	select {
	case eventChan <- event:
	default:
		logs.Warn("AddEvent(): the queue is full, dropping a %s event", event.Action)
	}
}

func writeEvents() {
	ticker := time.NewTicker(2 * time.Second)
	defer ticker.Stop()

	batch := []*Event{}
	flush := func() {
		if len(batch) == 0 || engine == nil {
			return
		}
		markConfirmedViews(batch)
		_, err := engine.Insert(&batch)
		if err != nil {
			logs.Error("writeEvents(): %v", err)
		}
		batch = []*Event{}
	}

	for {
		select {
		case event := <-eventChan:
			if event.Action == confirmAction {
				flush()
				confirmVisitorViews([]string{event.VisitorId})
				continue
			}
			batch = append(batch, event)
			if len(batch) >= 200 {
				flush()
			}
		case <-ticker.C:
			flush()
		}
	}
}
