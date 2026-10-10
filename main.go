package main

import (
	"time"

	"github.com/beego/beego"
	"github.com/casdoor/casdoor-marketplace/routers"
	"github.com/casdoor/casdoor-marketplace/util"
)

func main() {
	beego.InsertFilter("*", beego.BeforeStatic, routers.StaticFilter)

	err := util.StopOldInstance(beego.BConfig.Listen.HTTPPort)
	if err != nil {
		panic(err)
	}
	// give the system a moment to release the port
	time.Sleep(500 * time.Millisecond)

	beego.Run()
}
