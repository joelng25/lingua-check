import { createFieldAdapter } from "../field-adapter";
import { matchesHost, queryFields, resolveFieldFromSelectors, type SiteAdapter } from "./types";

const HOSTS = ["mail.google.com"];

const FIELD_SELECTORS = [
  "div[contenteditable='true'][g_editable='true']",
  "div[contenteditable='true'].Am",
  "div[contenteditable='true'][role='textbox']",
  "textarea[name='body']",
];

const EXCLUDE_SELECTORS = [
  "input[name='subjectbox']",
  "input[aria-label*='earch']",
  "input[aria-label*='uscar']",
  "[role='search']",
  "[data-lingua-check-ignore]",
];

export const gmailSiteAdapter: SiteAdapter = {
  id: "gmail",
  label: "Gmail",
  matches: (hostname) => matchesHost(hostname, HOSTS),
  getFieldSelectors: () => FIELD_SELECTORS,
  getExcludeSelectors: () => EXCLUDE_SELECTORS,
  resolveField(target) {
    return resolveFieldFromSelectors(target, FIELD_SELECTORS, EXCLUDE_SELECTORS);
  },
  createAdapter: (element) => createFieldAdapter(element),
};

export function getGmailFields(root: ParentNode = document): HTMLElement[] {
  return queryFields(root, FIELD_SELECTORS, EXCLUDE_SELECTORS);
}
