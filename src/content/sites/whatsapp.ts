import { createFieldAdapter } from "../field-adapter";
import { matchesHost, queryFields, resolveFieldFromSelectors, type SiteAdapter } from "./types";

const HOSTS = ["web.whatsapp.com"];

const FIELD_SELECTORS = [
  "footer div[contenteditable='true'][role='textbox']",
  "footer div[contenteditable='true'][data-tab='10']",
  "#main footer div[contenteditable='true']",
  "div[contenteditable='true'][data-lexical-editor='true']",
];

const EXCLUDE_SELECTORS = [
  "div[contenteditable='true'][data-tab='3']",
  "#side div[contenteditable='true']",
  "input[type='text']",
  "[data-lingua-check-ignore]",
];

export const whatsappSiteAdapter: SiteAdapter = {
  id: "whatsapp",
  label: "WhatsApp Web",
  matches: (hostname) => matchesHost(hostname, HOSTS),
  getFieldSelectors: () => FIELD_SELECTORS,
  getExcludeSelectors: () => EXCLUDE_SELECTORS,
  resolveField(target) {
    const resolved = resolveFieldFromSelectors(target, FIELD_SELECTORS, EXCLUDE_SELECTORS);
    if (resolved) return resolved;

    const footer = target.closest("footer");
    if (footer instanceof HTMLElement) {
      const editable = footer.querySelector("div[contenteditable='true'][role='textbox']");
      if (editable instanceof HTMLElement) return editable;
    }

    return null;
  },
  createAdapter: (element) => createFieldAdapter(element),
};
