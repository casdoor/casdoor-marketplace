import zh from "@/translations/zh.json";
import type { Locale } from "@/lib/i18n";
import type { Bundle, Guide, Integration, LocalizedText } from "@/lib/types";

// casdoor-integrations is written in English only. The text of its integrations in the site's other languages lives
// here, in src/translations/<lang>.json keyed by integration id, and is laid over the English when a page is rendered.
// Anything a translation leaves out, or that no longer lines up with the English (a guide that has gained or lost
// steps since), stays in English. `version` is the version the translation was made from.
export type Translation = {
  version: string;
  name?: string;
  description?: string;
  variables?: Record<string, { label?: string; description?: string }>;
  guide?: {
    title?: string;
    headline?: string;
    summary?: string;
    redirectNote?: string;
    groupExample?: string;
    steps?: { title: string; text: string; fields?: string[] }[];
    tips?: string[];
    faqs?: { question: string; answer: string }[];
  };
};

const translations: Partial<Record<Locale, Record<string, Translation>>> = {
  zh: zh as Record<string, Translation>,
};

export function getTranslation(id: string, lang: Locale): Translation | undefined {
  return translations[lang]?.[id];
}

// The text in `lang`, or the English.
export function localized(text: LocalizedText, lang: Locale): string {
  return (lang === "en" ? undefined : text[lang]) ?? text.en;
}

function withText(text: LocalizedText, lang: Locale, value: string | undefined): LocalizedText {
  return value && !text[lang as keyof LocalizedText] ? { ...text, [lang]: value } : text;
}

// The integration with its name and description in every language there is a translation for.
export function translateIntegration(integration: Integration): Integration {
  let result = integration;
  for (const lang of Object.keys(translations) as Locale[]) {
    const t = getTranslation(integration.id, lang);
    if (t) {
      result = { ...result, name: withText(result.name, lang, t.name), description: withText(result.description, lang, t.description) };
    }
  }
  return result;
}

function translateGuide(guide: Guide, t: NonNullable<Translation["guide"]>): Guide {
  const sameLength = <T>(a: T[] | undefined, b: unknown[] | undefined): a is T[] => !!a && !!b && a.length === b.length;
  const steps = t.steps;
  const stepsMatch =
    sameLength(steps, guide.steps) && guide.steps.every((s, i) => (s.fields?.length ?? 0) === (steps[i].fields?.length ?? 0));
  return {
    ...guide,
    title: t.title ?? guide.title,
    headline: t.headline ?? guide.headline,
    summary: t.summary ?? guide.summary,
    redirectNote: guide.redirectNote && (t.redirectNote ?? guide.redirectNote),
    groupExample: guide.groupExample && (t.groupExample ?? guide.groupExample),
    steps: stepsMatch
      ? guide.steps.map((s, i) => ({
          ...s,
          title: steps[i].title,
          text: steps[i].text,
          fields: s.fields?.map((f, j) => ({ ...f, label: steps[i].fields?.[j] ?? f.label })),
        }))
      : guide.steps,
    tips: sameLength(t.tips, guide.tips) ? t.tips : guide.tips,
    faqs: sameLength(t.faqs, guide.faqs) ? t.faqs : guide.faqs,
  };
}

// The bundle with the labels of its variables in every language, and its guide in `lang`.
export function translateBundle(integration: Integration, bundle: Bundle, lang: Locale): Bundle {
  const t = getTranslation(integration.id, lang);
  if (!t) {
    return bundle;
  }
  const variables = bundle.manifest.variables?.map((v) => {
    const tv = t.variables?.[v.name];
    return {
      ...v,
      label: withText(v.label, lang, tv?.label),
      description: v.description && withText(v.description, lang, tv?.description),
    };
  });
  const guide = bundle.files["guide.json"];
  return {
    manifest: { ...bundle.manifest, variables },
    files: { ...bundle.files, ...(guide && t.guide ? { "guide.json": translateGuide(guide, t.guide) } : {}) },
  };
}
