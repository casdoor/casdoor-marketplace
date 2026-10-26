package routers

import (
	"os"
	"os/exec"
	"path/filepath"
	"strconv"
	"strings"
	"time"

	"github.com/beego/beego/logs"
	"github.com/casdoor/casdoor-marketplace/util"
)

// `npm run build` puts the Next.js server (output: "standalone") into a new directory under web/build on every build and
// names it in web/build/server.txt (see web/scripts/prepare-standalone.mjs).
const frontendBuildDir = "web/build"

func getFrontendDir() string {
	name, err := os.ReadFile(filepath.Join(frontendBuildDir, "server.txt"))
	if err != nil {
		return ""
	}
	return filepath.Join(frontendBuildDir, strings.TrimSpace(string(name)))
}

// removeOldFrontends deletes the servers of earlier builds; the old server has just been stopped, so its directory
// may stay locked for a moment.
func removeOldFrontends(current string) {
	dirs, _ := filepath.Glob(filepath.Join(frontendBuildDir, "server-*"))
	dirs = append(dirs, filepath.Join(frontendBuildDir, "standalone"))
	for _, dir := range dirs {
		if dir == current || !isDir(dir) {
			continue
		}
		var err error
		for i := 0; i < 10; i++ {
			err = os.RemoveAll(dir)
			if err == nil {
				break
			}
			time.Sleep(time.Second)
		}
		if err != nil {
			logs.Warn("removeOldFrontends(): %v", err)
		}
	}
}

// StartFrontend runs the Next.js server on port and restarts it when it exits; the pages are proxied to it.
// Without a build (frontend work with `npm run dev`) it does nothing.
func StartFrontend(port int, backendPort int) {
	frontendDir := getFrontendDir()
	if frontendDir == "" || !isFile(filepath.Join(frontendDir, "server.js")) {
		logs.Warn("%s/server.txt does not name a built server, run `npm run build` in web/ (or `npm run dev` for frontend work)", frontendBuildDir)
		return
	}

	loadFrontendCdnUrl(frontendDir)
	err := util.StopOldInstance(port)
	if err != nil {
		logs.Warn("StopOldInstance(%d): %v", port, err)
	}
	go removeOldFrontends(frontendDir)

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
