export interface Replacement {
  value: string;
}

export interface MatchCategory {
  id: string;
  name: string;
}

export interface MatchRule {
  id: string;
  description: string;
  category: MatchCategory;
}

export interface GrammarMatch {
  message: string;
  shortMessage: string;
  offset: number;
  length: number;
  replacements: Replacement[];
  rule: MatchRule;
}

export interface CheckResult {
  matches: GrammarMatch[];
}

export interface CheckRequest {
  text: string;
  language: string;
}

export interface CheckResponse {
  ok: boolean;
  matches?: GrammarMatch[];
  error?: string;
}

export interface PanelMatchItem {
  offset: number;
  length: number;
  message: string;
  snippet: string;
  suggestion: string;
  ruleId: string;
  ruleDescription: string;
  categoryId: string;
  categoryName: string;
}

export interface PanelState {
  tabId: number;
  hostname: string;
  matchCount: number;
  textPreview: string;
  matches: PanelMatchItem[];
  updatedAt: number;
}

export interface Settings {
  enabled: boolean;
  language: string;
  debounceMs: number;
  disabledSites: string[];
  personalDictionary: string[];
  ignoredRules: string[];
  apiUrl: string;
}

export const DEFAULT_SETTINGS: Settings = {
  enabled: true,
  language: "es",
  debounceMs: 700,
  disabledSites: [],
  personalDictionary: [],
  ignoredRules: [],
  apiUrl: "",
};
