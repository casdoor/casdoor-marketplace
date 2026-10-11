import type { IntegrationType } from "@/lib/types";

export const locales = ["en", "zh"] as const;
export type Locale = (typeof locales)[number];

// English pages are at the root, the other languages under /<locale>/.
export const defaultLocale: Locale = "en";

export function isLocale(value: string): value is Locale {
  return (locales as readonly string[]).includes(value);
}

export const htmlLangs: Record<Locale, string> = { en: "en", zh: "zh-CN" };

// The address of a page in the given language; `path` is the English one, starting with "/".
export function localePath(lang: Locale, path: string): string {
  return lang === defaultLocale ? path : `/${lang}${path}`;
}

// hreflang alternates for the metadata of a page at `path` (the English address).
export function languageAlternates(path: string): Record<string, string> {
  return {
    ...Object.fromEntries(locales.map((l) => [htmlLangs[l], localePath(l, path)])),
    "x-default": path,
  };
}

export function formatMonth(month: string, lang: Locale): string {
  return new Date(`${month}-01T00:00:00Z`).toLocaleDateString(lang === "zh" ? "zh-CN" : "en-US", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

const en = {
  siteName: "Casdoor Marketplace",
  siteDescription: "App integrations, identity providers and sign-in themes for Casdoor.",
  languageName: "English",
  separator: " · ",

  typeLabels: {
    app: "App integration",
    provider: "Identity provider",
    theme: "Sign-in theme",
    action: "Action",
  } as Record<IntegrationType, string>,
  typePlurals: {
    app: "App integrations",
    provider: "Identity providers",
    theme: "Sign-in themes",
    action: "Actions",
  } as Record<IntegrationType, string>,

  collections: {
    app: {
      title: "App integrations",
      tagline: "Single sign-on for the apps you run",
      description:
        "Step-by-step single sign-on for self-hosted apps: the Casdoor application to create and the settings on the app's side, down to group and role mapping.",
    },
    provider: {
      title: "Identity providers",
      tagline: "Sign in with accounts people already have",
      description:
        "Ready-made sign-in providers for Casdoor: the endpoints and claims are filled in, and the guide covers registering Casdoor on the other side.",
    },
    theme: {
      title: "Sign-in themes",
      tagline: "Make the sign-in page yours",
      description:
        "Looks for Casdoor's sign-in pages, tested on a real Casdoor. Pick your colors and apply them with Import JSON in the application editor.",
    },
  } as Record<string, { title: string; tagline: string; description: string }>,

  // categories and tags come from the integrations in English; other languages map them here
  categories: {} as Record<string, string>,
  tags: {} as Record<string, string>,

  header: {
    badge: "Marketplace",
    docs: "Docs",
    submit: "Submit",
    language: "Language",
  },

  footer: {
    about:
      "Integrations for Casdoor, the open-source identity and access management platform. Open source and reviewed by the Casdoor team.",
    marketplace: "Marketplace",
    contribute: "Contribute",
    casdoor: "Casdoor",
    submit: "Submit an integration",
    request: "Request an integration",
    integrationsRepo: "Integrations on GitHub",
    marketplaceRepo: "Marketplace on GitHub",
    docs: "Documentation",
    casdoorRepo: "Casdoor on GitHub",
    selfHost: "Self-host with Docker",
    cloud: "Casdoor Cloud",
    disclaimer:
      "Product names and logos belong to their owners. Settings of other products come from their own documentation, linked on each page.",
  },

  home: {
    title: "Casdoor Marketplace: App Integrations, Identity Providers and Themes",
    description:
      "Integrations for Casdoor: single sign-on guides for Grafana, GitLab, Nextcloud and other self-hosted apps, ready-made identity providers such as Keycloak and authentik, and sign-in page themes.",
    badge: "Open source, tested on a real Casdoor",
    titleBefore: "Everything that plugs into ",
    titleAfter: "",
    text: "Single sign-on for the apps you run, identity providers your users already have accounts with, and themes for your sign-in pages.",
    searchPlaceholder: "Search Grafana, Keycloak, dark themes...",
    integrations: "integrations",
    categories: "categories",
    checked: "Every one checked by the Casdoor team",
    browse: "Browse",
    featured: "Featured",
    featuredText: "A good place to start.",
    all: "All integrations",
    buildTitle: "Build an integration",
    buildText:
      "An integration is a few JSON files in the casdoor-integrations repository: the Casdoor settings, the steps on the other side, and the documentation they come from. Open a pull request and we review it.",
    contribute: "How to contribute",
    installTitle: "Install from your Casdoor",
    installText:
      "A Marketplace page in the Casdoor console that installs these with your own addresses filled in is on the way. Until then, every integration lists the exact settings to enter by hand.",
    getCasdoor: "Get Casdoor",
  },

  collection: {
    title: (title: string) => `${title} for Casdoor | Casdoor Marketplace`,
    searchPlaceholder: (title: string) => `Search ${title.toLowerCase()}...`,
  },

  catalog: {
    searchLabel: "Search integrations",
    type: "Type",
    category: "Category",
    capabilities: "Capabilities",
    count: (n: number): string => (n === 1 ? "integration" : "integrations"),
    sortBy: "Sort by",
    sortFeatured: "Featured",
    sortName: "Name",
    sortUpdated: "Recently updated",
    emptyTitle: "Nothing matches yet",
    emptyText:
      "Any app that speaks OpenID Connect, OAuth 2.0, SAML, CAS or LDAP works with Casdoor. Ask us to add a guide for it.",
    request: "Request an integration",
  },

  integration: {
    themeTitle: (name: string) => `${name}: a Sign-in Page Theme for Casdoor`,
    title: (name: string, type: string) => `${name} ${type} | Casdoor`,
    structuredName: (name: string, type: string) => `${name} ${type} for Casdoor`,
    verified: "Verified by Casdoor",
    verifiedShort: "Verified",
    applyTheme: "Apply this theme",
    setUp: "Set it up",
    viewSource: "View source",
    faq: "Frequently asked questions",
    install: "Install",
    installText:
      "One-click install from the Casdoor console is on the way. For now, follow the steps on this page; they take a few minutes.",
    goToSteps: "Go to the steps",
    details: "Details",
    type: "Type",
    category: "Category",
    version: "Version",
    casdoor: "Casdoor",
    checked: "Checked",
    author: "Author",
    license: "License",
    casdoorTeam: "Casdoor team",
    sourceOnGitHub: "Source on GitHub",
    reportProblem: "Report a problem",
    newTitle: "New to Casdoor?",
    newText: "Open-source identity and access management with SSO, MFA and social login.",
    selfHost: "Self-host for free",
    tryCloud: "Try Casdoor Cloud",
    more: (title: string) => `More ${title.toLowerCase()}`,
    viewAll: "View all",
  },

  guide: {
    prerequisite: (url: string) =>
      `You need a running Casdoor, self-hosted or on Casdoor Cloud. In the examples, replace \`${url}\` with your Casdoor address (on Casdoor Cloud, something like \`https://acme.casdoor.com\`) and the other example.com addresses with your own.`,
    setUpTitle: (name: string) => `Set up ${name} with Casdoor`,
    goodToKnow: "Good to know",
    sourcesBefore: (name: string, date: string) => `${name} settings are from its documentation as of ${date} (`,
    sourcesSeparator: ", ",
    sourcesAfter: ")",
    seeAlso: "; see also the ",
    casdoorDocs: "Casdoor documentation",
    trademark: (name: string) => `. ${name} is a trademark of its owner.`,

    registerTitle: (name: string) => `Register ${name} in Casdoor`,
    registerText: (name: string, many: boolean) =>
      `In the Casdoor console, open **Applications**, add an application for ${name}, and on its **OIDC/OAuth** tab copy the **Client ID** and **Client secret**. Add ${many ? "these redirect URLs" : "this redirect URL"} to **Redirect URLs**:`,
    groupsNote: (example: string, group: string) =>
      `To use groups, create them in the application's organization (for example ${example}) and add users. Then set **Token group format** to **Name** on the same tab, so tokens carry \`${group}\` rather than \`<organization>/${group}\`.`,

    providerTitle: (name: string) => `Add ${name} as a provider in Casdoor`,
    providerText: "In the Casdoor console, open **Providers**, click **Add**, and fill in:",
    oidcNote: (name: string) =>
      `**Request** next to Issuer URL fills in the other URLs from ${name}'s discovery document. Casdoor links users of every OIDC-type provider in an organization through the same field, so if the organization already has one, set **Type** to **Custom Flexible** instead, which links accounts per provider.`,
    applicationTitle: "Add the provider to an application",
    applicationText: (displayName: string) =>
      `Open **Applications**, edit the application people sign in to, and add the provider on its **Providers** tab. Its sign-in page now has a **${displayName}** button.`,
    fields: {
      category: "Category",
      type: "Type",
      displayName: "Display name",
      clientId: "Client ID",
      clientSecret: "Client secret",
      issuerUrl: "Issuer URL",
      authUrl: "Auth URL",
      tokenUrl: "Token URL",
      scope: "Scope",
      userInfoUrl: "UserInfo URL",
      logoutUrl: "Logout URL",
      enablePkce: "Enable PKCE",
      userMapping: (field: string) => `User mapping: ${field}`,
      on: "On",
      off: "Off",
    },
  },

  theme: {
    screenshotAlt: (name: string, n: number | null) => `${name} sign-in page${n ? ` ${n}` : ""}`,
    globalAdmin:
      "This theme sets custom HTML, which only a global admin (an admin of the `built-in` organization) can save. When anyone else saves it, Casdoor keeps the application's old HTML.",
    whatItSets: "What it sets",
    settings: {
      theme: "Theme",
      borderRadius: "Border radius",
      formPosition: "Form position",
      customCss: "Custom CSS",
      customCssMobile: "Custom CSS Mobile",
      sidePanelHtml: "Side panel HTML",
      footerHtml: "Footer HTML",
    },
    positions: { 1: "Left", 2: "Center", 3: "Right", 4: "Center, with the side panel" } as Record<number, string>,
    yes: "Yes",
    no: "No",
    adjustLater: "Everything is on the application's **UI Customization** tab in Casdoor, so you can keep adjusting it after applying the theme.",
    applyTitle: "Apply it to an application",
    applySteps: [
      "Enter the application below, adjust the theme's settings, and copy the JSON.",
      "In the Casdoor console, open **Applications**, edit that application, click **Import JSON** at the top, paste the JSON and click **OK**.",
      "Click **Save**. The sign-in page uses the theme from the next visit.",
    ],
    organization: "Organization",
    application: "Application name",
    organizationPlaceholder: "e.g. acme",
    applicationPlaceholder: "e.g. app-acme",
    applicationValue: "<application name>",
    organizationValue: "<organization>",
    copy: "Copy",
    copied: "Copied",
  },

  notFound: {
    title: "Page not found",
    text: "This page does not exist, or the integration was removed.",
    home: "Back to the Marketplace",
  },
};

export type Messages = typeof en;

const zh: Messages = {
  siteName: "Casdoor 集成市场",
  siteDescription: "Casdoor 的应用集成、身份提供商和登录主题。",
  languageName: "中文",
  separator: " | ",

  typeLabels: {
    app: "应用集成",
    provider: "身份提供商",
    theme: "登录主题",
    action: "动作",
  },
  typePlurals: {
    app: "应用集成",
    provider: "身份提供商",
    theme: "登录主题",
    action: "动作",
  },

  collections: {
    app: {
      title: "应用集成",
      tagline: "给你自己部署的应用接上单点登录",
      description:
        "自托管应用接入单点登录的分步指南：在 Casdoor 里建什么应用、应用那边怎么配置，一直到群组和角色映射。",
    },
    provider: {
      title: "身份提供商",
      tagline: "用户直接用已有的账号登录",
      description: "现成的 Casdoor 登录提供商：端点和字段映射都已填好，指南里写了怎么在对方那边注册 Casdoor。",
    },
    theme: {
      title: "登录主题",
      tagline: "打造自己的登录页",
      description:
        "Casdoor 登录页的外观，都在真实的 Casdoor 上测过。选好颜色，在应用编辑页用“导入JSON”一键套用。",
    },
  },

  categories: {
    "DevOps & infrastructure": "运维与基础设施",
    Productivity: "办公协作",
    AI: "AI",
    "Identity providers": "身份提供商",
    "Sign-in themes": "登录主题",
  },
  tags: {
    "RBAC by group": "按群组授权",
    "CLI login": "命令行登录",
    "Admin by group": "按群组设管理员",
    "Group mapping": "群组映射",
    "Role mapping": "角色映射",
    "Mobile apps": "移动端 App",
    "Group sync": "群组同步",
    "Auto provisioning": "自动开通账号",
    "Self-hosted": "自托管",
    "Cloud or self-hosted": "云服务或自托管",
    Dark: "深色",
    "CSS only": "纯 CSS",
    "Side panel": "侧面板",
    "Global admin": "需全局管理员",
  },

  header: {
    badge: "集成市场",
    docs: "文档",
    submit: "提交",
    language: "语言",
  },

  footer: {
    about: "Casdoor 的集成市场。Casdoor 是开源的身份认证与访问管理平台，这里的集成全部开源，并经过 Casdoor 团队审核。",
    marketplace: "集成市场",
    contribute: "参与贡献",
    casdoor: "Casdoor",
    submit: "提交集成",
    request: "申请新集成",
    integrationsRepo: "集成源码（GitHub）",
    marketplaceRepo: "市场源码（GitHub）",
    docs: "文档",
    casdoorRepo: "Casdoor 源码（GitHub）",
    selfHost: "用 Docker 自己部署",
    cloud: "Casdoor 云",
    disclaimer: "产品名称和标志归各自所有者所有。其他产品的设置均来自其官方文档，每个页面都附有链接。",
  },

  home: {
    title: "Casdoor 集成市场：应用集成、身份提供商与登录主题",
    description:
      "Casdoor 的集成：Grafana、GitLab、Nextcloud 等自托管应用的单点登录指南，Keycloak、authentik 等现成的身份提供商，以及登录页主题。",
    badge: "开源，在真实的 Casdoor 上测试过",
    titleBefore: "让 ",
    titleAfter: " 连接一切",
    text: "给你自己部署的应用接上单点登录，让用户用已有的账号登录，再给登录页换上你喜欢的主题。",
    searchPlaceholder: "搜索 Grafana、Keycloak、深色主题...",
    integrations: "个集成",
    categories: "个分类",
    checked: "每一个都经过 Casdoor 团队核验",
    browse: "去看看",
    featured: "精选",
    featuredText: "从这些开始。",
    all: "全部集成",
    buildTitle: "开发一个集成",
    buildText:
      "一个集成就是 casdoor-integrations 仓库里的几个 JSON 文件：Casdoor 这边的设置、对方那边的步骤，以及这些设置出自哪份文档。提交 Pull Request，我们来审核。",
    contribute: "如何贡献",
    installTitle: "在你的 Casdoor 里安装",
    installText:
      "Casdoor 控制台里的“集成市场”页面正在开发中，届时可以一键安装、自动填好你自己的地址。在那之前，每个集成都列出了需要手动填写的全部设置。",
    getCasdoor: "获取 Casdoor",
  },

  collection: {
    title: (title: string) => `Casdoor ${title} | Casdoor 集成市场`,
    searchPlaceholder: (title: string) => `搜索${title}...`,
  },

  catalog: {
    searchLabel: "搜索集成",
    type: "类型",
    category: "分类",
    capabilities: "能力",
    count: () => "个集成",
    sortBy: "排序",
    sortFeatured: "推荐",
    sortName: "名称",
    sortUpdated: "最近更新",
    emptyTitle: "暂时没有匹配的集成",
    emptyText: "任何支持 OpenID Connect、OAuth 2.0、SAML、CAS 或 LDAP 的应用都能接入 Casdoor。告诉我们，我们来补上指南。",
    request: "申请新集成",
  },

  integration: {
    themeTitle: (name: string) => `${name}：Casdoor 登录页主题`,
    title: (name: string, type: string) => `${name} ${type} | Casdoor`,
    structuredName: (name: string, type: string) => `Casdoor ${name} ${type}`,
    verified: "Casdoor 官方核验",
    verifiedShort: "已核验",
    applyTheme: "套用这个主题",
    setUp: "开始配置",
    viewSource: "查看源码",
    faq: "常见问题",
    install: "安装",
    installText: "Casdoor 控制台一键安装正在开发中。目前请按本页的步骤配置，几分钟就能完成。",
    goToSteps: "查看步骤",
    details: "详细信息",
    type: "类型",
    category: "分类",
    version: "版本",
    casdoor: "Casdoor",
    checked: "核对时间",
    author: "作者",
    license: "许可证",
    casdoorTeam: "Casdoor 团队",
    sourceOnGitHub: "GitHub 上的源码",
    reportProblem: "报告问题",
    newTitle: "第一次用 Casdoor？",
    newText: "开源的身份认证与访问管理平台，支持单点登录、多因素认证和社交登录。",
    selfHost: "免费自己部署",
    tryCloud: "试用 Casdoor 云",
    more: (title: string) => `更多${title}`,
    viewAll: "查看全部",
  },

  guide: {
    prerequisite: (url: string) =>
      `你需要一个正在运行的 Casdoor，自己部署或用 Casdoor 云都可以。示例中的 \`${url}\` 请换成你的 Casdoor 地址（Casdoor 云上类似 \`https://acme.casdoor.com\`），其他 example.com 地址也换成你自己的。`,
    setUpTitle: (name: string) => `用 Casdoor 配置 ${name}`,
    goodToKnow: "注意事项",
    sourcesBefore: (name: string, date: string) => `${name} 的设置取自它的官方文档（核对于 ${date}：`,
    sourcesSeparator: "、",
    sourcesAfter: "）",
    seeAlso: "；另见",
    casdoorDocs: "Casdoor 文档",
    trademark: (name: string) => `。${name} 是其所有者的商标。`,

    registerTitle: (name: string) => `在 Casdoor 中注册 ${name}`,
    registerText: (name: string) =>
      `在 Casdoor 控制台打开 **应用**，为 ${name} 添加一个应用，在它的 **OIDC/OAuth** 标签页复制 **客户端ID** 和 **客户端密钥**。把下面的地址加到 **重定向URLs**：`,
    groupsNote: (example: string, group: string) =>
      `要用群组的话，先在应用所属的组织里创建群组（例如 ${example}）并加入用户，再在同一个标签页把 **Token 中的群组格式** 设成 **Name**，这样令牌里是 \`${group}\`，而不是 \`<组织>/${group}\`。`,

    providerTitle: (name: string) => `在 Casdoor 中添加 ${name} 提供商`,
    providerText: "在 Casdoor 控制台打开 **提供商**，点击 **添加**，填写：",
    oidcNote: (name: string) =>
      `点击 Issuer链接 旁边的 **请求**，会从 ${name} 的 discovery 文档自动填好其余地址。同一个组织里所有 OIDC 类型的提供商都通过同一个字段关联用户，所以如果这个组织已经有一个 OIDC 提供商，请把 **类型** 改成 **Custom Flexible**，它按提供商分别关联账号。`,
    applicationTitle: "把提供商加到应用上",
    applicationText: (displayName: string) =>
      `打开 **应用**，编辑用户登录的那个应用，在它的 **提供商** 标签页添加这个提供商。之后登录页上就会出现 **${displayName}** 按钮。`,
    fields: {
      category: "类别",
      type: "类型",
      displayName: "显示名称",
      clientId: "客户端ID",
      clientSecret: "客户端密钥",
      issuerUrl: "Issuer链接",
      authUrl: "认证URL",
      tokenUrl: "Token链接",
      scope: "范围",
      userInfoUrl: "UserInfo链接",
      logoutUrl: "登出URL",
      enablePkce: "启用PKCE",
      userMapping: (field: string) => `用户映射：${field}`,
      on: "开启",
      off: "关闭",
    },
  },

  theme: {
    screenshotAlt: (name: string, n: number | null) => `${name} 登录页${n ? ` ${n}` : ""}`,
    globalAdmin:
      "这个主题设置了自定义 HTML，只有全局管理员（`built-in` 组织的管理员）才能保存。其他人保存时，Casdoor 会保留应用原来的 HTML。",
    whatItSets: "会改哪些设置",
    settings: {
      theme: "主题",
      borderRadius: "圆角",
      formPosition: "表单位置",
      customCss: "表单CSS",
      customCssMobile: "表单CSS（移动端）",
      sidePanelHtml: "侧面板HTML",
      footerHtml: "页脚HTML",
    },
    positions: { 1: "居左", 2: "居中", 3: "居右", 4: "居中，带侧面板" },
    yes: "是",
    no: "否",
    adjustLater: "这些都在 Casdoor 应用的 **界面定制** 标签页里，套用主题之后还可以继续调整。",
    applyTitle: "套用到应用",
    applySteps: [
      "在下面填好应用，调整主题的设置，然后复制 JSON。",
      "在 Casdoor 控制台打开 **应用**，编辑这个应用，点击顶部的 **导入JSON**，粘贴 JSON 后点 **确定**。",
      "点击 **保存**。下次打开登录页时就会用上这个主题。",
    ],
    organization: "组织",
    application: "应用名称",
    organizationPlaceholder: "例如 acme",
    applicationPlaceholder: "例如 app-acme",
    applicationValue: "<应用名称>",
    organizationValue: "<组织>",
    copy: "复制",
    copied: "已复制",
  },

  notFound: {
    title: "页面不存在",
    text: "这个页面不存在，或者这个集成已经下架。",
    home: "返回集成市场",
  },
};

const messages: Record<Locale, Messages> = { en, zh };

export function getMessages(lang: Locale): Messages {
  return messages[lang];
}

export function translateCategory(category: string, lang: Locale): string {
  return messages[lang].categories[category] ?? category;
}

export function translateTag(tag: string, lang: Locale): string {
  return messages[lang].tags[tag] ?? tag;
}
