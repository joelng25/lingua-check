import { discordSiteAdapter } from "./discord";
import { googleDocsSiteAdapter } from "./google-docs";
import { genericSiteAdapter, getGenericFields } from "./generic";
import { gmailSiteAdapter } from "./gmail";
import { linkedinSiteAdapter } from "./linkedin";
import { redditSiteAdapter } from "./reddit";
import { slackSiteAdapter } from "./slack";
import { twitterSiteAdapter } from "./twitter";
import { whatsappSiteAdapter } from "./whatsapp";
import { queryFields, type SiteAdapter } from "./types";

const siteAdapters: SiteAdapter[] = [
  googleDocsSiteAdapter,
  gmailSiteAdapter,
  linkedinSiteAdapter,
  twitterSiteAdapter,
  slackSiteAdapter,
  redditSiteAdapter,
  discordSiteAdapter,
  whatsappSiteAdapter,
];

let activeAdapter: SiteAdapter = genericSiteAdapter;

export function getSiteAdapter(hostname: string = location.hostname): SiteAdapter {
  activeAdapter = siteAdapters.find((adapter) => adapter.matches(hostname)) ?? genericSiteAdapter;
  return activeAdapter;
}

export function getActiveSiteAdapter(): SiteAdapter {
  return activeAdapter;
}

export function getSiteEditableFields(root: ParentNode = document): HTMLElement[] {
  const adapter = getSiteAdapter();

  if (adapter.id === "google-docs") {
    const editor = root.querySelector(".kix-appview-editor");
    return editor instanceof HTMLElement ? [editor] : [];
  }

  if (adapter.id === "generic") {
    return getGenericFields(root);
  }

  return queryFields(root, adapter.getFieldSelectors(), adapter.getExcludeSelectors());
}

export function resolveSiteField(target: Element): HTMLElement | null {
  return getSiteAdapter().resolveField(target);
}

export { genericSiteAdapter, discordSiteAdapter, gmailSiteAdapter, googleDocsSiteAdapter, linkedinSiteAdapter, redditSiteAdapter, slackSiteAdapter, twitterSiteAdapter, whatsappSiteAdapter };
export type { SiteAdapter };
