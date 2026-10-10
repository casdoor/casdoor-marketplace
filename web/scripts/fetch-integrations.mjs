// Puts the build of casdoor/casdoor-integrations into public/data before `next dev` and `next build`, so the pages
// read it at build time and the static site serves index.json, bundles, logos and screenshots under /data.
// INTEGRATIONS_DIR points at a local dist/ (e.g. ../../casdoor-integrations/dist after `npm run build` there);
// without it the dist branch of the repository is cloned.
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const webDir = path.resolve(import.meta.dirname, "..");
const target = path.join(webDir, "public", "data");

let source = process.env.INTEGRATIONS_DIR;
if (source) {
  source = path.resolve(webDir, source);
} else {
  source = path.join(webDir, ".integrations");
  fs.rmSync(source, { recursive: true, force: true });
  execFileSync(
    "git",
    ["clone", "--quiet", "--depth", "1", "--branch", "dist", "https://github.com/casdoor/casdoor-integrations", source],
    { stdio: "inherit" }
  );
}

if (!fs.existsSync(path.join(source, "index.json"))) {
  throw new Error(`${source} has no index.json`);
}
fs.rmSync(target, { recursive: true, force: true });
fs.cpSync(source, target, { recursive: true, filter: (p) => path.basename(p) !== ".git" });
console.log(`integrations: copied ${source} to ${path.relative(webDir, target)}`);
