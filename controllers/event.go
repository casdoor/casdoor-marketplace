package controllers

import (
	"encoding/json"
	"strconv"
	"sync"
	"time"

	"github.com/casdoor/casdoor-marketplace/object"
)

// EventRequest is what the pages (source "site") and Casdoor instances (source "instance") report
type EventRequest struct {
	Source          string `json:"source"`
	Action          string `json:"action"`
	IntegrationId   string `json:"integrationId"`
	Version         string `json:"version"`
	IntegrationType string `json:"integrationType"`
	Target          string `json:"target"`
	Query           string `json:"query"`
	Count           int    `json:"count"`
	Path            string `json:"path"`
	Referrer        string `json:"referrer"`
	Lang            string `json:"lang"`
	InstanceId      string `json:"instanceId"`
	CasdoorVersion  string `json:"casdoorVersion"`
	Edition         string `json:"edition"`
	LicenseId       string `json:"licenseId"`
	Result          string `json:"result"`
	Message         string `json:"message"`
}

// a few hundred events a minute from one address is far more than a person or an instance makes
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

// AddEvent records an event the pages or a Casdoor instance report. It answers ok even when the event is not
// recorded, so the caller never retries or shows an error.
func (c *ApiController) AddEvent() {
	clientIp := c.Ctx.Input.IP()
	if !object.HasDatabase() || !allowEvent(clientIp) {
		c.ResponseOk(nil)
		return
	}

	var req EventRequest
	err := json.Unmarshal(c.Ctx.Input.RequestBody, &req)
	if err != nil || !object.IsReportableAction(req.Source, req.Action) {
		c.ResponseError("Invalid event")
		return
	}
	if req.IntegrationId != "" && !object.IsValidIntegrationId(req.IntegrationId) {
		c.ResponseError("Invalid integration ID")
		return
	}
	if req.Source == object.EventSourceInstance && req.InstanceId == "" {
		c.ResponseError("The instance ID is missing")
		return
	}

	event := &object.Event{
		Source:          req.Source,
		Action:          req.Action,
		IntegrationId:   req.IntegrationId,
		Version:         req.Version,
		IntegrationType: req.IntegrationType,
		Target:          req.Target,
		Query:           req.Query,
		Count:           req.Count,
		ClientIp:        clientIp,
		UserAgent:       c.Ctx.Input.UserAgent(),
		Host:            c.Ctx.Input.Host(),
	}
	if req.Result != "" {
		event.Result, event.Message = "error", req.Message
	}

	if req.Source == object.EventSourceSite {
		event.Path = req.Path
		event.Lang = object.GetLangFromPath(req.Path)
		if event.IntegrationId == "" {
			event.IntegrationId = object.GetIntegrationIdFromPath(req.Path)
		}
		if user := c.GetSessionUser(); user != nil {
			event.User = user.Owner + "/" + user.Name
		}
	} else {
		event.Lang = req.Lang
		event.InstanceId = req.InstanceId
		event.CasdoorVersion = req.CasdoorVersion
		event.Edition = req.Edition
		event.LicenseId = req.LicenseId
	}

	object.AddEvent(event)
	c.ResponseOk(nil)
}

// ReportInstalls takes the daily list of the integrations a Casdoor instance has installed
func (c *ApiController) ReportInstalls() {
	clientIp := c.Ctx.Input.IP()
	if !object.HasDatabase() || !allowEvent(clientIp) {
		c.ResponseOk(nil)
		return
	}

	var report object.InstallReport
	err := json.Unmarshal(c.Ctx.Input.RequestBody, &report)
	if err != nil || report.InstanceId == "" || len(report.InstanceId) > 100 {
		c.ResponseError("Invalid report")
		return
	}

	err = object.ReportInstalls(&report, clientIp)
	if err != nil {
		c.ResponseError(err.Error())
		return
	}
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
		InstanceId:    c.GetString("instanceId"),
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

func (c *ApiController) GetInstances() {
	if _, ok := c.RequireAdmin(); !ok {
		return
	}
	if !object.HasDatabase() {
		c.ResponseError("The site has no database")
		return
	}

	instances, err := object.GetInstances()
	if err != nil {
		c.ResponseError(err.Error())
		return
	}
	c.ResponseOk(instances)
}
