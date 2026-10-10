package main

import (
	"github.com/beego/beego"
	"github.com/casdoor/casdoor-marketplace/routers"
)

func main() {
	beego.InsertFilter("*", beego.BeforeStatic, routers.StaticFilter)
	beego.Run()
}
