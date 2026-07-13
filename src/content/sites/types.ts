import type { FieldAdapter } from "../field-adapter";

export interface SiteAdapter {
  id: string;
  label: string;
  matches(hostname: string): boolean;
  getFieldSelectors(): string[];
  getExcludeSelectors(): string[];
  resolveField(target: Element): HTMLElement | null;
  createAdapter?(element: HTMLElement): FieldAdapter | null;
}

export function matchesHost(hostname: string, hosts: string[]): boolean {
  return hosts.some((host) => hostname === host || hostname.endsWith(`.${host}`));
}

export function queryFields(
  root: ParentNode,
  selectors: string[],
  excludeSelectors: string[],
): HTMLElement[] {
  const fields = new Set<HTMLElement>();

  for (const selector of selectors) {
    for (const element of root.querySelectorAll(selector)) {
      if (!(element instanceof HTMLElement)) continue;
      if (isExcluded(element, excludeSelectors)) continue;
      fields.add(element);
    }
  }

  return Array.from(fields);
}

export function resolveFieldFromSelectors(
  target: Element,
  selectors: string[],
  excludeSelectors: string[],
): HTMLElement | null {
  for (const selector of selectors) {
    const match = target.closest(selector);
    if (match instanceof HTMLElement && !isExcluded(match, excludeSelectors)) {
      return match;
    }
  }

  return null;
}

function isExcluded(element: HTMLElement, excludeSelectors: string[]): boolean {
  return excludeSelectors.some((selector) => Boolean(element.closest(selector)));
}
