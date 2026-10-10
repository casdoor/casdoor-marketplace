import fs from "node:fs/promises";
import path from "node:path";
import type { Bundle, Integration, IntegrationIndex } from "@/lib/types";

// scripts/fetch-integrations.mjs copies the build of casdoor/casdoor-integrations here before `next dev` and
// `next build`; the pages read it at build time and the static site serves it under /data.
const dataDir = path.join(process.cwd(), "public", "data");

async function readJson<T>(relativePath: string): Promise<T> {
  return JSON.parse(await fs.readFile(path.join(dataDir, relativePath), "utf8"));
}

export async function getIndex(): Promise<IntegrationIndex> {
  return readJson("index.json");
}

export async function getIntegrations(): Promise<Integration[]> {
  const index = await getIndex();
  const revoked = new Set(index.revoked.map((r) => `${r.id}@${r.version}`));
  return index.integrations.filter((i) => !revoked.has(`${i.id}@${i.latest}`));
}

export async function getIntegration(id: string): Promise<Integration | undefined> {
  const integrations = await getIntegrations();
  return integrations.find((i) => i.id === id);
}

export async function getBundle(integration: Integration): Promise<Bundle> {
  const version = integration.versions.find((v) => v.version === integration.latest);
  if (!version) {
    throw new Error(`${integration.id}: latest version ${integration.latest} is not in versions`);
  }
  return readJson(version.url);
}

// A logo or screenshot path from index.json.
export async function getAssetSrc(relativePath: string): Promise<string> {
  return `/data/${relativePath}`;
}
