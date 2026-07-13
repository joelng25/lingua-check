import type { GrammarMatch, PanelMatchItem, PanelState } from "./types";

export const PANEL_STATE_KEY = "panelStateByTab";

export function toPanelMatchItems(text: string, matches: GrammarMatch[]): PanelMatchItem[] {
  return matches.map((match) => ({
    offset: match.offset,
    length: match.length,
    message: match.message,
    snippet: text.slice(match.offset, match.offset + match.length),
    suggestion: match.replacements[0]?.value ?? "",
    ruleId: match.rule.id,
    ruleDescription: match.rule.description,
    categoryId: match.rule.category?.id ?? "UNKNOWN",
    categoryName: match.rule.category?.name ?? "Otros",
  }));
}

export function createPanelState(
  tabId: number,
  hostname: string,
  text: string,
  matches: GrammarMatch[],
): PanelState {
  return {
    tabId,
    hostname,
    matchCount: matches.length,
    textPreview: text.slice(0, 240),
    matches: toPanelMatchItems(text, matches),
    updatedAt: Date.now(),
  };
}

export async function getPanelStateForTab(tabId: number): Promise<PanelState | null> {
  const data = await chrome.storage.session.get(PANEL_STATE_KEY);
  const map = data[PANEL_STATE_KEY] as Record<number, PanelState> | undefined;
  return map?.[tabId] ?? null;
}

export async function setPanelStateForTab(tabId: number, state: PanelState): Promise<void> {
  const data = await chrome.storage.session.get(PANEL_STATE_KEY);
  const map = (data[PANEL_STATE_KEY] as Record<number, PanelState> | undefined) ?? {};
  map[tabId] = state;
  await chrome.storage.session.set({ [PANEL_STATE_KEY]: map });
}

export async function clearPanelStateForTab(tabId: number): Promise<void> {
  const data = await chrome.storage.session.get(PANEL_STATE_KEY);
  const map = (data[PANEL_STATE_KEY] as Record<number, PanelState> | undefined) ?? {};
  delete map[tabId];
  await chrome.storage.session.set({ [PANEL_STATE_KEY]: map });
}
