import { Lightbulb } from "lucide-react";
import { InlineText } from "@/components/inline-text";
import { exampleCasdoorUrl, fillVariables } from "@/lib/variables";
import type { ApplicationTemplate, Guide, GuideStep, ProviderTemplate } from "@/lib/types";

export type Step = GuideStep & { list?: string[]; after?: string };

// App integrations start with the same step: register the app as an application in Casdoor.
export function appSteps(name: string, application: ApplicationTemplate, guide: Guide): Step[] {
  const after = guide.redirectNote ? [guide.redirectNote] : [];
  if (guide.groupExample) {
    const group = guide.groupExample.match(/`([^`]+)`/)?.[1];
    after.push(
      `To use groups, create them in the application's organization (for example ${guide.groupExample}) and add users. Then set **Token group format** to **Name** on the same tab, so tokens carry \`${group}\` rather than \`<organization>/${group}\`.`
    );
  }
  const many = application.redirectUris.length > 1;
  return [
    {
      title: `Register ${name} in Casdoor`,
      text: `In the Casdoor console, open **Applications**, add an application for ${name}, and on its **OIDC/OAuth** tab copy the **Client ID** and **Client secret**. Add ${many ? "these redirect URLs" : "this redirect URL"} to **Redirect URLs**:`,
      list: application.redirectUris,
      after: after.join(" "),
    },
    ...guide.steps,
  ];
}

// Provider templates end with the same two steps: add the provider in Casdoor, then put it on an application.
export function providerSteps(name: string, provider: ProviderTemplate, guide: Guide): Step[] {
  const fields = [
    { label: "Category", value: provider.category },
    { label: "Type", value: provider.type },
    { label: "Display name", value: provider.displayName },
    { label: "Client ID", value: "{{clientId}}" },
    { label: "Client secret", value: "{{clientSecret}}" },
    ...(provider.domain ? [{ label: "Issuer URL", value: provider.domain }] : []),
    { label: "Auth URL", value: provider.customAuthUrl },
    { label: "Token URL", value: provider.customTokenUrl },
    { label: "Scope", value: provider.scopes },
    ...(provider.customUserInfoUrl ? [{ label: "UserInfo URL", value: provider.customUserInfoUrl }] : []),
    ...(provider.customLogoutUrl ? [{ label: "Logout URL", value: provider.customLogoutUrl }] : []),
    { label: "Enable PKCE", value: provider.enablePkce ? "On" : "Off" },
    ...Object.entries(provider.userMapping ?? {}).map(([field, claim]) => ({ label: `User mapping: ${field}`, value: claim })),
  ];
  const after =
    provider.type === "OIDC"
      ? `**Request** next to Issuer URL fills in the other URLs from ${name}'s discovery document. Casdoor links users of every OIDC-type provider in an organization through the same field, so if the organization already has one, set **Type** to **Custom Flexible** instead, which links accounts per provider.`
      : undefined;
  return [
    ...guide.steps,
    {
      title: `Add ${name} as a provider in Casdoor`,
      text: "In the Casdoor console, open **Providers**, click **Add**, and fill in:",
      fields,
      after,
    },
    {
      title: "Add the provider to an application",
      text: `Open **Applications**, edit the application people sign in to, and add the provider on its **Providers** tab. Its sign-in page now has a **${provider.displayName}** button.`,
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
}: {
  name: string;
  steps: Step[];
  guide: Guide;
  values: Record<string, string>;
}) {
  const fill = (s: string) => fillVariables(s, values);
  const checkedOn = new Date(`${guide.checkedOn}-01T00:00:00Z`).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });

  return (
    <section className="flex flex-col gap-8">
      <div className="rounded-lg border bg-muted/40 p-4 text-sm leading-6 text-muted-foreground">
        <InlineText
          text={`You need a running Casdoor, self-hosted or on Casdoor Cloud. In the examples, replace \`${exampleCasdoorUrl}\` with your Casdoor address (on Casdoor Cloud, something like \`https://acme.casdoor.com\`) and the other example.com addresses with your own.`}
        />
      </div>

      <h2 className="text-2xl font-semibold tracking-tight">Set up {name} with Casdoor</h2>
      <ol className="space-y-10">
        {steps.map((step, i) => (
          <StepItem key={step.title} index={i + 1} step={step} fill={fill} />
        ))}
      </ol>

      {guide.tips && guide.tips.length > 0 && (
        <div className="rounded-lg border p-5">
          <h2 className="mb-3 flex items-center gap-2 font-semibold">
            <Lightbulb className="size-5 text-primary" />
            Good to know
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
        {name} settings are from its documentation as of {checkedOn} (
        {guide.sources.map((source, i) => (
          <span key={source.href}>
            {i > 0 && ", "}
            <a href={source.href} className="underline" rel="noopener">
              {source.label}
            </a>
          </span>
        ))}
        )
        {guide.docsUrl && (
          <>
            ; see also the{" "}
            <a href={guide.docsUrl} className="underline">
              Casdoor documentation
            </a>
          </>
        )}
        . {name} is a trademark of its owner.
      </p>
    </section>
  );
}
