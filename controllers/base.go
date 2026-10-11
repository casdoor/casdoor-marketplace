package controllers

import (
	"encoding/json"

	"github.com/beego/beego"
	"github.com/casdoor/casdoor-marketplace/object"
)

// ApiController serves /api/.
type ApiController struct {
	beego.Controller
}

type Response struct {
	Status string      `json:"status"`
	Msg    string      `json:"msg"`
	Data   interface{} `json:"data"`
}

func (c *ApiController) ResponseOk(data interface{}) {
	c.Data["json"] = &Response{Status: "ok", Data: data}
	c.ServeJSON()
}

func (c *ApiController) ResponseError(msg string) {
	c.Data["json"] = &Response{Status: "error", Msg: msg}
	c.ServeJSON()
}

// The session keeps the user as JSON, which the file session store can save without registering types.
func (c *ApiController) GetSessionUser() *object.User {
	data, ok := c.GetSession("user").(string)
	if !ok || data == "" {
		return nil
	}
	user := &object.User{}
	err := json.Unmarshal([]byte(data), user)
	if err != nil {
		return nil
	}
	return user
}

func (c *ApiController) SetSessionUser(user *object.User) {
	if user == nil {
		c.DelSession("user")
		return
	}
	data, err := json.Marshal(user)
	if err != nil {
		panic(err)
	}
	c.SetSession("user", string(data))
}

// RequireUser answers with an error unless someone is signed in.
func (c *ApiController) RequireUser() (*object.User, bool) {
	user := c.GetSessionUser()
	if user == nil {
		c.ResponseError("Please sign in first")
		return nil, false
	}
	return user, true
}

// RequireAdmin answers with an error unless the admin user of the Casdoor organization is signed in.
func (c *ApiController) RequireAdmin() (*object.User, bool) {
	user := c.GetSessionUser()
	if user == nil {
		c.ResponseError("Please sign in first")
		return nil, false
	}
	if !user.IsAdmin {
		c.ResponseError("Only admins can do this")
		return nil, false
	}
	return user, true
}
