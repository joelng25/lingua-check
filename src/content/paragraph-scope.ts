export interface CheckScope {
  text: string;
  baseOffset: number;
}

const FULL_TEXT_THRESHOLD = 500;
const PARAGRAPH_MAX = 2500;

export function getInputCheckScope(
  element: HTMLInputElement | HTMLTextAreaElement,
): CheckScope {
  const value = element.value;
  if (value.length <= FULL_TEXT_THRESHOLD) {
    return { text: value, baseOffset: 0 };
  }

  const cursor = element.selectionStart ?? value.length;
  return extractParagraphScope(value, cursor);
}

export function getContentEditableCheckScope(element: HTMLElement): CheckScope {
  const full = getPlainText(element);
  if (full.length <= FULL_TEXT_THRESHOLD) {
    return { text: full, baseOffset: 0 };
  }

  const selection = window.getSelection();
  const anchor = selection?.anchorNode;
  if (!anchor || !element.contains(anchor)) {
    return extractParagraphScope(full, Math.min(full.length, 400));
  }

  const block = findBlockElement(anchor, element);
  if (!block || block === element) {
    const cursor = estimateCursorOffset(element, full);
    return extractParagraphScope(full, cursor);
  }

  const blockText = getPlainText(block).slice(0, PARAGRAPH_MAX);
  if (!blockText.trim()) {
    return extractParagraphScope(full, estimateCursorOffset(element, full));
  }

  const baseOffset = findBlockBaseOffset(element, block);
  return {
    text: blockText,
    baseOffset: Math.max(0, baseOffset),
  };
}

export function extractParagraphScope(text: string, cursor: number): CheckScope {
  const clamped = Math.max(0, Math.min(cursor, text.length));

  let start = 0;
  for (let i = clamped - 1; i >= 0; i -= 1) {
    if (text[i] === "\n") {
      start = i + 1;
      break;
    }
  }

  let end = text.length;
  for (let i = clamped; i < text.length; i += 1) {
    if (text[i] === "\n") {
      end = i;
      break;
    }
  }

  if (end - start < 40) {
    start = Math.max(0, start - 120);
    end = Math.min(text.length, end + 120);
  }

  return {
    text: text.slice(start, Math.min(end, start + PARAGRAPH_MAX)),
    baseOffset: start,
  };
}

export function getPlainText(root: HTMLElement): string {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT);
  let text = "";
  let node = walker.nextNode();

  while (node) {
    if (node.nodeType === Node.TEXT_NODE) {
      text += node.textContent ?? "";
    } else if (node instanceof HTMLElement) {
      if (node.tagName === "BR") {
        text += "\n";
      } else if (
        (node.tagName === "DIV" || node.tagName === "P" || node.tagName === "LI") &&
        node !== root &&
        node.previousSibling &&
        text.length > 0 &&
        !text.endsWith("\n")
      ) {
        text += "\n";
      }
    }
    node = walker.nextNode();
  }

  return text;
}

function findBlockElement(node: Node, root: HTMLElement): HTMLElement | null {
  let current: Node | null = node.nodeType === Node.ELEMENT_NODE ? node : node.parentElement;

  while (current && current !== root) {
    if (current instanceof HTMLElement) {
      const tag = current.tagName;
      if (tag === "DIV" || tag === "P" || tag === "LI" || tag === "BLOCKQUOTE") {
        return current;
      }
    }
    current = current.parentElement;
  }

  return root;
}

function estimateCursorOffset(element: HTMLElement, fullText: string): number {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) {
    return Math.min(fullText.length, 400);
  }

  try {
    const range = selection.getRangeAt(0).cloneRange();
    range.selectNodeContents(element);
    range.setEnd(selection.anchorNode ?? element, selection.anchorOffset);
    return Math.min(range.toString().length, fullText.length);
  } catch {
    return Math.min(fullText.length, 400);
  }
}

function findBlockBaseOffset(root: HTMLElement, block: HTMLElement): number {
  const firstText = document.createTreeWalker(block, NodeFilter.SHOW_TEXT).nextNode();
  if (!firstText) return 0;

  const walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT);
  let offset = 0;
  let node = walker.nextNode();

  while (node) {
    if (node === firstText) return offset;

    if (node.nodeType === Node.TEXT_NODE) {
      offset += node.textContent?.length ?? 0;
    } else if (node instanceof HTMLElement) {
      if (node.tagName === "BR") {
        offset += 1;
      } else if (
        (node.tagName === "DIV" || node.tagName === "P" || node.tagName === "LI") &&
        node !== root &&
        node.previousSibling &&
        offset > 0
      ) {
        offset += 1;
      }
    }

    node = walker.nextNode();
  }

  return 0;
}
