// Mirrors the schemas in casdoor/casdoor-integrations (schema/) and the index.json its build writes.

export type IntegrationType = "app" | "provider" | "theme" | "action";

export type LocalizedText = {
  en: string;
  zh?: string;
};

export type IntegrationVersion = {
  version: string;
  casdoorVersion: string;
  url: string;
  sha256: string;
  publishedAt: string;
};

export type Integration = {
  id: string;
  type: IntegrationType;
  name: LocalizedText;
  description: LocalizedText;
  author: string;
  license: string;
  logo?: string;
  homepage?: string;
  categories: string[];
  tags?: string[];
  screenshots?: string[];
  verified: boolean;
  // "cn": only listed in Chinese, e.g. sign-in with a platform only used in China
  region?: "cn";
  requiresGlobalAdmin?: boolean;
  latest: string;
  versions: IntegrationVersion[];
};

export type IntegrationIndex = {
  schemaVersion: number;
  generatedAt: string;
  integrations: Integration[];
  revoked: { id: string; version: string; reason: string }[];
};

export type Variable = {
  name: string;
  label: LocalizedText;
  description?: LocalizedText;
  type: "string" | "url" | "color";
  required?: boolean;
  example: string;
};

export type Manifest = {
  id: string;
  type: IntegrationType;
  version: string;
  casdoorVersion: string;
  name: LocalizedText;
  description: LocalizedText;
  author: string;
  license: string;
  logo?: string;
  homepage?: string;
  screenshots?: string[];
  tags?: string[];
  categories: string[];
  variables?: Variable[];
};

export type ApplicationTemplate = {
  redirectUris: string[];
  grantTypes?: string[];
  tokenFormat?: string;
  tokenGroupFormat?: "ID" | "Path" | "Name";
};

export type ProviderTemplate = {
  category: "OAuth";
  type: "OIDC" | "Custom";
  displayName: string;
  domain?: string;
  customAuthUrl: string;
  customTokenUrl: string;
  customUserInfoUrl?: string;
  customLogoutUrl?: string;
  scopes: string;
  enablePkce?: boolean;
  userMapping?: Record<string, string>;
};

export type ThemeTemplate = {
  themeData: {
    themeType: string;
    colorPrimary: string;
    borderRadius: number;
    isCompact: boolean;
    isEnabled: true;
  };
  formOffset: 1 | 2 | 3 | 4;
  formCss?: string;
  formCssMobile?: string;
  formSideHtml?: string;
  footerHtml?: string;
  formBackgroundUrl?: string;
  formBackgroundUrlMobile?: string;
};

export type GuideStep = {
  title: string;
  text: string;
  code?: { lang: string; content: string };
  fields?: { label: string; value: string }[];
};

export type Guide = {
  checkedOn: string;
  title: string;
  headline: string;
  summary: string;
  redirectNote?: string;
  groupExample?: string;
  steps: GuideStep[];
  tips?: string[];
  faqs?: { question: string; answer: string }[];
  sources: { label: string; href: string }[];
  docsUrl?: string;
};

export type Bundle = {
  manifest: Manifest;
  files: {
    "application.json"?: ApplicationTemplate;
    "provider.json"?: ProviderTemplate;
    "theme.json"?: ThemeTemplate;
    "guide.json"?: Guide;
  };
};
