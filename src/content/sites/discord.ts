import { createFieldAdapter } from "../field-adapter";
import { matchesHost, queryFields, resolveFieldFromSelectors, type SiteAdapter } from "./types";

const HOSTS = ["discord.com"];

const FIELD_SELECTORS = [
  "div[role='textbox'][contenteditable='true']",
  "[data-slate-editor='true']",
  "div[data-can-focus='true'][contenteditable='true']",
];

const EXCLUDE_SELECTORS = [
  "input[type='search']",
  "[class*='searchBar']",
  "[aria-label*='Search']",
  "[aria-label*='Buscar']",
  "[data-lingua-check-ignore]",
];

export const discordSiteAdapter: SiteAdapter = {
  id: "discord",
  label: "Discord",
  matches: (hostname) => matchesHost(hostname, HOSTS),
  getFieldSelectors: () => FIELD_SELECTORS,
  getExcludeSelectors: () => EXCLUDE_SELECTORS,
  resolveField(target) {
    const resolved = resolveFieldFromSelectors(target, FIELD_SELECTORS, EXCLUDE_SELECTORS);
    if (resolved) return resolved;

    const textbox = target.closest("div[role='textbox']");
    if (textbox instanceof HTMLElement && textbox.isContentEditable) {
      return textbox;
    }

    const slate = target.closest("[data-slate-editor='true']");
    if (slate instanceof HTMLElement) return slate;

    return null;
  },
  createAdapter: (element) => createFieldAdapter(element),
};

export function getDiscordFields(root: ParentNode = document): HTMLElement[] {
  const fields = queryFields(root, FIELD_SELECTORS, EXCLUDE_SELECTORS);

  for (const textbox of root.querySelectorAll("div[role='textbox'][contenteditable='true']")) {
    if (textbox instanceof HTMLElement) fields.push(textbox);
  }

  return Array.from(new Set(fields));
}
