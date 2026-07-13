import { getFirstApplicableMatch } from "../shared/match-filters";
import type { GrammarMatch } from "../shared/types";
import type { OverlayManager } from "./overlay";
import type { FieldAdapter } from "./field-adapter";

interface ShortcutContext {
  getActiveAdapter: () => FieldAdapter | null;
  getOverlay: () => OverlayManager;
  applyMatch: (match: GrammarMatch, replacement: string) => void;
  applyRawMatch: (offset: number, length: number, replacement: string) => void;
  highlightMatch: (offset: number, length: number) => void;
}

export function registerShortcuts(context: ShortcutContext): void {
  document.addEventListener(
    "keydown",
    (event) => {
      const isShortcut = (event.ctrlKey || event.metaKey) && event.key === ".";
      if (!isShortcut) return;

      const adapter = context.getActiveAdapter();
      if (!adapter) return;

      const match = getFirstApplicableMatch(context.getOverlay().getMatches());
      if (!match) return;

      const replacement = match.replacements[0]?.value;
      if (!replacement) return;

      event.preventDefault();
      event.stopPropagation();
      context.applyMatch(match, replacement);
    },
    true,
  );

  chrome.runtime.onMessage.addListener((message) => {
    if (message.type === "APPLY_FIRST_SUGGESTION") {
      const adapter = context.getActiveAdapter();
      if (!adapter) return;

      const match = getFirstApplicableMatch(context.getOverlay().getMatches());
      if (!match?.replacements[0]?.value) return;

      context.applyMatch(match, match.replacements[0].value);
      return;
    }

    if (message.type === "APPLY_MATCH") {
      const adapter = context.getActiveAdapter();
      if (!adapter) return;

      const { offset, length, replacement } = message.payload as {
        offset: number;
        length: number;
        replacement: string;
      };

      if (typeof offset !== "number" || typeof length !== "number" || !replacement) return;

      context.applyRawMatch(offset, length, replacement);
      return;
    }

    if (message.type === "HIGHLIGHT_MATCH") {
      const { offset, length } = message.payload as { offset: number; length: number };
      if (typeof offset !== "number" || typeof length !== "number") return;

      context.highlightMatch(offset, length);
    }
  });
}
