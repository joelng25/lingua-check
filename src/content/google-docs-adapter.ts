import type { GrammarMatch } from "../shared/types";
import type { FieldAdapter } from "./field-adapter";
import { extractParagraphScope, type CheckScope } from "./paragraph-scope";

interface DocsSegment {
  element: Element;
  start: number;
  end: number;
  text: string;
}

const EDITOR_SELECTOR = ".kix-appview-editor";
const CANVAS_RECT_SELECTOR =
  "div.kix-canvas-tile-content svg g rect[aria-label], div.kix-canvas-tile-content svg rect[aria-label]";
const HTML_WORD_SELECTOR = ".kix-wordhtmlgenerator-word-node, .kix-wordview";
const HTML_LINE_SELECTOR =
  ".kix-lineview-text-block, .kix-lineview-content, .kix-paragraphrenderer";

export function isGoogleDocsEditor(element: Element | null): element is HTMLElement {
  return element instanceof HTMLElement && element.matches(EDITOR_SELECTOR);
}

export function findGoogleDocsEditor(root: ParentNode = document): HTMLElement | null {
  const editor = root.querySelector(EDITOR_SELECTOR);
  return editor instanceof HTMLElement ? editor : null;
}

export function createGoogleDocsAdapter(element: HTMLElement): FieldAdapter {
  return {
    element,
    kind: "googledocs",
    getText: () => collectDocsSegments(element).text,
    getCheckScope: () => getDocsCheckScope(element),
    applyReplacement: (offset, length, replacement) => {
      applyDocsReplacement(element, offset, length, replacement);
    },
    getMatchRects: (match) => getDocsMatchRects(element, match),
    getMatchText: (match) =>
      collectDocsSegments(element).text.slice(match.offset, match.offset + match.length),
  };
}

function getDocsCheckScope(editor: HTMLElement): CheckScope {
  const full = collectDocsSegments(editor).text;
  if (!full.trim()) {
    return { text: "", baseOffset: 0 };
  }

  if (full.length <= 500) {
    return { text: full, baseOffset: 0 };
  }

  const selection = window.getSelection();
  let cursor = Math.min(400, full.length);

  if (selection?.anchorNode && editor.contains(selection.anchorNode)) {
    try {
      const range = selection.getRangeAt(0).cloneRange();
      range.selectNodeContents(editor);
      range.setEnd(selection.anchorNode, selection.anchorOffset);
      cursor = Math.min(range.toString().length, full.length);
    } catch {
      // keep default
    }
  }

  return extractParagraphScope(full, cursor);
}

function collectDocsSegments(editor: HTMLElement): { text: string; segments: DocsSegment[] } {
  const canvas = collectCanvasSegments(editor);
  if (canvas.segments.length > 0 && canvas.text.trim()) {
    return canvas;
  }

  const htmlWords = collectHtmlWordSegments(editor);
  if (htmlWords.segments.length > 0 && htmlWords.text.trim()) {
    return htmlWords;
  }

  return collectHtmlLineSegments(editor);
}

function collectCanvasSegments(editor: HTMLElement): { text: string; segments: DocsSegment[] } {
  const rects = editor.querySelectorAll(CANVAS_RECT_SELECTOR);
  const segments: DocsSegment[] = [];
  let text = "";

  for (const rect of rects) {
    const label = (rect.getAttribute("aria-label") || "").replace(/\u00a0/g, " ");
    if (!label) continue;

    if (text.length > 0) {
      text += "\n";
    }

    segments.push({
      element: rect,
      start: text.length,
      end: text.length + label.length,
      text: label,
    });
    text += label;
  }

  return { text, segments };
}

function collectHtmlWordSegments(editor: HTMLElement): { text: string; segments: DocsSegment[] } {
  const wordNodes = editor.querySelectorAll(HTML_WORD_SELECTOR);
  const segments: DocsSegment[] = [];
  let text = "";

  for (const node of wordNodes) {
    const content = (node.textContent ?? "").replace(/\u00a0/g, " ");
    if (!content) continue;

    if (text.length > 0 && !text.endsWith("\n") && !text.endsWith(" ")) {
      text += " ";
    }

    segments.push({
      element: node,
      start: text.length,
      end: text.length + content.length,
      text: content,
    });
    text += content;
  }

  return { text, segments };
}

function collectHtmlLineSegments(editor: HTMLElement): { text: string; segments: DocsSegment[] } {
  const lineBlocks = editor.querySelectorAll(HTML_LINE_SELECTOR);
  const segments: DocsSegment[] = [];
  let text = "";

  for (const block of lineBlocks) {
    const content = (block.textContent ?? "").replace(/\u00a0/g, " ");
    if (!content) continue;

    if (text.length > 0) {
      text += "\n";
    }

    segments.push({
      element: block,
      start: text.length,
      end: text.length + content.length,
      text: content,
    });
    text += content;
  }

  return { text, segments };
}

function getSegmentsForRange(
  editor: HTMLElement,
  offset: number,
  length: number,
): DocsSegment[] {
  const end = offset + length;
  const { segments } = collectDocsSegments(editor);
  return segments.filter((segment) => segment.end > offset && segment.start < end);
}

function getDocsMatchRects(editor: HTMLElement, match: GrammarMatch): DOMRect[] {
  const affected = getSegmentsForRange(editor, match.offset, match.length);
  if (affected.length === 0) return [];

  return affected.flatMap((segment) => {
    const localStart = Math.max(0, match.offset - segment.start);
    const localEnd = Math.min(segment.text.length, match.offset + match.length - segment.start);
    const full = segment.element.getBoundingClientRect();

    // Canvas lines: approximate underline within the line by character ratio.
    if (segment.element instanceof SVGRectElement || segment.element.closest("svg")) {
      if (segment.text.length === 0) return [full];
      const ratioStart = localStart / segment.text.length;
      const ratioEnd = localEnd / segment.text.length;
      const width = Math.max(4, full.width * (ratioEnd - ratioStart));
      const left = full.left + full.width * ratioStart;
      return [
        new DOMRect(left, full.bottom - Math.max(2, full.height * 0.12), width, Math.max(2, full.height * 0.12)),
      ];
    }

    return Array.from(segment.element.getClientRects());
  });
}

function applyDocsReplacement(
  editor: HTMLElement,
  offset: number,
  length: number,
  replacement: string,
): void {
  const affected = getSegmentsForRange(editor, offset, length);
  if (affected.length === 0) return;

  const segment = affected[0];
  const localStart = Math.max(0, offset - segment.start);
  const localEnd = Math.min(segment.text.length, offset + length - segment.start);
  const rect = segment.element.getBoundingClientRect();
  const len = Math.max(1, segment.text.length);
  const startRatio = localStart / len;
  const endRatio = localEnd / len;
  const clientX = rect.left + Math.min(rect.width - 2, Math.max(1, rect.width * startRatio));
  const endClientX = rect.left + Math.min(rect.width - 1, Math.max(clientX + 2, rect.width * endRatio));
  const clientY = rect.top + rect.height / 2;

  window.postMessage(
    {
      source: "lingua-check",
      type: "replace",
      clientX,
      endClientX,
      clientY,
      selectLength: length,
      replacement,
    },
    "*",
  );
}
