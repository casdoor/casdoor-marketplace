import type { Locale } from "@/lib/i18n";
import { translateBundle, translateIntegration } from "@/lib/translations";
import type { Bundle, Integration, IntegrationIndex } from "@/lib/types";

// The Go backend serves the catalog from the database under /data (index.json and the files of every version); it
// starts this server with MARKETPLACE_BACKEND_URL set. Pages are rendered for every request, so new versions show up
// at once.
export const backendUrl = process.env.MARKETPLACE_BACKEND_URL ?? "http://localhost:18300";

// The pages show the paid integrations too, whose content the backend gives only with this token or a license.
const internalHeaders: Record<string, string> = process.env.MARKETPLACE_INTERNAL_TOKEN ?
  { "X-Marketplace-Internal": process.env.MARKETPLACE_INTERNAL_TOKEN } : {};

async function readJson<T>(relativePath: string): Promise<T> {
  const res = await fetch(`${backendUrl}/data/${relativePath}`, { cache: "no-store", headers: internalHeaders });
  if (!res.ok) {
    throw new Error(`${relativePath}: ${res.status} ${res.statusText}`);
  }
  return res.json();
}

// The content of a file of the catalog, such as a logo, for the share images.
export async function readAsset(relativePath: string): Promise<{ data: ArrayBuffer; contentType: string }> {
  const res = await fetch(`${backendUrl}/data/${relativePath}`, { cache: "no-store", headers: internalHeaders });
  if (!res.ok) {
    throw new Error(`${relativePath}: ${res.status} ${res.statusText}`);
  }
  return { data: await res.arrayBuffer(), contentType: res.headers.get("Content-Type") ?? "application/octet-stream" };
}

export async function getIndex(): Promise<IntegrationIndex> {
  return readJson("index.json");
}

// The languages an integration has pages in: one of the Chinese Marketplace only in Chinese.
export function languagesOf(integration: Integration): Locale[] {
  return integration.region === "cn" ? ["zh"] : ["en", "zh"];
}

// The integrations listed in `lang`, or all of them.
export async function getIntegrations(lang?: Locale): Promise<Integration[]> {
  const index = await getIndex();
  const revoked = new Set(index.revoked.map((r) => `${r.id}@${r.version}`));
  return index.integrations
    .filter((i) => !revoked.has(`${i.id}@${i.latest}`) && (!lang || languagesOf(i).includes(lang)))
    .map(translateIntegration);
}

export async function getIntegration(id: string, lang?: Locale): Promise<Integration | undefined> {
  const integrations = await getIntegrations(lang);
  return integrations.find((i) => i.id === id);
}

// The files of the latest version, with the guide in `lang`.
export async function getBundle(integration: Integration, lang: Locale = "en"): Promise<Bundle> {
  const version = integration.versions.find((v) => v.version === integration.latest);
  if (!version) {
    throw new Error(`${integration.id}: latest version ${integration.latest} is not in versions`);
  }
  return translateBundle(integration, await readJson<Bundle>(version.url), lang);
}

// A logo or screenshot path from index.json.
export async function getAssetSrc(relativePath: string): Promise<string> {
  return `/data/${relativePath}`;
}
