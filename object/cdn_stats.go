package object

import (
	"encoding/json"
	"fmt"
	"net/http"
	"strings"
	"sync"
	"time"
)

// Casdoor instances get the free integrations from jsDelivr (marketplaceUrl defaults to casdoor-integrations@dist),
// so this site never sees most of their downloads; jsDelivr's public statistics count them instead.
const cdnStatsUrl = "https://data.jsdelivr.com/v1/stats/packages/gh/casdoor/casdoor-integrations@dist/files"

type CdnStats struct {
	// jsDelivr counts by week, month or quarter, the closest to the days asked for
	Period string `json:"period"`
	// bundle.json downloads by integration, and of index.json
	BundleHits map[string]int64 `json:"bundleHits"`
	IndexHits  int64            `json:"indexHits"`
	Error      string           `json:"error"`
}

var (
	cdnStatsMutex sync.Mutex
	cdnStatsCache = map[string]*CdnStats{}
	cdnStatsTime  = map[string]time.Time{}
)

func getCdnPeriod(days int) string {
	if days <= 7 {
		return "week"
	}
	if days <= 31 {
		return "month"
	}
	return "quarter"
}

func GetCdnStats(days int) *CdnStats {
	period := getCdnPeriod(days)
	cdnStatsMutex.Lock()
	defer cdnStatsMutex.Unlock()
	if stats, ok := cdnStatsCache[period]; ok && time.Since(cdnStatsTime[period]) < time.Hour {
		return stats
	}

	stats := &CdnStats{Period: period, BundleHits: map[string]int64{}}
	err := fetchCdnStats(stats)
	if err != nil {
		stats.Error = err.Error()
		// try again in 5 minutes rather than in an hour
		cdnStatsTime[period] = time.Now().Add(-55 * time.Minute)
	} else {
		cdnStatsTime[period] = time.Now()
	}
	cdnStatsCache[period] = stats
	return stats
}

func fetchCdnStats(stats *CdnStats) error {
	client := &http.Client{Timeout: 10 * time.Second}
	for page := 1; page <= 20; page++ {
		resp, err := client.Get(fmt.Sprintf("%s?period=%s&limit=100&page=%d", cdnStatsUrl, stats.Period, page))
		if err != nil {
			return err
		}
		files := []struct {
			Name string `json:"name"`
			Hits struct {
				Total int64 `json:"total"`
			} `json:"hits"`
		}{}
		err = json.NewDecoder(resp.Body).Decode(&files)
		_ = resp.Body.Close()
		if err != nil {
			return err
		}
		if resp.StatusCode != http.StatusOK {
			return fmt.Errorf("jsDelivr answered %d", resp.StatusCode)
		}

		for _, file := range files {
			if file.Name == "/index.json" {
				stats.IndexHits += file.Hits.Total
				continue
			}
			// /integrations/<id>/<version>/bundle.json
			parts := strings.Split(strings.TrimPrefix(file.Name, "/"), "/")
			if len(parts) == 4 && parts[0] == "integrations" && parts[3] == "bundle.json" {
				stats.BundleHits[parts[1]] += file.Hits.Total
			}
		}
		if len(files) < 100 {
			return nil
		}
	}
	return nil
}
