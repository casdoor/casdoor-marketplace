import fs from "node:fs/promises";
import path from "node:path";
import { cacheLife, cacheTag } from "next/cache";
import type { Bundle, Integration, IntegrationIndex } from "@/lib/types";

// The build of casdoor/casdoor-integrations (its dist/ directory) is published to the CDN. INTEGRATIONS_BASE_URL is
// that directory's URL; without it, a local checkout of casdoor-integrations next to this repository is read, after
// `npm run build` there.
const baseUrl = process.env.INTEGRATIONS_BASE_URL?.replace(/\/$/, "");
// The local directory is only for development, so it is kept out of the output file tracing.
const localDir = path.resolve(/*turbopackIgnore: true*/ process.env.INTEGRATIONS_DIR ?? "../../casdoor-integrations/dist");

async function readFile(relativePath: string): Promise<Buffer> {
  if (!baseUrl) {
    return fs.readFile(/*turbopackIgnore: true*/ path.join(localDir, relativePath));
  }
  const res = await fetch(`${baseUrl}/${relativePath}`);
  if (!res.ok) {
    throw new Error(`Failed to fetch ${baseUrl}/${relativePath}: ${res.status}`);
  }
  return Buffer.from(await res.arrayBuffer());
}

export async function getIndex(): Promise<IntegrationIndex> {
  "use cache";
  cacheLife("hours");
  cacheTag("integrations");
  return JSON.parse((await readFile("index.json")).toString("utf8"));
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
  "use cache";
  cacheLife("hours");
  cacheTag("integrations");
  const version = integration.versions.find((v) => v.version === integration.latest);
  if (!version) {
    throw new Error(`${integration.id}: latest version ${integration.latest} is not in versions`);
  }
  return JSON.parse((await readFile(version.url)).toString("utf8"));
}

const mediaTypes: Record<string, string> = { svg: "image/svg+xml", png: "image/png", jpg: "image/jpeg", jpeg: "image/jpeg" };

// A logo or screenshot path from index.json. From the CDN it is linked; from a local checkout it is inlined, since
// this app doesn't serve those files.
export async function getAssetSrc(relativePath: string): Promise<string> {
  "use cache";
  cacheLife("hours");
  cacheTag("integrations");
  if (baseUrl) {
    return `${baseUrl}/${relativePath}`;
  }
  const type = mediaTypes[relativePath.split(".").pop() ?? ""] ?? "application/octet-stream";
  return `data:${type};base64,${(await readFile(relativePath)).toString("base64")}`;
}
