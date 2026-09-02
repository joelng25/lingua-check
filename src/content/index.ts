import { matchOccurrenceKey } from "../shared/match-filters";
import { toPanelMatchItems } from "../shared/panel-state";
import { getSettings, isSiteDisabled } from "../shared/storage";
import type { GrammarMatch, Settings } from "../shared/types";
import { createFieldAdapter, getFieldSelection, type FieldAdapter } from "./field-adapter";
import { OverlayManager } from "./overlay";
import { registerShortcuts } from "./shortcuts";
import { setNativeSpellcheckSuppressed, suppressElementSpellcheck } from "./suppress-native-spellcheck";
import {
  getActiveSiteAdapter,
  getSiteAdapter,
  getSiteEditableFields,
  resolveSiteField,
} from "./sites/registry";

const overlay = new OverlayManager();
const debounceTimers = new WeakMap<FieldAdapter, number>();
const activeFields = new Map<HTMLElement, FieldAdapter>();
const ignoredOccurrences = new Set<string>();
const fieldLanguages = new WeakMap<FieldAdapter, string>();

let settingsCache: Settings = {
  enabled: true,
  language: "auto",
  debounceMs: 700,
  disabledSites: [],
  personalDictionary: [],
  ignoredRules: [],
  apiUrl: "",
  theme: "system",
  checkLevel: "picky",
};
let enabled = true;
let activeAdapter: FieldAdapter | null = null;
let siteAdapter = getSiteAdapter();

async function bootstrap(): Promise<void> {
  settingsCache = await getSettings();
  siteAdapter = getSiteAdapter();
  enabled = settingsCache.enabled && !isSiteDisabled(location.hostname, settingsCache.disabledSites);
  setNativeSpellcheckSuppressed(enabled);
  scanForFields();
}

void bootstrap();

function applyMatch(match: GrammarMatch, replacement: string): void {
  if (!activeAdapter) return;
  activeAdapter.applyReplacement(match.offset, match.length, replacement);
  void chrome.runtime.sendMessage({
    type: "RECORD_CORRECTION",
    payload: { categoryId: match.rule.category?.id ?? "UNKNOWN" },
  });
  void checkField(activeAdapter);
}

function applyRawMatch(offset: number, length: number, replacement: string): void {
  if (!activeAdapter) return;
  const match = overlay.getMatches().find((item) => item.offset === offset && item.length === length);
  activeAdapter.applyReplacement(offset, length, replacement);
  void chrome.runtime.sendMessage({
    type: "RECORD_CORRECTION",
    payload: { categoryId: match?.rule.category?.id ?? "UNKNOWN" },
  });
  void checkField(activeAdapter);
}

overlay.setApplyHandler(applyMatch);

overlay.setDictionaryHandler((match, word) => {
  void (async () => {
    try {
      await chrome.runtime.sendMessage({
        type: "ADD_TO_DICTIONARY",
        payload: { word },
      });

      settingsCache.personalDictionary = Array.from(
        new Set([...settingsCache.personalDictionary, word.trim()]),
      );

      if (activeAdapter) {
        void checkField(activeAdapter);
      }
    } catch {
      // Extension context may be invalidated during reload.
    }
  })();

  void match;
});

overlay.setIgnoreOccurrenceHandler((match) => {
  ignoredOccurrences.add(matchOccurrenceKey(match));
  if (activeAdapter) {
    void checkField(activeAdapter);
  }
});

overlay.setIgnoreRuleHandler((match) => {
  void (async () => {
    try {
      await chrome.runtime.sendMessage({
        type: "IGNORE_RULE",
        payload: { ruleId: match.rule.id },
      });

      settingsCache.ignoredRules = Array.from(
        new Set([...settingsCache.ignoredRules, match.rule.id]),
      );

      if (activeAdapter) {
        void checkField(activeAdapter);
      }
    } catch {
      // Extension context may be invalidated during reload.
    }
  })();
});

registerShortcuts({
  getActiveAdapter: () => activeAdapter,
  getOverlay: () => overlay,
  applyMatch,
  applyRawMatch,
  highlightMatch: (offset, length) => overlay.highlightMatch(offset, length),
});

let selectionTimer: number | null = null;

function handleTextSelection(): void {
  if (!enabled || !activeAdapter) return;
  if (overlay.getMatches().length === 0) return;

  const selection = getFieldSelection(activeAdapter);
  if (!selection) {
    if (!overlay.isTooltipOpen()) return;
    overlay.closeTooltip();
    return;
  }

  overlay.showTooltipForSelection(selection.offset, selection.length, selection.rect);
}

document.addEventListener("selectionchange", () => {
  if (!enabled || !activeAdapter) return;
  if (selectionTimer !== null) window.clearTimeout(selectionTimer);
  selectionTimer = window.setTimeout(() => {
    selectionTimer = null;
    handleTextSelection();
  }, 60);
});

document.addEventListener(
  "mouseup",
  () => {
    if (!enabled || !activeAdapter) return;
    window.setTimeout(handleTextSelection, 0);
  },
  true,
);

document.addEventListener(
  "dblclick",
  () => {
    if (!enabled || !activeAdapter) return;
    window.setTimeout(handleTextSelection, 0);
  },
  true,
);

chrome.storage.onChanged.addListener(async () => {
  settingsCache = await getSettings();
  enabled = settingsCache.enabled && !isSiteDisabled(location.hostname, settingsCache.disabledSites);
  setNativeSpellcheckSuppressed(enabled);

  if (!enabled) {
    overlay.clear();
    updateBadge(0);
    for (const [element] of activeFields) {
      detachField(element);
    }
    activeFields.clear();
    activeAdapter = null;
    return;
  }

  for (const adapter of activeFields.values()) {
    void checkField(adapter);
  }
});

function isFieldFocused(adapter: FieldAdapter): boolean {
  if (adapter.kind === "googledocs") {
    return activeAdapter?.element === adapter.element;
  }

  const active = document.activeElement;
  if (!active) return false;
  return active === adapter.element || adapter.element.contains(active);
}

function getAdapterForElement(element: HTMLElement): FieldAdapter | null {
  if (activeFields.has(element)) {
    return activeFields.get(element) ?? null;
  }

  const adapter =
    siteAdapter.createAdapter?.(element) ?? createFieldAdapter(element);

  if (!adapter) return null;

  activeFields.set(element, adapter);
  return adapter;
}

function attachField(element: HTMLElement): FieldAdapter | null {
  const adapter = getAdapterForElement(element);
  if (!adapter) return null;

  suppressElementSpellcheck(element);

  const handlersKey = "__lcHandlers";
  if ((element as HTMLElement & { __lcHandlers?: object })[handlersKey]) {
    return adapter;
  }

  const onInput = () => scheduleCheck(adapter);
  const onFocus = () => {
    activeAdapter = adapter;
    scheduleCheck(adapter);
  };
  const onBlur = () => {
    if (adapter.kind === "googledocs") return;

    window.setTimeout(() => {
      if (!isFieldFocused(adapter)) {
        overlay.clear();
        updateBadge(0);
        syncPanel("", []);
        if (activeAdapter?.element === adapter.element) {
          activeAdapter = null;
        }
      }
    }, 150);
  };

  const handlers: Record<string, EventListener | MutationObserver> = {
    onInput,
    onFocus,
    onBlur,
  };

  if (adapter.kind === "googledocs") {
    activeAdapter = adapter;

    let docsMutationTimer: number | null = null;
    const docsObserver = new MutationObserver(() => {
      if (docsMutationTimer !== null) window.clearTimeout(docsMutationTimer);
      docsMutationTimer = window.setTimeout(() => {
        docsMutationTimer = null;
        scheduleCheck(adapter);
      }, settingsCache.debounceMs);
    });
    docsObserver.observe(element, {
      childList: true,
      subtree: true,
      characterData: true,
    });
    handlers.docsObserver = docsObserver;

    element.addEventListener("focus", onFocus, true);
    scheduleCheck(adapter);
  } else {
    element.addEventListener("input", onInput);
    element.addEventListener("focus", onFocus, true);
    element.addEventListener("blur", onBlur, true);
  }

  (element as HTMLElement & { __lcHandlers?: object })[handlersKey] = handlers;

  return adapter;
}

function detachField(element: HTMLElement): void {
  const handlers = (element as HTMLElement & { __lcHandlers?: Record<string, EventListener | MutationObserver> }).__lcHandlers;
  if (!handlers) return;

  if (handlers.onInput) element.removeEventListener("input", handlers.onInput as EventListener);
  if (handlers.onFocus) element.removeEventListener("focus", handlers.onFocus as EventListener, true);
  if (handlers.onBlur) element.removeEventListener("blur", handlers.onBlur as EventListener, true);
  if (handlers.docsObserver instanceof MutationObserver) handlers.docsObserver.disconnect();

  delete (element as HTMLElement & { __lcHandlers?: object }).__lcHandlers;
  activeFields.delete(element);
}

function scheduleCheck(adapter: FieldAdapter): void {
  const existing = debounceTimers.get(adapter);
  if (existing) window.clearTimeout(existing);

  const timer = window.setTimeout(() => {
    void checkField(adapter);
  }, settingsCache.debounceMs);

  debounceTimers.set(adapter, timer);
}

function updateBadge(count: number): void {
  try {
    void chrome.runtime.sendMessage({
      type: "UPDATE_BADGE",
      payload: { count },
    });
  } catch {
    // Extension context may be invalidated during reload.
  }
}

function syncPanel(text: string, matches: GrammarMatch[]): void {
  try {
    void chrome.runtime.sendMessage({
      type: "UPDATE_PANEL",
      payload: {
        hostname: location.hostname,
        textPreview: text.slice(0, 240),
        matchCount: matches.length,
        matches: toPanelMatchItems(text, matches),
      },
    });
  } catch {
    // Extension context may be invalidated during reload.
  }
}

async function checkField(adapter: FieldAdapter): Promise<void> {
  if (!enabled) return;

  const scope = adapter.getCheckScope();
  const fullText = adapter.getText();

  if (!scope.text.trim()) {
    overlay.clear();
    updateBadge(0);
    syncPanel("", []);
    return;
  }

  try {
    const response = await chrome.runtime.sendMessage({
      type: "CHECK_TEXT",
      payload: {
        text: scope.text,
        contextText: (fullText || scope.text).slice(0, 2500),
        stickyLanguage: fieldLanguages.get(adapter) ?? null,
      },
    });

    if (!response?.ok) return;

    const rawMatches = (response.matches ?? []) as GrammarMatch[];
    const matches = rawMatches
      .map((match) => ({
        ...match,
        offset: match.offset + scope.baseOffset,
      }))
      .filter((match) => !ignoredOccurrences.has(matchOccurrenceKey(match)));

    if (response.detectedLanguage?.code) {
      fieldLanguages.set(adapter, response.detectedLanguage.code);
    }

    if (isFieldFocused(adapter)) {
      activeAdapter = adapter;
      overlay.render(adapter, matches);
      updateBadge(matches.length);
      syncPanel(fullText || scope.text, matches);
    }
  } catch {
    // Extension context may be invalidated during reload.
  }
}

function scanForFields(root: ParentNode = document): void {
  if (!enabled) return;

  for (const field of getSiteEditableFields(root)) {
    attachField(field);
  }
}

document.addEventListener(
  "focusin",
  (event) => {
    if (!enabled) return;
    const target = event.target;
    if (!(target instanceof Element)) return;

    const editable = resolveSiteField(target);
    if (editable) {
      suppressElementSpellcheck(editable);
      const adapter = attachField(editable);
      if (adapter) {
        activeAdapter = adapter;
        scheduleCheck(adapter);
      }
      return;
    }

    if (target instanceof HTMLElement && target.isContentEditable) {
      suppressElementSpellcheck(target);
    }
  },
  true,
);

let scanTimer: number | null = null;

function scheduleScanForFields(root: ParentNode = document): void {
  if (!enabled) return;
  if (scanTimer !== null) window.clearTimeout(scanTimer);
  scanTimer = window.setTimeout(() => {
    scanTimer = null;
    scanForFields(root);
  }, 300);
}

const observer = new MutationObserver((mutations) => {
  if (!enabled) return;

  for (const mutation of mutations) {
    for (const node of mutation.addedNodes) {
      if (node instanceof HTMLElement) {
        scheduleScanForFields(node);
        return;
      }
    }
  }
});

observer.observe(document.documentElement, { childList: true, subtree: true });

if (getActiveSiteAdapter().id === "google-docs") {
  // Docs annotates the canvas asynchronously after load; poll briefly, then stop.
  let docsAttempts = 0;
  const docsPoll = window.setInterval(() => {
    if (!enabled) {
      window.clearInterval(docsPoll);
      return;
    }

    scanForFields();
    if (activeAdapter) {
      void checkField(activeAdapter);
      if (activeAdapter.getText().trim() || docsAttempts >= 15) {
        window.clearInterval(docsPoll);
      }
    }

    docsAttempts += 1;
    if (docsAttempts >= 15) {
      window.clearInterval(docsPoll);
    }
  }, 2000);

  document.addEventListener(
    "keyup",
    () => {
      if (!enabled || !activeAdapter) return;
      scheduleCheck(activeAdapter);
    },
    true,
  );
}
