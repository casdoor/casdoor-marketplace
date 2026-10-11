package controllers

import "github.com/casdoor/casdoor-marketplace/object"

// GetMyIntegrations lists the integrations of the signed-in user with all their versions.
func (c *ApiController) GetMyIntegrations() {
	user, ok := c.RequireUser()
	if !ok {
		return
	}
	if !object.HasDatabase() {
		c.ResponseError("The site has no database")
		return
	}

	integrations, err := object.GetOwnerIntegrations(user.Owner + "/" + user.Name)
	if err != nil {
		c.ResponseError(err.Error())
		return
	}
	c.ResponseOk(integrations)
}
