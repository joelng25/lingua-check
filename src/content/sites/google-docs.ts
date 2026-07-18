import { createGoogleDocsAdapter, findGoogleDocsEditor, isGoogleDocsEditor } from "../google-docs-adapter";
import { matchesHost, resolveFieldFromSelectors, type SiteAdapter } from "./types";

const HOSTS = ["docs.google.com"];
const EDITOR_SELECTOR = ".kix-appview-editor";
const FIELD_SELECTORS = [EDITOR_SELECTOR];
const EXCLUDE_SELECTORS = ["[data-lingua-check-ignore]"];

export const googleDocsSiteAdapter: SiteAdapter = {
  id: "google-docs",
  label: "Google Docs",
  matches: (hostname) => matchesHost(hostname, HOSTS),
  getFieldSelectors: () => FIELD_SELECTORS,
  getExcludeSelectors: () => EXCLUDE_SELECTORS,
  resolveField(target) {
    if (isGoogleDocsEditor(target)) return target;

    const resolved = resolveFieldFromSelectors(target, FIELD_SELECTORS, EXCLUDE_SELECTORS);
    if (resolved) return resolved;

    const editor = target.closest(EDITOR_SELECTOR);
    return editor instanceof HTMLElement ? editor : null;
  },
  createAdapter: (element) => {
    if (isGoogleDocsEditor(element)) {
      return createGoogleDocsAdapter(element);
    }

    return null;
  },
};

export function getGoogleDocsFields(root: ParentNode = document): HTMLElement[] {
  const editor = findGoogleDocsEditor(root);
  return editor ? [editor] : [];
}
