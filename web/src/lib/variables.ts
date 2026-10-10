import type { Manifest } from "@/lib/types";

// What the public pages show for each {{variable}}; inside Casdoor the installer substitutes the real values.
const builtInExamples: Record<string, string> = {
  casdoorUrl: "https://auth.example.com",
  clientId: "<client ID>",
  clientSecret: "<client secret>",
};

export const exampleCasdoorUrl = builtInExamples.casdoorUrl;

export function exampleValues(manifest: Manifest): Record<string, string> {
  return {
    ...builtInExamples,
    ...Object.fromEntries((manifest.variables ?? []).map((v) => [v.name, v.example])),
  };
}

export function fillVariables(text: string, values: Record<string, string>): string {
  return text.replace(/\{\{\s*([^}]*?)\s*\}\}/g, (match, name: string) => values[name] ?? match);
}
