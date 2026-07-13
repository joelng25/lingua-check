import { createFieldAdapter } from "../field-adapter";
import { matchesHost, queryFields, resolveFieldFromSelectors, type SiteAdapter } from "./types";

const HOSTS = ["reddit.com", "old.reddit.com", "new.reddit.com"];

const FIELD_SELECTORS = [
  "[contenteditable='true'][data-lexical-editor='true']",
  "div[contenteditable='true'][role='textbox']",
  "textarea[name='body']",
  "[data-testid='comment-composer'] [contenteditable='true']",
  "shreddit-composer [contenteditable='true']",
  ".public-DraftEditor-content[contenteditable='true']",
];

const EXCLUDE_SELECTORS = [
  "input[type='search']",
  "[data-testid='search-input']",
  "#header-search-bar",
  "faceplate-search-input",
  "[data-lingua-check-ignore]",
];

export const redditSiteAdapter: SiteAdapter = {
  id: "reddit",
  label: "Reddit",
  matches: (hostname) => matchesHost(hostname, HOSTS),
  getFieldSelectors: () => FIELD_SELECTORS,
  getExcludeSelectors: () => EXCLUDE_SELECTORS,
  resolveField(target) {
    const resolved = resolveFieldFromSelectors(target, FIELD_SELECTORS, EXCLUDE_SELECTORS);
    if (resolved) return resolved;

    const composer = target.closest("shreddit-composer, [data-testid='comment-composer']");
    if (composer instanceof HTMLElement) {
      const editable = composer.querySelector("[contenteditable='true']");
      if (editable instanceof HTMLElement) return editable;
    }

    return null;
  },
  createAdapter: (element) => createFieldAdapter(element),
};

export function getRedditFields(root: ParentNode = document): HTMLElement[] {
  return queryFields(root, FIELD_SELECTORS, EXCLUDE_SELECTORS);
}
