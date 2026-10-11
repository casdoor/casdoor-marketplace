package conf

import (
	"os"
	"strings"

	"github.com/beego/beego"
)

// GetConfigString reads an item of conf/app.conf; an environment variable of the same name takes precedence.
func GetConfigString(key string) string {
	if value, ok := os.LookupEnv(key); ok {
		return value
	}
	return beego.AppConfig.String(key)
}

// GetConfigDataSourceName returns dataSourceName ending with "/", to which the database name is appended.
func GetConfigDataSourceName() string {
	dataSourceName := GetConfigString("dataSourceName")
	if dataSourceName != "" && !strings.HasSuffix(dataSourceName, "/") {
		dataSourceName += "/"
	}
	return dataSourceName
}
