import type { GrammarMatch } from "../shared/types";
import type { FieldAdapter } from "./field-adapter";

interface DocsSegment {
  element: HTMLElement;
  start: number;
  end: number;
}

const EDITOR_SELECTOR = ".kix-appview-editor";

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
    applyReplacement: (offset, length, replacement) => {
      const range = createDocsRange(element, offset, length);
      if (!range) return;

      element.focus();
      const selection = window.getSelection();
      selection?.removeAllRanges();
      selection?.addRange(range);

      if (!document.execCommand("insertText", false, replacement)) {
        range.deleteContents();
        range.insertNode(document.createTextNode(replacement));
      }
    },
    getMatchRects: (match) => getDocsMatchRects(element, match),
    getMatchText: (match) => collectDocsSegments(element).text.slice(match.offset, match.offset + match.length),
  };
}

function collectDocsSegments(editor: HTMLElement): { text: string; segments: DocsSegment[] } {
  const segments: DocsSegment[] = [];
  const wordNodes = editor.querySelectorAll<HTMLElement>(".kix-wordhtmlgenerator-word-node");

  if (wordNodes.length > 0) {
    let text = "";

    for (const node of wordNodes) {
      const content = node.textContent ?? "";
      if (!content) continue;

      if (text.length > 0 && !text.endsWith("\n") && !text.endsWith(" ")) {
        text += " ";
      }

      segments.push({
        element: node,
        start: text.length,
        end: text.length + content.length,
      });
      text += content;
    }

    return { text, segments };
  }

  let text = "";
  const lineBlocks = editor.querySelectorAll<HTMLElement>(".kix-lineview-text-block");

  for (const block of lineBlocks) {
    const content = block.textContent ?? "";
    if (!content) continue;

    if (text.length > 0) {
      text += "\n";
    }

    segments.push({
      element: block,
      start: text.length,
      end: text.length + content.length,
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

function createDocsRange(editor: HTMLElement, offset: number, length: number): Range | null {
  const affected = getSegmentsForRange(editor, offset, length);
  if (affected.length === 0) return null;

  const range = document.createRange();
  range.setStartBefore(affected[0].element);
  range.setEndAfter(affected[affected.length - 1].element);
  return range;
}

function getDocsMatchRects(editor: HTMLElement, match: GrammarMatch): DOMRect[] {
  const affected = getSegmentsForRange(editor, match.offset, match.length);
  if (affected.length === 0) return [];

  return affected.flatMap((segment) => Array.from(segment.element.getClientRects()));
}
