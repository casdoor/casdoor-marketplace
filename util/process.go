package util

import (
	"fmt"
	"os"
	"os/exec"
	"runtime"
	"strconv"
	"strings"
)

func getPidByPort(port int) (int, error) {
	var cmd *exec.Cmd
	switch runtime.GOOS {
	case "windows":
		cmd = exec.Command("cmd", "/c", "netstat -ano | findstr :"+strconv.Itoa(port))
	case "darwin", "linux":
		cmd = exec.Command("lsof", "-t", "-i", ":"+strconv.Itoa(port), "-s", "TCP:LISTEN")
	default:
		return 0, fmt.Errorf("unsupported OS: %s", runtime.GOOS)
	}

	output, err := cmd.Output()
	if err != nil {
		return 0, nil
	}

	for _, line := range strings.Split(string(output), "\n") {
		fields := strings.Fields(line)
		if len(fields) == 0 {
			continue
		}
		if runtime.GOOS != "windows" {
			return strconv.Atoi(fields[0])
		}
		if len(fields) >= 5 && fields[3] == "LISTENING" && strings.HasSuffix(fields[1], ":"+strconv.Itoa(port)) {
			return strconv.Atoi(fields[len(fields)-1])
		}
	}
	return 0, nil
}

// StopOldInstance stops the process listening on the port. CasWAF starts a new instance of a site whose name begins
// with "casdoor" without stopping the old one, and expects the new one to do this.
func StopOldInstance(port int) error {
	pid, err := getPidByPort(port)
	if err != nil || pid == 0 || pid == os.Getpid() {
		return err
	}

	process, err := os.FindProcess(pid)
	if err != nil {
		return err
	}
	err = process.Kill()
	if err != nil {
		return err
	}
	fmt.Printf("The old instance with pid: %d has been stopped\n", pid)
	return nil
}
