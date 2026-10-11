// Runs after `next build`: the pages of the default language (English) are exported to build/en/; move them to the
// root of build/ so they are served at / and /apps/ rather than /en/ and /en/apps/. Chinese pages stay in build/zh/.
import fs from "node:fs";
import path from "node:path";

const buildDir = path.resolve(import.meta.dirname, "..", "build");
const source = path.join(buildDir, "en");

if (!fs.existsSync(source)) {
  throw new Error(`${source} does not exist`);
}

for (const name of fs.readdirSync(source)) {
  const from = path.join(source, name);
  const to = path.join(buildDir, name);
  if (fs.existsSync(to)) {
    throw new Error(`${to} already exists`);
  }
  fs.renameSync(from, to);
}
fs.rmdirSync(source);

// the root page, which CasWAF checks to tell whether the site has been built
if (!fs.existsSync(path.join(buildDir, "index.html"))) {
  throw new Error("build/index.html is missing");
}
console.log("moved build/en to build/");
