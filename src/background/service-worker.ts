import { checkText } from "../shared/checker";
import { DEFAULT_API_URL } from "../shared/constants";
import {
  clearPanelStateForTab,
  setPanelStateForTab,
} from "../shared/panel-state";
import { addIgnoredRule, addToPersonalDictionary, getSettings } from "../shared/storage";
import { recordCorrection } from "../shared/stats";
import type { CheckRequest, CheckResponse, PanelState } from "../shared/types";

const cache = new Map<string, CheckResponse>();
const tabCounts = new Map<number, number>();
const BADGE_COLOR = "#e53935";

function setTabBadge(tabId: number, count: number): void {
  tabCounts.set(tabId, count);
  void chrome.action.setBadgeText({
    tabId,
    text: count > 0 ? String(count) : "",
  });
  void chrome.action.setBadgeBackgroundColor({ tabId, color: BADGE_COLOR });
}

async function updatePanelState(tabId: number, payload: Omit<PanelState, "tabId" | "updatedAt">): Promise<void> {
  await setPanelStateForTab(tabId, {
    ...payload,
    tabId,
    updatedAt: Date.now(),
  });
}

chrome.runtime.onInstalled.addListener(() => {
  void chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: false });
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "CHECK_TEXT") {
    const request = message.payload as CheckRequest;

    void (async () => {
      try {
        const settings = await getSettings();
        const apiUrl = settings.apiUrl || DEFAULT_API_URL;
        const checkLevel = settings.checkLevel || "picky";
        const cacheKey = `${apiUrl}:${settings.language}:${checkLevel}:${request.text}`;

        if (cache.has(cacheKey)) {
          sendResponse(cache.get(cacheKey));
          return;
        }

        const matches = await checkText(
          request.text,
          settings.language,
          settings.personalDictionary,
          settings.ignoredRules,
          apiUrl,
          checkLevel,
        );

        const response: CheckResponse = { ok: true, matches };
        cache.set(cacheKey, response);

        if (cache.size > 100) {
          const firstKey = cache.keys().next().value;
          if (firstKey) cache.delete(firstKey);
        }

        sendResponse(response);
      } catch (error) {
        sendResponse({
          ok: false,
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    })();

    return true;
  }

  if (message.type === "UPDATE_BADGE") {
    const tabId = sender.tab?.id;
    const count = Number(message.payload?.count ?? 0);

    if (tabId !== undefined) {
      setTabBadge(tabId, count);
    }

    return false;
  }

  if (message.type === "UPDATE_PANEL") {
    const tabId = sender.tab?.id;
    if (tabId === undefined) return false;

    void (async () => {
      const payload = message.payload as {
        hostname: string;
        textPreview: string;
        matches: PanelState["matches"];
        matchCount: number;
      };

      if (payload.matchCount === 0) {
        await clearPanelStateForTab(tabId);
        return;
      }

      await updatePanelState(tabId, {
        hostname: payload.hostname,
        textPreview: payload.textPreview,
        matchCount: payload.matchCount,
        matches: payload.matches,
      });
    })();

    return false;
  }

  if (message.type === "ADD_TO_DICTIONARY") {
    const word = String(message.payload?.word ?? "");

    void (async () => {
      await addToPersonalDictionary(word);
      cache.clear();
      sendResponse({ ok: true });
    })();

    return true;
  }

  if (message.type === "IGNORE_RULE") {
    const ruleId = String(message.payload?.ruleId ?? "");

    void (async () => {
      await addIgnoredRule(ruleId);
      cache.clear();
      sendResponse({ ok: true });
    })();

    return true;
  }

  if (message.type === "RECORD_CORRECTION") {
    const categoryId = String(message.payload?.categoryId ?? "UNKNOWN");
    void recordCorrection(categoryId).then((stats) => sendResponse({ ok: true, stats }));
    return true;
  }

  if (message.type === "TEST_API") {
    const apiUrl = String(message.payload?.apiUrl ?? "");
    void (async () => {
      try {
        const settings = await getSettings();
        const url = apiUrl || settings.apiUrl || DEFAULT_API_URL;
        await checkText("prueba", settings.language || "es", [], [], url);
        sendResponse({ ok: true });
      } catch (error) {
        sendResponse({
          ok: false,
          error: error instanceof Error ? error.message : "Error de conexión",
        });
      }
    })();
    return true;
  }

  return false;
});

chrome.commands.onCommand.addListener((command) => {
  if (command !== "apply-first-suggestion") return;

  void chrome.tabs.query({ active: true, currentWindow: true }).then(([tab]) => {
    if (!tab?.id) return;
    void chrome.tabs.sendMessage(tab.id, { type: "APPLY_FIRST_SUGGESTION" });
  });
});

chrome.storage.onChanged.addListener(() => {
  cache.clear();
});

chrome.tabs.onActivated.addListener(({ tabId }) => {
  const count = tabCounts.get(tabId) ?? 0;
  setTabBadge(tabId, count);
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
  if (changeInfo.status === "loading") {
    tabCounts.delete(tabId);
    void chrome.action.setBadgeText({ tabId, text: "" });
    void clearPanelStateForTab(tabId);
  }
});
