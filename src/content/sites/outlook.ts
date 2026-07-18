import { createFieldAdapter } from "../field-adapter";
import { matchesHost, queryFields, resolveFieldFromSelectors, type SiteAdapter } from "./types";

const HOSTS = ["outlook.live.com", "outlook.office.com", "outlook.office365.com"];

const FIELD_SELECTORS = [
  "div[role='textbox'][contenteditable='true']",
  "div[aria-label*='Message body'][contenteditable='true']",
  "div[aria-label*='Cuerpo'][contenteditable='true']",
  "[contenteditable='true'].elementToProof",
];

const EXCLUDE_SELECTORS = [
  "input[type='search']",
  "[aria-label*='Search']",
  "[aria-label*='Buscar']",
  "[data-lingua-check-ignore]",
];

export const outlookSiteAdapter: SiteAdapter = {
  id: "outlook",
  label: "Outlook",
  matches: (hostname) => matchesHost(hostname, HOSTS),
  getFieldSelectors: () => FIELD_SELECTORS,
  getExcludeSelectors: () => EXCLUDE_SELECTORS,
  resolveField(target) {
    return resolveFieldFromSelectors(target, FIELD_SELECTORS, EXCLUDE_SELECTORS);
  },
  createAdapter: (element) => createFieldAdapter(element),
};

export function getOutlookFields(root: ParentNode = document): HTMLElement[] {
  return queryFields(root, FIELD_SELECTORS, EXCLUDE_SELECTORS);
}
