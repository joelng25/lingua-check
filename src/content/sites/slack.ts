import { createFieldAdapter } from "../field-adapter";
import { matchesHost, queryFields, resolveFieldFromSelectors, type SiteAdapter } from "./types";

const HOSTS = ["slack.com"];

const FIELD_SELECTORS = [
  "[data-qa='message_input'] div[contenteditable='true']",
  "[data-qa='message_input'][contenteditable='true']",
  ".ql-editor[contenteditable='true']",
  ".p-rich_text_section[contenteditable='true']",
  "div[role='textbox'][contenteditable='true']",
];

const EXCLUDE_SELECTORS = [
  "[data-qa='channel_sidebar']",
  "[data-qa='slack_search_input']",
  ".p-top_nav__search",
  "input[type='search']",
  "[data-lingua-check-ignore]",
];

export const slackSiteAdapter: SiteAdapter = {
  id: "slack",
  label: "Slack",
  matches: (hostname) => matchesHost(hostname, HOSTS),
  getFieldSelectors: () => FIELD_SELECTORS,
  getExcludeSelectors: () => EXCLUDE_SELECTORS,
  resolveField(target) {
    const resolved = resolveFieldFromSelectors(target, FIELD_SELECTORS, EXCLUDE_SELECTORS);
    if (resolved) return resolved;

    const messageInput = target.closest("[data-qa='message_input']");
    if (messageInput instanceof HTMLElement) {
      const editable = messageInput.querySelector("[contenteditable='true']");
      if (editable instanceof HTMLElement) return editable;
      if (messageInput.isContentEditable) return messageInput;
    }

    return null;
  },
  createAdapter: (element) => createFieldAdapter(element),
};

export function getSlackFields(root: ParentNode = document): HTMLElement[] {
  const fields = queryFields(root, FIELD_SELECTORS, EXCLUDE_SELECTORS);

  for (const container of root.querySelectorAll("[data-qa='message_input']")) {
    if (!(container instanceof HTMLElement)) continue;
    const editable = container.querySelector("[contenteditable='true']");
    if (editable instanceof HTMLElement) fields.push(editable);
  }

  return Array.from(new Set(fields));
}
