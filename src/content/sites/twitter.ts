import { createFieldAdapter } from "../field-adapter";
import { matchesHost, queryFields, resolveFieldFromSelectors, type SiteAdapter } from "./types";

const HOSTS = ["twitter.com", "x.com"];

const FIELD_SELECTORS = [
  "[data-testid='tweetTextarea_0']",
  "[data-testid='tweetTextarea_0'] div[contenteditable='true']",
  "[data-testid='dmComposerTextInput']",
  "[data-testid='dmComposerTextInput'] div[contenteditable='true']",
  "div[contenteditable='true'][role='textbox']",
];

const EXCLUDE_SELECTORS = [
  "[data-testid='SearchBox_Search_Input']",
  "[data-testid='search']",
  "input[type='search']",
  "[data-testid='login'] input",
  "[data-lingua-check-ignore]",
];

export const twitterSiteAdapter: SiteAdapter = {
  id: "twitter",
  label: "X (Twitter)",
  matches: (hostname) => matchesHost(hostname, HOSTS),
  getFieldSelectors: () => FIELD_SELECTORS,
  getExcludeSelectors: () => EXCLUDE_SELECTORS,
  resolveField(target) {
    const resolved = resolveFieldFromSelectors(target, FIELD_SELECTORS, EXCLUDE_SELECTORS);
    if (resolved) return resolved;

    const tweetArea = target.closest("[data-testid='tweetTextarea_0']");
    if (tweetArea instanceof HTMLElement) {
      const editable = tweetArea.querySelector("[contenteditable='true']");
      if (editable instanceof HTMLElement) return editable;
      if (tweetArea.isContentEditable) return tweetArea;
    }

    const dmArea = target.closest("[data-testid='dmComposerTextInput']");
    if (dmArea instanceof HTMLElement) {
      const editable = dmArea.querySelector("[contenteditable='true']");
      if (editable instanceof HTMLElement) return editable;
    }

    return null;
  },
  createAdapter: (element) => createFieldAdapter(element),
};

export function getTwitterFields(root: ParentNode = document): HTMLElement[] {
  const fields = queryFields(root, FIELD_SELECTORS, EXCLUDE_SELECTORS);

  for (const container of root.querySelectorAll("[data-testid='tweetTextarea_0'], [data-testid='dmComposerTextInput']")) {
    if (!(container instanceof HTMLElement)) continue;
    if (container.isContentEditable) fields.push(container);
    const editable = container.querySelector("[contenteditable='true']");
    if (editable instanceof HTMLElement) fields.push(editable);
  }

  return Array.from(new Set(fields));
}
