package object

import (
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"strings"
)

// The files of a paid integration carry the license they were downloaded with: bundle.json gets a "license" field,
// and a module gets a WebAssembly custom section, so a copy that leaks tells whose it was. The checksums of the
// index and of action.json follow the written files.

const watermarkSectionName = "casdoor.license"

func appendUleb128(b []byte, v uint32) []byte {
	for {
		c := byte(v & 0x7f)
		v >>= 7
		if v != 0 {
			c |= 0x80
		}
		b = append(b, c)
		if v == 0 {
			return b
		}
	}
}

func getWatermarkPayload(license *License) []byte {
	payload, _ := json.Marshal(map[string]string{"id": license.Id, "licensee": license.Licensee, "edition": license.Edition})
	return payload
}

// watermarkWasm appends a custom section, which runtimes ignore
func watermarkWasm(module []byte, license *License) []byte {
	payload := getWatermarkPayload(license)
	content := appendUleb128(nil, uint32(len(watermarkSectionName)))
	content = append(content, watermarkSectionName...)
	content = append(content, payload...)

	res := make([]byte, 0, len(module)+len(content)+6)
	res = append(res, module...)
	res = append(res, 0)
	res = appendUleb128(res, uint32(len(content)))
	return append(res, content...)
}

func sha256Hex(data []byte) string {
	hash := sha256.Sum256(data)
	return hex.EncodeToString(hash[:])
}

// watermarkBundle writes the license into bundle.json and the checksum of the written module into its action.json
func watermarkBundle(id string, version string, bundle []byte, license *License) ([]byte, error) {
	var doc map[string]json.RawMessage
	err := json.Unmarshal(bundle, &doc)
	if err != nil {
		return nil, err
	}

	var files map[string]json.RawMessage
	if raw, ok := doc["files"]; ok {
		err = json.Unmarshal(raw, &files)
		if err != nil {
			return nil, err
		}
	}
	if raw, ok := files["action.json"]; ok {
		var action map[string]interface{}
		err = json.Unmarshal(raw, &action)
		if err != nil {
			return nil, err
		}
		if module, ok := action["module"].(string); ok && module != "" && !strings.ContainsAny(module, "/\\") {
			file, err := GetIntegrationFile(id, version, module)
			if err != nil {
				return nil, err
			}
			if file != nil {
				action["sha256"] = sha256Hex(watermarkWasm(file.Content, license))
				files["action.json"], err = json.Marshal(action)
				if err != nil {
					return nil, err
				}
				doc["files"], err = json.Marshal(files)
				if err != nil {
					return nil, err
				}
			}
		}
	}

	doc["license"], err = json.Marshal(map[string]string{"id": license.Id, "licensee": license.Licensee})
	if err != nil {
		return nil, err
	}
	return json.Marshal(doc)
}

// WatermarkFile returns the content of a file of a paid integration as written for the license
func WatermarkFile(id string, version string, path string, content []byte, license *License) ([]byte, error) {
	switch {
	case path == "bundle.json":
		return watermarkBundle(id, version, content, license)
	case strings.HasSuffix(path, ".wasm"):
		return watermarkWasm(content, license), nil
	default:
		return content, nil
	}
}
