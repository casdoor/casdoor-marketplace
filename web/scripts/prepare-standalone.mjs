// Runs after `next build` (output: "standalone"): the server in build/standalone serves public/ and the static
// assets only once they are copied next to it. Then it writes build/index.html, which CasWAF looks for to tell whether
// the site has been built; without it CasWAF would build again on every round.
import fs from "node:fs";
import path from "node:path";

const webDir = path.resolve(import.meta.dirname, "..");
const buildDir = path.join(webDir, "build");
const standaloneDir = path.join(buildDir, "standalone");

if (!fs.existsSync(path.join(standaloneDir, "server.js"))) {
  throw new Error(`${standaloneDir}/server.js does not exist`);
}

fs.cpSync(path.join(webDir, "public"), path.join(standaloneDir, "public"), {
  recursive: true,
  // the catalog of `npm run dev` (fetch-integrations.mjs); the backend serves /data
  filter: (p) => !p.startsWith(path.join(webDir, "public", "data")),
});
fs.cpSync(path.join(buildDir, "static"), path.join(standaloneDir, "build", "static"), { recursive: true });

fs.writeFileSync(path.join(buildDir, "index.html"), "<!-- built; the pages are served by build/standalone/server.js -->\n");
console.log("prepared build/standalone");
