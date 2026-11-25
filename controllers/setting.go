package controllers

import (
	"encoding/json"
	"strings"

	"github.com/casdoor/casdoor-marketplace/object"
)

func (c *ApiController) GetSettings() {
	_, ok := c.RequireAdmin()
	if !ok {
		return
	}

	settings, err := object.GetSiteSettings()
	if err != nil {
		c.ResponseError(err.Error())
		return
	}
	c.ResponseOk(settings)
}

func (c *ApiController) UpdateSettings() {
	_, ok := c.RequireAdmin()
	if !ok {
		return
	}

	var settings object.SiteSettings
	err := json.Unmarshal(c.Ctx.Input.RequestBody, &settings)
	if err != nil {
		c.ResponseError(err.Error())
		return
	}
	settings.GoogleAnalyticsId = strings.TrimSpace(settings.GoogleAnalyticsId)
	settings.BaiduTongjiId = strings.TrimSpace(settings.BaiduTongjiId)
	settings.AlertWebhookUrl = strings.TrimSpace(settings.AlertWebhookUrl)
	settings.CasdeskWidgets = strings.TrimSpace(strings.ReplaceAll(settings.CasdeskWidgets, "\r\n", "\n"))

	err = object.UpdateSiteSettings(&settings)
	if err != nil {
		c.ResponseError(err.Error())
		return
	}
	c.ResponseOk(&settings)
}
