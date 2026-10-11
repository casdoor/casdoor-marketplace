package object

import (
	"fmt"
	"time"

	"github.com/beego/beego/logs"
	"github.com/casdoor/casdoor-marketplace/conf"
	_ "github.com/go-sql-driver/mysql"
	"github.com/xorm-io/xorm"
)

var engine *xorm.Engine

// InitAdapter connects to the MySQL database in conf/app.conf and creates the tables. Without dataSourceName the site
// runs without a database: the pages are served, but there is no admin console and no settings.
func InitAdapter() {
	dataSourceName := conf.GetConfigDataSourceName()
	if dataSourceName == "" {
		logs.Warn("dataSourceName is empty, running without a database")
		return
	}
	dbName := conf.GetConfigString("dbName")

	// the database may already exist and the account may not be allowed to create one, so a failure here is not fatal
	err := createDatabase(dataSourceName, dbName)
	if err != nil {
		logs.Warn("createDatabase(): %v", err)
	}

	engine, err = xorm.NewEngine("mysql", dataSourceName+dbName)
	if err != nil {
		panic(err)
	}
	engine.SetConnMaxLifetime(5 * time.Minute)

	err = engine.Sync2(new(Setting), new(Integration), new(IntegrationVersion), new(IntegrationFile))
	if err != nil {
		panic(err)
	}
}

func createDatabase(dataSourceName string, dbName string) error {
	e, err := xorm.NewEngine("mysql", dataSourceName)
	if err != nil {
		return err
	}
	defer e.Close()

	_, err = e.Exec(fmt.Sprintf("CREATE DATABASE IF NOT EXISTS `%s` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci", dbName))
	return err
}

func HasDatabase() bool {
	return engine != nil
}

func GetEngine() *xorm.Engine {
	return engine
}
