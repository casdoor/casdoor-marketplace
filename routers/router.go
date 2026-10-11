package routers

import (
	"github.com/beego/beego"
	"github.com/beego/beego/context"
	"github.com/casdoor/casdoor-marketplace/controllers"
)

func init() {
	beego.Get("/api/health", func(ctx *context.Context) {
		_ = ctx.Output.JSON(map[string]string{"status": "ok"}, false, false)
	})

	beego.Router("/api/signin", &controllers.ApiController{}, "GET:Signin")
	beego.Router("/api/callback", &controllers.ApiController{}, "GET:Callback")
	beego.Router("/api/signout", &controllers.ApiController{}, "POST:Signout")
	beego.Router("/api/get-account", &controllers.ApiController{}, "GET:GetAccount")
	beego.Router("/api/get-my-integrations", &controllers.ApiController{}, "GET:GetMyIntegrations")
	beego.Router("/api/get-settings", &controllers.ApiController{}, "GET:GetSettings")
	beego.Router("/api/update-settings", &controllers.ApiController{}, "POST:UpdateSettings")
}
