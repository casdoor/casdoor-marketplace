package object

import (
	"bytes"
	"encoding/json"
	"fmt"
	"net/http"
	"sync"
	"time"

	"github.com/beego/beego/logs"
)

// the failed installs already alerted today, by license, integration and stage, so that retries alert once a day
var installAlerts sync.Map

var alertClient = &http.Client{Timeout: 10 * time.Second}

// AlertInstallFailed tells the alert webhook in the settings that a licensed Casdoor, a paying customer, could not
// install an integration, so that someone looks at it before they write in
func AlertInstallFailed(id string, version string, stage string, license *License, ip string) {
	if license == nil {
		return
	}
	webhookUrl := getCachedSiteSettings().AlertWebhookUrl
	if webhookUrl == "" {
		return
	}

	key := fmt.Sprintf("%s/%s/%s", license.Id, id, stage)
	today := time.Now().Format("2006-01-02")
	if v, ok := installAlerts.Load(key); ok && v == today {
		return
	}
	installAlerts.Store(key, today)

	msg := fmt.Sprintf("Marketplace: %s %s failed to install at the %s stage for %s (%s edition, license %s, IP %s)",
		id, version, stage, license.Licensee, license.Edition, license.Id, ip)
	go func() {
		body, _ := json.Marshal(map[string]string{"msg": msg})
		resp, err := alertClient.Post(webhookUrl, "application/json", bytes.NewReader(body))
		if err != nil {
			logs.Warn("AlertInstallFailed(): %v", err)
			return
		}
		resp.Body.Close()
	}()
}
