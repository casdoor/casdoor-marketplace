package routers

import (
	"github.com/beego/beego"
	"github.com/beego/beego/context"
)

func init() {
	beego.Get("/api/health", func(ctx *context.Context) {
		_ = ctx.Output.JSON(map[string]string{"status": "ok"}, false, false)
	})
}
