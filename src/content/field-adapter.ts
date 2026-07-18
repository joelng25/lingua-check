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

const INPUT_SELECTOR =
  "input[type='text'], input[type='search'], input[type='email'], input[type='url'], input:not([type]), textarea";
const CONTENTEDITABLE_SELECTOR =
  "[contenteditable='true'], [contenteditable=''], [contenteditable='plaintext-only']";

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
    !element.parentElement?.closest(CONTENTEDITABLE_SELECTOR)
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

      element.focus();
      element.value = nextValue;
      element.setSelectionRange(cursor, cursor);
      element.dispatchEvent(new Event("input", { bubbles: true }));
      element.dispatchEvent(new Event("change", { bubbles: true }));
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
      applyContentEditableReplacement(element, offset, length, replacement);
    },
    getMatchRects: (match) => {
      const range = createDomRange(element, match.offset, match.length);
      if (!range) return [];
      return Array.from(range.getClientRects());
    },
    getMatchText: (match) =>
      collectTextSegments(element).text.slice(match.offset, match.offset + match.length),
  };
}

/**
 * Replaces text at an exact offset. Avoids execCommand('insertText'), which in
 * Gmail often inserts at the caret instead of the selected range.
 */
function applyContentEditableReplacement(
  element: HTMLElement,
  offset: number,
  length: number,
  replacement: string,
): void {
  element.focus();

  const { text, segments } = collectTextSegments(element);
  const expected = text.slice(offset, offset + length);

  let range = createDomRangeFromSegments(segments, offset, length);

  if (range && expected && range.toString() !== expected) {
    range = findRangeByText(segments, expected, offset) ?? range;
  }

  if (!range && expected) {
    range = findRangeByText(segments, expected, offset);
  }

  if (!range) return;

  const selection = window.getSelection();
  selection?.removeAllRanges();
  selection?.addRange(range);

  // Prefer direct DOM mutation so Gmail cannot ignore our selection.
  range.deleteContents();
  const node = document.createTextNode(replacement);
  range.insertNode(node);

  // Normalize adjacent text nodes and place caret after the replacement.
  node.parentNode?.normalize();
  const after = document.createRange();
  after.setStart(node, node.data.length);
  after.collapse(true);
  selection?.removeAllRanges();
  selection?.addRange(after);

  element.dispatchEvent(
    new InputEvent("input", {
      bubbles: true,
      cancelable: true,
      inputType: "insertReplacementText",
      data: replacement,
    }),
  );
}

function collectTextSegments(root: HTMLElement): { text: string; segments: TextSegment[] } {
  const segments: TextSegment[] = [];
  let text = "";

  const walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT);

  let node = walker.nextNode();
  while (node) {
    if (node.nodeType === Node.TEXT_NODE) {
      const content = node.textContent ?? "";
      if (content.length > 0) {
        segments.push({
          node: node as Text,
          start: text.length,
          end: text.length + content.length,
        });
        text += content;
      }
    } else if (node instanceof HTMLElement) {
      const tag = node.tagName;
      if (tag === "BR") {
        text += "\n";
      } else if (
        (tag === "DIV" || tag === "P" || tag === "LI" || tag === "BLOCKQUOTE") &&
        text.length > 0 &&
        !text.endsWith("\n") &&
        node !== root
      ) {
        // Block boundaries in Gmail-like editors act as newlines.
        const previous = node.previousSibling;
        if (previous) {
          text += "\n";
        }
      }
    }

    node = walker.nextNode();
  }

  return { text, segments };
}

function resolveTextPosition(
  segments: TextSegment[],
  offset: number,
): { node: Text; nodeOffset: number } | null {
  if (segments.length === 0) return null;

  for (const segment of segments) {
    if (offset >= segment.start && offset < segment.end) {
      return { node: segment.node, nodeOffset: offset - segment.start };
    }
    if (offset === segment.end) {
      return { node: segment.node, nodeOffset: segment.node.textContent?.length ?? 0 };
    }
  }

  if (offset <= segments[0].start) {
    return { node: segments[0].node, nodeOffset: 0 };
  }

  const last = segments[segments.length - 1];
  return { node: last.node, nodeOffset: last.node.textContent?.length ?? 0 };
}

function createDomRangeFromSegments(
  segments: TextSegment[],
  offset: number,
  length: number,
): Range | null {
  const start = resolveTextPosition(segments, offset);
  const end = resolveTextPosition(segments, offset + length);
  if (!start || !end) return null;

  try {
    const range = document.createRange();
    range.setStart(start.node, start.nodeOffset);
    range.setEnd(end.node, end.nodeOffset);
    return range;
  } catch {
    return null;
  }
}

function createDomRange(root: HTMLElement, offset: number, length: number): Range | null {
  const { segments } = collectTextSegments(root);
  return createDomRangeFromSegments(segments, offset, length);
}

function findRangeByText(
  segments: TextSegment[],
  needle: string,
  preferredOffset: number,
): Range | null {
  if (!needle || segments.length === 0) return null;

  const fullText = segments.map((segment) => segment.node.textContent ?? "").join("");
  const occurrences: number[] = [];
  let from = 0;

  while (from <= fullText.length) {
    const index = fullText.indexOf(needle, from);
    if (index === -1) break;
    occurrences.push(index);
    from = index + 1;
  }

  if (occurrences.length === 0) return null;

  let best = occurrences[0];
  let bestDistance = Math.abs(best - preferredOffset);
  for (const index of occurrences) {
    const distance = Math.abs(index - preferredOffset);
    if (distance < bestDistance) {
      best = index;
      bestDistance = distance;
    }
  }

  return createDomRangeFromSegments(segments, best, needle.length);
}

function getInputMatchRects(
  element: HTMLInputElement | HTMLTextAreaElement,
  match: GrammarMatch,
): DOMRect[] {
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
