import { getMessages, pageUrl } from "@/lib/i18n";
import { getIntegrations } from "@/lib/integrations";
import { collections } from "@/lib/site";

// rendered for every request from the catalog in the database (the backend serves it under /data)
export const dynamic = "force-dynamic";

// https://llmstxt.org: the pages of the site as a Markdown list, for language models.
export async function GET() {
  const m = getMessages("en");
  const integrations = await getIntegrations();
  const lines = [
    `# ${m.siteName}`,
    "",
    `> ${m.home.description}`,
    "",
    "Casdoor is an open-source identity and access management platform (SSO, OAuth 2.0, OpenID Connect, SAML, CAS, LDAP, MFA). " +
      "Every integration here is open source in https://github.com/casdoor/casdoor-integrations and can be installed from the Marketplace page of the Casdoor admin console.",
  ];
  for (const c of collections) {
    const text = m.collections[c.type];
    lines.push("", `## ${text.title}`, "", `${text.description} All of them: ${pageUrl("en", `/${c.slug}/`)}`, "");
    for (const i of integrations.filter((x) => x.type === c.type)) {
      lines.push(`- [${i.name.en}](${pageUrl("en", `/integrations/${i.id}/`)}): ${i.description.en}`);
    }
  }
  lines.push(
    "",
    "## Casdoor",
    "",
    "- [Documentation](https://casdoor.ai/docs/overview): install, configure and operate Casdoor",
    "- [Marketplace in the Casdoor console](https://casdoor.ai/docs/marketplace/overview): how installing an integration works",
    "- [Source code](https://github.com/casdoor/casdoor)",
    "- [Casdoor Cloud](https://www.casdoor.com): hosted Casdoor",
    ""
  );
  return new Response(lines.join("\n"), { headers: { "Content-Type": "text/plain; charset=utf-8" } });
}
