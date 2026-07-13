import {
  createFieldAdapter,
  getEditableFields as getGenericEditableFields,
  isEditableField,
} from "../field-adapter";
import { queryFields, resolveFieldFromSelectors, type SiteAdapter } from "./types";

const FIELD_SELECTORS = [
  "input[type='text']",
  "input[type='search']",
  "input[type='email']",
  "input[type='url']",
  "input:not([type])",
  "textarea",
  "[contenteditable='true']",
  "[contenteditable='']",
  "[contenteditable='plaintext-only']",
];

const EXCLUDE_SELECTORS = [
  "[data-lingua-check-ignore]",
  "[aria-hidden='true']",
];

export const genericSiteAdapter: SiteAdapter = {
  id: "generic",
  label: "Generic",
  matches: () => true,
  getFieldSelectors: () => FIELD_SELECTORS,
  getExcludeSelectors: () => EXCLUDE_SELECTORS,
  resolveField(target) {
    const resolved = resolveFieldFromSelectors(target, FIELD_SELECTORS, EXCLUDE_SELECTORS);
    if (resolved) return resolved;

    if (target instanceof HTMLElement && isEditableField(target) && !isExcluded(target)) {
      return target;
    }

    return null;
  },
  createAdapter: (element) => createFieldAdapter(element),
};

export function getGenericFields(root: ParentNode = document): HTMLElement[] {
  const siteFields = queryFields(root, FIELD_SELECTORS, EXCLUDE_SELECTORS);
  const genericFields = getGenericEditableFields(root);

  return Array.from(new Set([...siteFields, ...genericFields])).filter(
    (field) => !isExcluded(field),
  );
}

function isExcluded(element: HTMLElement): boolean {
  return EXCLUDE_SELECTORS.some((selector) => Boolean(element.closest(selector)));
}
