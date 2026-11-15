package controllers

import (
	"encoding/json"
	"strconv"
	"sync"
	"time"

	"github.com/casdoor/casdoor-marketplace/object"
)

// EventRequest is what the pages report
type EventRequest struct {
	Action        string `json:"action"`
	IntegrationId string `json:"integrationId"`
	Target        string `json:"target"`
	Query         string `json:"query"`
	Count         int    `json:"count"`
	Path          string `json:"path"`
}

// a few hundred events a minute from one address is far more than a person makes
const eventsPerMinute = 300

var (
	rateMutex  sync.Mutex
	rateCounts = map[string]int{}
	rateMinute int64
)

func allowEvent(clientIp string) bool {
	rateMutex.Lock()
	defer rateMutex.Unlock()
	minute := time.Now().Unix() / 60
	if minute != rateMinute {
		rateMinute = minute
		rateCounts = map[string]int{}
	}
	rateCounts[clientIp]++
	return rateCounts[clientIp] <= eventsPerMinute
}

// AddEvent records what a visitor did on the pages. It answers ok even when the event is not recorded, so the page
// never retries or shows an error.
func (c *ApiController) AddEvent() {
	clientIp := c.Ctx.Input.IP()
	if !object.HasDatabase() || !allowEvent(clientIp) {
		c.ResponseOk(nil)
		return
	}

	var req EventRequest
	err := json.Unmarshal(c.Ctx.Input.RequestBody, &req)
	if err != nil || !object.IsReportableAction(req.Action) {
		c.ResponseError("Invalid event")
		return
	}
	if req.IntegrationId != "" && !object.IsValidIntegrationId(req.IntegrationId) {
		c.ResponseError("Invalid integration ID")
		return
	}

	event := &object.Event{
		Source:        object.EventSourceSite,
		Action:        req.Action,
		IntegrationId: req.IntegrationId,
		Target:        req.Target,
		Query:         req.Query,
		Count:         req.Count,
		Path:          req.Path,
		Lang:          object.GetLangFromPath(req.Path),
		ClientIp:      clientIp,
		UserAgent:     c.Ctx.Input.UserAgent(),
		Host:          c.Ctx.Input.Host(),
	}
	if event.IntegrationId == "" {
		event.IntegrationId = object.GetIntegrationIdFromPath(req.Path)
	}
	if user := c.GetSessionUser(); user != nil {
		event.User = user.Owner + "/" + user.Name
	}

	object.AddEvent(event)
	c.ResponseOk(nil)
}

func (c *ApiController) GetEventStats() {
	if _, ok := c.RequireAdmin(); !ok {
		return
	}
	if !object.HasDatabase() {
		c.ResponseError("The site has no database")
		return
	}

	days, err := strconv.Atoi(c.GetString("days"))
	if err != nil || days <= 0 || days > 366 {
		days = 30
	}
	stats, err := object.GetEventStats(days)
	if err != nil {
		c.ResponseError(err.Error())
		return
	}
	c.ResponseOk(stats)
}

type EventPage struct {
	Events []*object.Event `json:"events"`
	Total  int64           `json:"total"`
}

func (c *ApiController) GetEvents() {
	if _, ok := c.RequireAdmin(); !ok {
		return
	}
	if !object.HasDatabase() {
		c.ResponseError("The site has no database")
		return
	}

	page, _ := strconv.Atoi(c.GetString("p"))
	pageSize, _ := strconv.Atoi(c.GetString("pageSize"))
	if page <= 0 {
		page = 1
	}
	if pageSize <= 0 || pageSize > 500 {
		pageSize = 100
	}
	events, total, err := object.GetEvents(&object.EventFilter{
		Source:        c.GetString("source"),
		Action:        c.GetString("action"),
		IntegrationId: c.GetString("integrationId"),
		ClientIp:      c.GetString("clientIp"),
		VisitorId:     c.GetString("visitorId"),
		IncludeBots:   c.GetString("includeBots") == "1",
		Page:          page,
		PageSize:      pageSize,
	})
	if err != nil {
		c.ResponseError(err.Error())
		return
	}
	c.ResponseOk(&EventPage{Events: events, Total: total})
}

func (c *ApiController) GetCatalogClients() {
	if _, ok := c.RequireAdmin(); !ok {
		return
	}
	if !object.HasDatabase() {
		c.ResponseError("The site has no database")
		return
	}

	days, err := strconv.Atoi(c.GetString("days"))
	if err != nil || days <= 0 || days > 366 {
		days = 30
	}
	clients, err := object.GetCatalogClients(days)
	if err != nil {
		c.ResponseError(err.Error())
		return
	}
	c.ResponseOk(clients)
}
