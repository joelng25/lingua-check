import { createFieldAdapter } from "../field-adapter";
import { matchesHost, queryFields, resolveFieldFromSelectors, type SiteAdapter } from "./types";

const HOSTS = ["linkedin.com"];

const FIELD_SELECTORS = [
  ".ql-editor[contenteditable='true']",
  ".msg-form__contenteditable",
  ".comments-comment-texteditor .ql-editor",
  ".share-creation-state__text-editor .ql-editor",
  "[data-test-share-box] .ql-editor",
  "div[role='textbox'][contenteditable='true']",
];

const EXCLUDE_SELECTORS = [
  ".search-global-typeahead",
  ".search-basic-typeahead",
  "[role='combobox'] input",
  "input[type='search']",
  ".msg-form__attachment-drag-and-drop",
  "[data-lingua-check-ignore]",
];

export const linkedinSiteAdapter: SiteAdapter = {
  id: "linkedin",
  label: "LinkedIn",
  matches: (hostname) => matchesHost(hostname, HOSTS),
  getFieldSelectors: () => FIELD_SELECTORS,
  getExcludeSelectors: () => EXCLUDE_SELECTORS,
  resolveField(target) {
    return resolveFieldFromSelectors(target, FIELD_SELECTORS, EXCLUDE_SELECTORS);
  },
  createAdapter: (element) => createFieldAdapter(element),
};

export function getLinkedInFields(root: ParentNode = document): HTMLElement[] {
  return queryFields(root, FIELD_SELECTORS, EXCLUDE_SELECTORS);
}
