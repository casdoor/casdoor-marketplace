package main

import (
	"time"

	"github.com/beego/beego"
	"github.com/casdoor/casdoor-marketplace/object"
	"github.com/casdoor/casdoor-marketplace/routers"
	"github.com/casdoor/casdoor-marketplace/util"
)

func main() {
	object.InitAdapter()

	beego.BConfig.WebConfig.Session.SessionOn = true
	beego.BConfig.WebConfig.Session.SessionProvider = "file"
	beego.BConfig.WebConfig.Session.SessionProviderConfig = "./tmp"
	beego.BConfig.WebConfig.Session.SessionGCMaxLifetime = 3600 * 24 * 7
	beego.BConfig.WebConfig.Session.SessionCookieLifeTime = 3600 * 24 * 7

	beego.InsertFilter("*", beego.BeforeStatic, routers.StaticFilter)

	err := util.StopOldInstance(beego.BConfig.Listen.HTTPPort)
	if err != nil {
		panic(err)
	}
	// give the system a moment to release the port
	time.Sleep(500 * time.Millisecond)

	beego.Run()
}
