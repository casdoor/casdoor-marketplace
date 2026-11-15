package object

import (
	"strconv"
	"strings"
	"time"

	"github.com/beego/beego/logs"
	"github.com/xorm-io/xorm"
)

// Instance is a Casdoor that reported to the Marketplace: what it installed or uninstalled, or its daily list of
// installed integrations. The ID is the instanceId of Casdoor's setting row, shared by the replicas of a cluster.
type Instance struct {
	Id             string `xorm:"varchar(100) notnull pk" json:"id"`
	FirstSeen      string `xorm:"varchar(100)" json:"firstSeen"`
	LastSeen       string `xorm:"varchar(100) index" json:"lastSeen"`
	CasdoorVersion string `xorm:"varchar(100)" json:"casdoorVersion"`
	Edition        string `xorm:"varchar(20)" json:"edition"`
	LicenseId      string `xorm:"varchar(100)" json:"licenseId"`
	ClientIp       string `xorm:"varchar(100)" json:"clientIp"`
	// the last time it sent its list of installed integrations, empty if it never did
	LastReport string `xorm:"varchar(100)" json:"lastReport"`
}

// InstanceInstall is an integration installed on an instance; Count is how many times, e.g. a theme on two applications
type InstanceInstall struct {
	InstanceId    string `xorm:"varchar(100) notnull pk" json:"instanceId"`
	IntegrationId string `xorm:"varchar(100) notnull pk index" json:"integrationId"`
	Version       string `xorm:"varchar(50)" json:"version"`
	Type          string `xorm:"varchar(20)" json:"type"`
	Count         int    `json:"count"`
	FirstSeen     string `xorm:"varchar(100)" json:"firstSeen"`
	LastSeen      string `xorm:"varchar(100)" json:"lastSeen"`
}

type InstalledIntegration struct {
	IntegrationId string `json:"integrationId"`
	Version       string `json:"version"`
	Type          string `json:"type"`
	Count         int    `json:"count"`
}

// InstallReport is what a Casdoor instance sends once a day: the integrations of the Marketplace it has installed
type InstallReport struct {
	InstanceId     string                  `json:"instanceId"`
	CasdoorVersion string                  `json:"casdoorVersion"`
	Edition        string                  `json:"edition"`
	LicenseId      string                  `json:"licenseId"`
	Integrations   []*InstalledIntegration `json:"integrations"`
}

func touchInstance(session *xorm.Session, instance *Instance) error {
	existing := &Instance{}
	existed, err := session.ID(instance.Id).Get(existing)
	if err != nil {
		return err
	}
	if !existed {
		instance.FirstSeen = instance.LastSeen
		_, err = session.Insert(instance)
		return err
	}
	cols := []string{"last_seen", "casdoor_version", "edition", "license_id", "client_ip"}
	if instance.LastReport != "" {
		cols = append(cols, "last_report")
	}
	_, err = session.ID(instance.Id).Cols(cols...).Update(instance)
	return err
}

// applyInstanceEvents keeps the installs of the instances current between their daily reports
func applyInstanceEvents(events []*Event) {
	for _, event := range events {
		if event.Source != EventSourceInstance || event.InstanceId == "" || event.Result != "" {
			continue
		}
		err := applyInstanceEvent(event)
		if err != nil {
			logs.Error("applyInstanceEvent(): %v", err)
		}
	}
}

func applyInstanceEvent(event *Event) error {
	session := engine.NewSession()
	defer session.Close()

	err := touchInstance(session, &Instance{
		Id:             event.InstanceId,
		LastSeen:       event.CreatedTime,
		CasdoorVersion: event.CasdoorVersion,
		Edition:        event.Edition,
		LicenseId:      event.LicenseId,
		ClientIp:       event.ClientIp,
	})
	// an integration a global admin installed from its bundle.json is not from the Marketplace
	if err != nil || event.IntegrationId == "" || event.Target == "file" || (event.Action != "install" && event.Action != "uninstall") {
		return err
	}

	install := &InstanceInstall{}
	existed, err := session.Where("instance_id = ? and integration_id = ?", event.InstanceId, event.IntegrationId).Get(install)
	if err != nil {
		return err
	}
	if event.Action == "install" {
		if !existed {
			_, err = session.Insert(&InstanceInstall{
				InstanceId:    event.InstanceId,
				IntegrationId: event.IntegrationId,
				Version:       event.Version,
				Type:          event.IntegrationType,
				Count:         1,
				FirstSeen:     event.CreatedTime,
				LastSeen:      event.CreatedTime,
			})
			return err
		}
		install.Count++
		install.Version, install.LastSeen = event.Version, event.CreatedTime
		_, err = session.Where("instance_id = ? and integration_id = ?", event.InstanceId, event.IntegrationId).Cols("count", "version", "last_seen").Update(install)
		return err
	}

	if !existed {
		return nil
	}
	if install.Count <= 1 {
		_, err = session.Where("instance_id = ? and integration_id = ?", event.InstanceId, event.IntegrationId).Delete(&InstanceInstall{})
		return err
	}
	install.Count--
	install.LastSeen = event.CreatedTime
	_, err = session.Where("instance_id = ? and integration_id = ?", event.InstanceId, event.IntegrationId).Cols("count", "last_seen").Update(install)
	return err
}

// ReportInstalls replaces the installs of an instance with the list it sent
func ReportInstalls(report *InstallReport, clientIp string) error {
	now := eventTime(time.Now())
	session := engine.NewSession()
	defer session.Close()
	err := session.Begin()
	if err != nil {
		return err
	}

	err = touchInstance(session, &Instance{
		Id:             report.InstanceId,
		LastSeen:       now,
		LastReport:     now,
		CasdoorVersion: truncate(report.CasdoorVersion, 100),
		Edition:        truncate(report.Edition, 20),
		LicenseId:      truncate(report.LicenseId, 100),
		ClientIp:       truncate(clientIp, 100),
	})
	if err != nil {
		_ = session.Rollback()
		return err
	}

	existing := []*InstanceInstall{}
	err = session.Where("instance_id = ?", report.InstanceId).Find(&existing)
	if err != nil {
		_ = session.Rollback()
		return err
	}
	firstSeen := map[string]string{}
	for _, install := range existing {
		firstSeen[install.IntegrationId] = install.FirstSeen
	}

	_, err = session.Where("instance_id = ?", report.InstanceId).Delete(&InstanceInstall{})
	if err != nil {
		_ = session.Rollback()
		return err
	}
	// the same integration installed at two versions comes as two items
	installs := map[string]*InstanceInstall{}
	for _, item := range report.Integrations {
		if !IsValidIntegrationId(item.IntegrationId) {
			continue
		}
		if install, ok := installs[item.IntegrationId]; ok {
			install.Count += max(item.Count, 1)
			if compareVersions(item.Version, install.Version) > 0 {
				install.Version = truncate(item.Version, 50)
			}
			continue
		}
		if len(installs) >= 1000 {
			break
		}
		install := &InstanceInstall{
			InstanceId:    report.InstanceId,
			IntegrationId: item.IntegrationId,
			Version:       truncate(item.Version, 50),
			Type:          truncate(item.Type, 20),
			Count:         max(item.Count, 1),
			FirstSeen:     firstSeen[item.IntegrationId],
			LastSeen:      now,
		}
		if install.FirstSeen == "" {
			install.FirstSeen = now
		}
		installs[item.IntegrationId] = install
	}
	for _, install := range installs {
		_, err = session.Insert(install)
		if err != nil {
			_ = session.Rollback()
			return err
		}
	}
	return session.Commit()
}

// compareVersions compares dotted version numbers such as 1.10.0 and 1.9.2
func compareVersions(a string, b string) int {
	pa, pb := strings.Split(a, "."), strings.Split(b, ".")
	for i := 0; i < len(pa) || i < len(pb); i++ {
		var na, nb int
		if i < len(pa) {
			na, _ = strconv.Atoi(pa[i])
		}
		if i < len(pb) {
			nb, _ = strconv.Atoi(pb[i])
		}
		if na != nb {
			if na < nb {
				return -1
			}
			return 1
		}
	}
	return 0
}
