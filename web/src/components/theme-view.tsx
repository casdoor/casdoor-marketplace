import { ShieldAlert } from "lucide-react";
import { InlineText } from "@/components/inline-text";
import { ThemeImport } from "@/components/theme-import";
import { getMessages, type Locale } from "@/lib/i18n";
import { getAssetSrc } from "@/lib/integrations";
import type { Integration, Manifest, ThemeTemplate } from "@/lib/types";

export async function ThemeView({
  integration,
  manifest,
  theme,
  lang,
}: {
  integration: Integration;
  manifest: Manifest;
  theme: ThemeTemplate;
  lang: Locale;
}) {
  const m = getMessages(lang).theme;
  const screenshots = await Promise.all((integration.screenshots ?? []).map(getAssetSrc));
  const yesNo = (value: unknown) => (value ? m.yes : m.no);
  const settings = [
    { label: m.settings.theme, value: theme.themeData.themeType },
    { label: m.settings.borderRadius, value: `${theme.themeData.borderRadius}px` },
    { label: m.settings.formPosition, value: m.positions[theme.formOffset] },
    { label: m.settings.customCss, value: yesNo(theme.formCss) },
    { label: m.settings.customCssMobile, value: yesNo(theme.formCssMobile) },
    ...(theme.formSideHtml ? [{ label: m.settings.sidePanelHtml, value: m.yes }] : []),
    ...(theme.footerHtml ? [{ label: m.settings.footerHtml, value: m.yes }] : []),
  ];

  return (
    <section className="flex flex-col gap-8">
      {screenshots.map((src, i) => (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          key={src}
          src={src}
          alt={m.screenshotAlt(integration.name.en, screenshots.length > 1 ? i + 1 : null)}
          className="w-full rounded-lg border shadow-sm"
        />
      ))}

      {integration.requiresGlobalAdmin && (
        <div className="flex gap-3 rounded-lg border border-amber-500/40 bg-amber-500/10 p-4 text-sm leading-6">
          <ShieldAlert className="mt-0.5 size-5 shrink-0 text-amber-600" />
          <p>
            <InlineText text={m.globalAdmin} />
          </p>
        </div>
      )}

      <div className="flex flex-col gap-3">
        <h2 className="text-2xl font-semibold tracking-tight">{m.whatItSets}</h2>
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
          <InlineText text={m.adjustLater} />
        </p>
      </div>

      <div className="flex flex-col gap-3">
        <h2 className="text-2xl font-semibold tracking-tight">{m.applyTitle}</h2>
        <ol className="list-decimal space-y-2 pl-5 leading-7 text-muted-foreground">
          {m.applySteps.map((step) => (
            <li key={step}>
              <InlineText text={step} />
            </li>
          ))}
        </ol>
        <ThemeImport theme={theme} variables={manifest.variables ?? []} lang={lang} />
      </div>
    </section>
  );
}
