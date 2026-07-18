import { createFieldAdapter } from "../field-adapter";
import { matchesHost, queryFields, resolveFieldFromSelectors, type SiteAdapter } from "./types";

const HOSTS = ["teams.microsoft.com", "teams.live.com"];

const FIELD_SELECTORS = [
  "div[role='textbox'][contenteditable='true']",
  "div[data-tid='ckeditor'] [contenteditable='true']",
  "[data-tid='newMessageCommands'] ~ div [contenteditable='true']",
  "div[aria-label*='Type a message'][contenteditable='true']",
];

const EXCLUDE_SELECTORS = [
  "input[type='search']",
  "[data-tid='searchInput']",
  "[data-lingua-check-ignore]",
];

export const teamsSiteAdapter: SiteAdapter = {
  id: "teams",
  label: "Microsoft Teams",
  matches: (hostname) => matchesHost(hostname, HOSTS),
  getFieldSelectors: () => FIELD_SELECTORS,
  getExcludeSelectors: () => EXCLUDE_SELECTORS,
  resolveField(target) {
    return resolveFieldFromSelectors(target, FIELD_SELECTORS, EXCLUDE_SELECTORS);
  },
  createAdapter: (element) => createFieldAdapter(element),
};

export function getTeamsFields(root: ParentNode = document): HTMLElement[] {
  return queryFields(root, FIELD_SELECTORS, EXCLUDE_SELECTORS);
}
