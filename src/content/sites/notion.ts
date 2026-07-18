import { createFieldAdapter } from "../field-adapter";
import { matchesHost, queryFields, resolveFieldFromSelectors, type SiteAdapter } from "./types";

const HOSTS = ["notion.so", "www.notion.so"];

const FIELD_SELECTORS = [
  "[contenteditable='true'][data-content-editable-leaf='true']",
  ".notion-page-content [contenteditable='true']",
  "[data-content-editable-root='true'] [contenteditable='true']",
  "div[contenteditable='true'][role='textbox']",
];

const EXCLUDE_SELECTORS = [
  "[placeholder*='Search']",
  "[placeholder*='Buscar']",
  "input[type='search']",
  "[data-lingua-check-ignore]",
];

export const notionSiteAdapter: SiteAdapter = {
  id: "notion",
  label: "Notion",
  matches: (hostname) => matchesHost(hostname, HOSTS),
  getFieldSelectors: () => FIELD_SELECTORS,
  getExcludeSelectors: () => EXCLUDE_SELECTORS,
  resolveField(target) {
    return resolveFieldFromSelectors(target, FIELD_SELECTORS, EXCLUDE_SELECTORS);
  },
  createAdapter: (element) => createFieldAdapter(element),
};

export function getNotionFields(root: ParentNode = document): HTMLElement[] {
  return queryFields(root, FIELD_SELECTORS, EXCLUDE_SELECTORS);
}
