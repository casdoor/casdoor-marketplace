"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getMessages, type Locale } from "@/lib/i18n";
import type { ThemeTemplate, Variable } from "@/lib/types";

const htmlFields = new Set(["formSideHtml", "footerHtml"]);
const escapeHtml = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");

// Builds the JSON that the Import JSON button of Casdoor's application editor takes. Casdoor only imports it into
// the application whose name and organization it names.
export function ThemeImport({ theme, variables, lang }: { theme: ThemeTemplate; variables: Variable[]; lang: Locale }) {
  const m = getMessages(lang).theme;
  const [organization, setOrganization] = useState("");
  const [application, setApplication] = useState("");
  const [values, setValues] = useState<Record<string, string>>(() =>
    Object.fromEntries(variables.map((v) => [v.name, v.example]))
  );
  const [copied, setCopied] = useState(false);

  const valid = (v: Variable) => v.type !== "color" || /^#[0-9a-fA-F]{6}$/.test(values[v.name] ?? "");
  const fill = (text: string, html: boolean) =>
    text.replace(/\{\{\s*([^}]*?)\s*\}\}/g, (match, name: string) => {
      const value = values[name];
      if (value === undefined) {
        return match;
      }
      return html ? escapeHtml(value) : value;
    });

  const filled = Object.fromEntries(
    Object.entries(theme).map(([key, value]) => {
      if (typeof value === "string") {
        return [key, fill(value, htmlFields.has(key))];
      }
      return [key, value];
    })
  );
  filled.themeData = { ...theme.themeData, colorPrimary: fill(theme.themeData.colorPrimary, false) };
  const json = JSON.stringify(
    { name: application || m.applicationValue, organization: organization || m.organizationValue, ...filled },
    null,
    2
  );

  const copy = async () => {
    await navigator.clipboard.writeText(json);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium">{m.organization}</span>
          <Input value={organization} onChange={(e) => setOrganization(e.target.value)} placeholder={m.organizationPlaceholder} />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium">{m.application}</span>
          <Input value={application} onChange={(e) => setApplication(e.target.value)} placeholder={m.applicationPlaceholder} />
        </label>
        {variables.map((v) => (
          <label key={v.name} className="flex flex-col gap-1 text-sm">
            <span className="font-medium">{v.label.en}</span>
            <div className="flex items-center gap-2">
              {v.type === "color" && (
                <input
                  type="color"
                  aria-label={v.label.en}
                  value={valid(v) ? values[v.name] : "#000000"}
                  onChange={(e) => setValues({ ...values, [v.name]: e.target.value })}
                  className="h-9 w-10 shrink-0 cursor-pointer rounded-md border bg-transparent p-1"
                />
              )}
              <Input
                value={values[v.name] ?? ""}
                onChange={(e) => setValues({ ...values, [v.name]: e.target.value })}
                aria-invalid={!valid(v)}
              />
            </div>
            {v.description && <span className="text-xs text-muted-foreground">{v.description.en}</span>}
          </label>
        ))}
      </div>
      <div className="relative">
        <pre className="max-h-80 overflow-auto rounded-lg bg-neutral-950 p-4 text-[13px] leading-6 text-neutral-100">
          <code data-lang="json">{json}</code>
        </pre>
        <Button size="sm" variant="secondary" className="absolute top-2 right-2" onClick={copy} disabled={!variables.every(valid)}>
          {copied ? <Check /> : <Copy />}
          {copied ? m.copied : m.copy}
        </Button>
      </div>
    </div>
  );
}
