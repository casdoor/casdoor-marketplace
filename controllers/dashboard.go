package controllers

import (
	"strconv"

	"github.com/casdoor/casdoor-marketplace/object"
)

func (c *ApiController) GetDashboard() {
	if _, ok := c.RequireAdmin(); !ok {
		return
	}
	if !object.HasDatabase() {
		c.ResponseError("The site has no database")
		return
	}

	days, err := strconv.Atoi(c.GetString("days"))
	if err != nil || days <= 0 || days > 366 {
		days = 7
	}
	dashboard, err := object.GetDashboard(days)
	if err != nil {
		c.ResponseError(err.Error())
		return
	}
	c.ResponseOk(dashboard)
}
