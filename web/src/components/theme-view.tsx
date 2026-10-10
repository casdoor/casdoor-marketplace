import { ShieldAlert } from "lucide-react";
import { InlineText } from "@/components/inline-text";
import { ThemeImport } from "@/components/theme-import";
import { getAssetSrc } from "@/lib/integrations";
import type { Integration, Manifest, ThemeTemplate } from "@/lib/types";

const positions = { 1: "Left", 2: "Center", 3: "Right", 4: "Center, with the side panel" } as const;

export async function ThemeView({
  integration,
  manifest,
  theme,
}: {
  integration: Integration;
  manifest: Manifest;
  theme: ThemeTemplate;
}) {
  const screenshots = await Promise.all((integration.screenshots ?? []).map(getAssetSrc));
  const settings = [
    { label: "Theme", value: theme.themeData.themeType },
    { label: "Border radius", value: `${theme.themeData.borderRadius}px` },
    { label: "Form position", value: positions[theme.formOffset] },
    { label: "Custom CSS", value: theme.formCss ? "Yes" : "No" },
    { label: "Custom CSS Mobile", value: theme.formCssMobile ? "Yes" : "No" },
    ...(theme.formSideHtml ? [{ label: "Side panel HTML", value: "Yes" }] : []),
    ...(theme.footerHtml ? [{ label: "Footer HTML", value: "Yes" }] : []),
  ];

  return (
    <section className="flex flex-col gap-8">
      {screenshots.map((src, i) => (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          key={src}
          src={src}
          alt={`${integration.name.en} sign-in page${screenshots.length > 1 ? ` ${i + 1}` : ""}`}
          className="w-full rounded-lg border shadow-sm"
        />
      ))}

      {integration.requiresGlobalAdmin && (
        <div className="flex gap-3 rounded-lg border border-amber-500/40 bg-amber-500/10 p-4 text-sm leading-6">
          <ShieldAlert className="mt-0.5 size-5 shrink-0 text-amber-600" />
          <p>
            <InlineText text="This theme sets custom HTML, which only a global admin (an admin of the `built-in` organization) can save. When anyone else saves it, Casdoor keeps the application's old HTML." />
          </p>
        </div>
      )}

      <div className="flex flex-col gap-3">
        <h2 className="text-2xl font-semibold tracking-tight">What it sets</h2>
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full text-left text-sm">
            <tbody>
              {settings.map((s) => (
                <tr key={s.label} className="border-b last:border-0">
                  <th scope="row" className="w-1/3 px-4 py-2 font-medium">
                    {s.label}
                  </th>
                  <td className="px-4 py-2 text-muted-foreground">{s.value}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-sm text-muted-foreground">
          Everything is on the application&apos;s <strong>UI Customization</strong> tab in Casdoor, so you can keep
          adjusting it after applying the theme.
        </p>
      </div>

      <div className="flex flex-col gap-3">
        <h2 className="text-2xl font-semibold tracking-tight">Apply it to an application</h2>
        <ol className="list-decimal space-y-2 pl-5 leading-7 text-muted-foreground">
          <li>Enter the application below, adjust the theme&apos;s settings, and copy the JSON.</li>
          <li>
            <InlineText text="In the Casdoor console, open **Applications**, edit that application, click **Import JSON** at the top, paste the JSON and click **OK**." />
          </li>
          <li>
            <InlineText text="Click **Save**. The sign-in page uses the theme from the next visit." />
          </li>
        </ol>
        <ThemeImport theme={theme} variables={manifest.variables ?? []} />
      </div>
    </section>
  );
}
