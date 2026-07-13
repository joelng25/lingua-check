import type { GrammarMatch } from "../shared/types";

export type FieldKind = "input" | "contenteditable" | "googledocs";

export interface FieldAdapter {
  element: HTMLElement;
  kind: FieldKind;
  getText(): string;
  applyReplacement(offset: number, length: number, replacement: string): void;
  getMatchRects(match: GrammarMatch): DOMRect[];
  getMatchText(match: GrammarMatch): string;
}

interface TextSegment {
  node: Text;
  start: number;
  end: number;
}

const INPUT_SELECTOR = "input[type='text'], input[type='search'], input[type='email'], input[type='url'], input:not([type]), textarea";
const CONTENTEDITABLE_SELECTOR =
  '[contenteditable="true"], [contenteditable=""], [contenteditable="plaintext-only"]';

function isInputField(element: Element): element is HTMLInputElement | HTMLTextAreaElement {
  if (element instanceof HTMLTextAreaElement) return true;
  if (!(element instanceof HTMLInputElement)) return false;

  const type = element.type.toLowerCase();
  return type === "text" || type === "search" || type === "email" || type === "url" || type === "";
}

function isInsideContentEditable(element: Element): boolean {
  return Boolean(element.closest(CONTENTEDITABLE_SELECTOR));
}

function isTopLevelContentEditable(element: Element): element is HTMLElement {
  return (
    element instanceof HTMLElement &&
    element.isContentEditable &&
    !(element.parentElement?.closest(CONTENTEDITABLE_SELECTOR))
  );
}

export function isEditableField(element: Element | null): element is HTMLElement {
  if (!element) return false;
  if (isInputField(element)) return !isInsideContentEditable(element);
  return isTopLevelContentEditable(element);
}

export function getEditableFields(root: ParentNode = document): HTMLElement[] {
  const fields = new Set<HTMLElement>();

  for (const element of root.querySelectorAll(INPUT_SELECTOR)) {
    if (isInputField(element) && !isInsideContentEditable(element)) {
      fields.add(element);
    }
  }

  for (const element of root.querySelectorAll(CONTENTEDITABLE_SELECTOR)) {
    if (isTopLevelContentEditable(element)) {
      fields.add(element);
    }
  }

  return Array.from(fields);
}

export function createFieldAdapter(element: HTMLElement): FieldAdapter | null {
  if (isInputField(element)) {
    return createInputAdapter(element);
  }

  if (isTopLevelContentEditable(element)) {
    return createContentEditableAdapter(element);
  }

  return null;
}

function createInputAdapter(element: HTMLInputElement | HTMLTextAreaElement): FieldAdapter {
  return {
    element,
    kind: "input",
    getText: () => element.value,
    applyReplacement: (offset, length, replacement) => {
      const value = element.value;
      const nextValue = value.slice(0, offset) + replacement + value.slice(offset + length);
      const cursor = offset + replacement.length;

      element.value = nextValue;
      element.setSelectionRange(cursor, cursor);
      element.focus();
      element.dispatchEvent(new Event("input", { bubbles: true }));
    },
    getMatchRects: (match) => getInputMatchRects(element, match),
    getMatchText: (match) => element.value.slice(match.offset, match.offset + match.length),
  };
}

function createContentEditableAdapter(element: HTMLElement): FieldAdapter {
  return {
    element,
    kind: "contenteditable",
    getText: () => collectTextSegments(element).text,
    applyReplacement: (offset, length, replacement) => {
      const range = createDomRange(element, offset, length);
      if (!range) return;

      const selection = window.getSelection();
      selection?.removeAllRanges();
      selection?.addRange(range);

      if (!document.execCommand("insertText", false, replacement)) {
        range.deleteContents();
        range.insertNode(document.createTextNode(replacement));
      }

      element.dispatchEvent(new Event("input", { bubbles: true }));
    },
    getMatchRects: (match) => {
      const range = createDomRange(element, match.offset, match.length);
      if (!range) return [];
      return Array.from(range.getClientRects());
    },
    getMatchText: (match) => collectTextSegments(element).text.slice(match.offset, match.offset + match.length),
  };
}

function collectTextSegments(root: HTMLElement): { text: string; segments: TextSegment[] } {
  const segments: TextSegment[] = [];
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let text = "";
  let node = walker.nextNode() as Text | null;

  while (node) {
    const content = node.textContent ?? "";
    if (content.length > 0) {
      segments.push({ node, start: text.length, end: text.length + content.length });
      text += content;
    }
    node = walker.nextNode() as Text | null;
  }

  return { text, segments };
}

function resolveTextPosition(
  segments: TextSegment[],
  offset: number,
): { node: Text; nodeOffset: number } | null {
  for (const segment of segments) {
    if (offset >= segment.start && offset <= segment.end) {
      return { node: segment.node, nodeOffset: offset - segment.start };
    }
  }

  const last = segments.at(-1);
  if (!last) return null;
  return { node: last.node, nodeOffset: last.node.textContent?.length ?? 0 };
}

function createDomRange(root: HTMLElement, offset: number, length: number): Range | null {
  const { segments } = collectTextSegments(root);
  const start = resolveTextPosition(segments, offset);
  const end = resolveTextPosition(segments, offset + length);

  if (!start || !end) return null;

  const range = document.createRange();
  range.setStart(start.node, start.nodeOffset);
  range.setEnd(end.node, end.nodeOffset);
  return range;
}

function getInputMatchRects(element: HTMLInputElement | HTMLTextAreaElement, match: GrammarMatch): DOMRect[] {
  const mirror = document.createElement("div");
  mirror.textContent = element.value || " ";

  const style = window.getComputedStyle(element);
  const rect = element.getBoundingClientRect();

  Object.assign(mirror.style, {
    position: "fixed",
    top: `${rect.top}px`,
    left: `${rect.left}px`,
    width: `${rect.width}px`,
    height: `${rect.height}px`,
    font: style.font,
    letterSpacing: style.letterSpacing,
    lineHeight: style.lineHeight,
    padding: style.padding,
    border: style.border,
    boxSizing: style.boxSizing,
    whiteSpace: element instanceof HTMLTextAreaElement ? "pre-wrap" : "pre",
    wordWrap: "break-word",
    overflow: "hidden",
    visibility: "hidden",
    pointerEvents: "none",
    zIndex: "-1",
  });

  document.body.appendChild(mirror);

  const range = document.createRange();
  const textNode = mirror.firstChild;

  if (!textNode || textNode.nodeType !== Node.TEXT_NODE) {
    mirror.remove();
    return [];
  }

  const end = Math.min(match.offset + match.length, textNode.textContent?.length ?? 0);
  range.setStart(textNode, match.offset);
  range.setEnd(textNode, end);

  const rects = Array.from(range.getClientRects());
  mirror.remove();
  return rects;
}
