package routers

import (
	"os"
	"os/exec"
	"path/filepath"
	"strconv"
	"time"

	"github.com/beego/beego/logs"
	"github.com/casdoor/casdoor-marketplace/util"
)

// The Next.js server of `npm run build` (output: "standalone", see web/scripts/prepare-standalone.mjs).
const frontendDir = "web/build/standalone"

// StartFrontend runs the Next.js server on port and restarts it when it exits; the pages are proxied to it.
// Without a build (frontend work with `npm run dev`) it does nothing.
func StartFrontend(port int, backendPort int) {
	if !isFile(filepath.Join(frontendDir, "server.js")) {
		logs.Warn("%s/server.js does not exist, run `npm run build` in web/ (or `npm run dev` for frontend work)", frontendDir)
		return
	}

	err := util.StopOldInstance(port)
	if err != nil {
		logs.Warn("StopOldInstance(%d): %v", port, err)
	}

	go func() {
		for {
			cmd := exec.Command("node", "server.js")
			cmd.Dir = frontendDir
			cmd.Env = append(os.Environ(),
				"PORT="+strconv.Itoa(port),
				"HOSTNAME=127.0.0.1",
				"MARKETPLACE_BACKEND_URL=http://127.0.0.1:"+strconv.Itoa(backendPort),
			)
			cmd.Stdout = os.Stdout
			cmd.Stderr = os.Stderr
			err := cmd.Run()
			logs.Error("the Next.js server exited: %v, restarting in 3 seconds", err)
			time.Sleep(3 * time.Second)
		}
	}()
}
