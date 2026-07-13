import { getPanelStateForTab, PANEL_STATE_KEY } from "../shared/panel-state";
import type { PanelMatchItem, PanelState } from "../shared/types";

const metaEl = document.getElementById("meta")!;
const emptyEl = document.getElementById("empty")!;
const statsEl = document.getElementById("stats")!;
const matchesEl = document.getElementById("matches")!;

let activeTabId: number | null = null;

async function getActiveTabId(): Promise<number | null> {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab?.id ?? null;
}

function renderStats(matches: PanelMatchItem[]): void {
  const counts = new Map<string, { label: string; count: number }>();

  for (const match of matches) {
    const key = match.categoryId || "UNKNOWN";
    const current = counts.get(key) ?? { label: match.categoryName || "Otros", count: 0 };
    current.count += 1;
    counts.set(key, current);
  }

  statsEl.replaceChildren();

  if (counts.size === 0) {
    statsEl.hidden = true;
    return;
  }

  statsEl.hidden = false;

  for (const { label, count } of counts.values()) {
    const chip = document.createElement("span");
    chip.className = "stat-chip";
    chip.textContent = `${label}: ${count}`;
    statsEl.appendChild(chip);
  }
}

function render(state: PanelState | null): void {
  matchesEl.replaceChildren();

  if (!state || state.matchCount === 0) {
    emptyEl.hidden = false;
    statsEl.hidden = true;
    metaEl.textContent = state
      ? `${state.hostname} — sin errores en el campo activo`
      : "Escribe en un campo de texto para ver sugerencias.";
    return;
  }

  emptyEl.hidden = true;
  metaEl.textContent = `${state.hostname} — ${state.matchCount} error${state.matchCount === 1 ? "" : "es"}`;
  renderStats(state.matches);

  for (const match of state.matches) {
    matchesEl.appendChild(createMatchCard(match));
  }
}

function highlightMatch(match: PanelMatchItem): void {
  if (activeTabId === null) return;

  void chrome.tabs.sendMessage(activeTabId, {
    type: "HIGHLIGHT_MATCH",
    payload: {
      offset: match.offset,
      length: match.length,
    },
  });
}

function createMatchCard(match: PanelMatchItem): HTMLLIElement {
  const item = document.createElement("li");
  item.className = "match-card";
  item.tabIndex = 0;

  item.addEventListener("click", () => highlightMatch(match));
  item.addEventListener("keydown", (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      highlightMatch(match);
    }
  });

  const snippet = document.createElement("p");
  snippet.className = "match-snippet";
  snippet.textContent = `“${match.snippet}”`;
  item.appendChild(snippet);

  const message = document.createElement("p");
  message.className = "match-message";
  message.textContent = match.message;
  item.appendChild(message);

  const rule = document.createElement("p");
  rule.className = "match-rule";
  rule.textContent = `${match.categoryName} — ${match.ruleDescription || match.ruleId}`;
  item.appendChild(rule);

  const actions = document.createElement("div");
  actions.className = "match-actions";

  const highlightButton = document.createElement("button");
  highlightButton.type = "button";
  highlightButton.className = "highlight";
  highlightButton.textContent = "Ver en texto";
  highlightButton.addEventListener("click", (event) => {
    event.stopPropagation();
    highlightMatch(match);
  });
  actions.appendChild(highlightButton);

  const applyButton = document.createElement("button");
  applyButton.type = "button";
  applyButton.className = "apply";
  applyButton.textContent = match.suggestion ? `Aplicar: ${match.suggestion}` : "Sin sugerencia";
  applyButton.disabled = !match.suggestion;
  applyButton.addEventListener("click", (event) => {
    event.stopPropagation();
    if (!match.suggestion || activeTabId === null) return;

    void chrome.tabs.sendMessage(activeTabId, {
      type: "APPLY_MATCH",
      payload: {
        offset: match.offset,
        length: match.length,
        replacement: match.suggestion,
      },
    });
  });
  actions.appendChild(applyButton);

  item.appendChild(actions);
  return item;
}

async function refresh(): Promise<void> {
  activeTabId = await getActiveTabId();
  if (activeTabId === null) {
    render(null);
    return;
  }

  const state = await getPanelStateForTab(activeTabId);
  render(state);
}

chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName !== "session" || !changes[PANEL_STATE_KEY]) return;
  void refresh();
});

chrome.tabs.onActivated.addListener(() => {
  void refresh();
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
  if (changeInfo.status === "complete" && tabId === activeTabId) {
    void refresh();
  }
});

void refresh();
