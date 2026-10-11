import { Lightbulb } from "lucide-react";
import { InlineText } from "@/components/inline-text";
import { formatMonth, getMessages, type Locale } from "@/lib/i18n";
import { exampleCasdoorUrl, fillVariables } from "@/lib/variables";
import type { ApplicationTemplate, Guide, GuideStep, ProviderTemplate } from "@/lib/types";

export type Step = GuideStep & { list?: string[]; after?: string };

// App integrations start with the same step: register the app as an application in Casdoor.
export function appSteps(name: string, application: ApplicationTemplate, guide: Guide, lang: Locale): Step[] {
  const m = getMessages(lang).guide;
  const after = guide.redirectNote ? [guide.redirectNote] : [];
  if (guide.groupExample) {
    const group = guide.groupExample.match(/`([^`]+)`/)?.[1] ?? "";
    after.push(m.groupsNote(guide.groupExample, group));
  }
  const many = application.redirectUris.length > 1;
  return [
    {
      title: m.registerTitle(name),
      text: m.registerText(name, many),
      list: application.redirectUris,
      after: after.join(" "),
    },
    ...guide.steps,
  ];
}

// Provider templates end with the same two steps: add the provider in Casdoor, then put it on an application.
export function providerSteps(name: string, provider: ProviderTemplate, guide: Guide, lang: Locale): Step[] {
  const m = getMessages(lang).guide;
  const f = m.fields;
  const fields = [
    { label: f.category, value: provider.category },
    { label: f.type, value: provider.type },
    { label: f.displayName, value: provider.displayName },
    { label: f.clientId, value: "{{clientId}}" },
    { label: f.clientSecret, value: "{{clientSecret}}" },
    ...(provider.domain ? [{ label: f.issuerUrl, value: provider.domain }] : []),
    { label: f.authUrl, value: provider.customAuthUrl },
    { label: f.tokenUrl, value: provider.customTokenUrl },
    { label: f.scope, value: provider.scopes },
    ...(provider.customUserInfoUrl ? [{ label: f.userInfoUrl, value: provider.customUserInfoUrl }] : []),
    ...(provider.customLogoutUrl ? [{ label: f.logoutUrl, value: provider.customLogoutUrl }] : []),
    { label: f.enablePkce, value: provider.enablePkce ? f.on : f.off },
    ...Object.entries(provider.userMapping ?? {}).map(([field, claim]) => ({ label: f.userMapping(field), value: claim })),
  ];
  return [
    ...guide.steps,
    {
      title: m.providerTitle(name),
      text: m.providerText,
      fields,
      after: provider.type === "OIDC" ? m.oidcNote(name) : undefined,
    },
    {
      title: m.applicationTitle,
      text: m.applicationText(provider.displayName),
    },
  ];
}

function StepItem({ index, step, fill }: { index: number; step: Step; fill: (s: string) => string }) {
  return (
    <li className="relative pl-12">
      <span className="absolute top-0 left-0 flex size-8 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">
        {index}
      </span>
      <h3 className="pt-1 text-lg font-semibold">{step.title}</h3>
      <p className="mt-2 leading-7 text-muted-foreground">
        <InlineText text={fill(step.text)} />
      </p>
      {step.list && (
        <ul className="mt-3 space-y-2">
          {step.list.map((item) => (
            <li key={item}>
              <code className="rounded-md bg-muted px-2 py-1 font-mono text-sm break-all">{fill(item)}</code>
            </li>
          ))}
        </ul>
      )}
      {step.fields && (
        <div className="mt-3 overflow-x-auto rounded-lg border">
          <table className="w-full text-left text-sm">
            <tbody>
              {step.fields.map((f) => (
                <tr key={f.label} className="border-b last:border-0">
                  <th scope="row" className="w-1/3 px-4 py-2 font-medium">
                    {f.label}
                  </th>
                  <td className="px-4 py-2 font-mono text-[13px] break-all text-muted-foreground">{fill(f.value)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {step.after && (
        <p className="mt-3 text-sm leading-6 text-muted-foreground">
          <InlineText text={fill(step.after)} />
        </p>
      )}
      {step.code && (
        <pre className="mt-3 overflow-x-auto rounded-lg bg-neutral-950 p-4 text-[13px] leading-6 text-neutral-100">
          <code data-lang={step.code.lang}>{fill(step.code.content)}</code>
        </pre>
      )}
    </li>
  );
}

export function GuideView({
  name,
  steps,
  guide,
  values,
  lang,
}: {
  name: string;
  steps: Step[];
  guide: Guide;
  values: Record<string, string>;
  lang: Locale;
}) {
  const m = getMessages(lang).guide;
  const fill = (s: string) => fillVariables(s, values);

  return (
    <section className="flex flex-col gap-8">
      <div className="rounded-lg border bg-muted/40 p-4 text-sm leading-6 text-muted-foreground">
        <InlineText text={m.prerequisite(exampleCasdoorUrl)} />
      </div>

      <h2 className="text-2xl font-semibold tracking-tight">{m.setUpTitle(name)}</h2>
      <ol className="space-y-10">
        {steps.map((step, i) => (
          <StepItem key={step.title} index={i + 1} step={step} fill={fill} />
        ))}
      </ol>

      {guide.tips && guide.tips.length > 0 && (
        <div className="rounded-lg border p-5">
          <h2 className="mb-3 flex items-center gap-2 font-semibold">
            <Lightbulb className="size-5 text-primary" />
            {m.goodToKnow}
          </h2>
          <ul className="list-disc space-y-2 pl-5 text-sm leading-6 text-muted-foreground">
            {guide.tips.map((tip) => (
              <li key={tip}>
                <InlineText text={fill(tip)} />
              </li>
            ))}
          </ul>
        </div>
      )}

      <p className="text-xs leading-relaxed text-muted-foreground">
        {m.sourcesBefore(name, formatMonth(guide.checkedOn, lang))}
        {guide.sources.map((source, i) => (
          <span key={source.href}>
            {i > 0 && m.sourcesSeparator}
            <a href={source.href} className="underline" rel="noopener">
              {source.label}
            </a>
          </span>
        ))}
        {m.sourcesAfter}
        {guide.docsUrl && (
          <>
            {m.seeAlso}
            <a href={guide.docsUrl} className="underline">
              {m.casdoorDocs}
            </a>
          </>
        )}
        {m.trademark(name)}
      </p>
    </section>
  );
}
