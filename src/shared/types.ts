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
  language?: {
    code?: string;
    name?: string;
    detectedLanguage?: {
      code?: string;
      name?: string;
      confidence?: number;
    };
  };
}

export interface CheckRequest {
  text: string;
  /** Wider sample for language detection (full field text). */
  contextText?: string;
  /** Last reliable language detected in this field. */
  stickyLanguage?: string | null;
}

export interface CheckResponse {
  ok: boolean;
  matches?: GrammarMatch[];
  detectedLanguage?: {
    code: string;
    name: string;
    confidence?: number;
  };
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

import { AUTO_LANGUAGE } from "./language";

export interface Settings {
  enabled: boolean;
  /** `auto` = detect language from text; or a fixed LanguageTool code. */
  language: string;
  debounceMs: number;
  disabledSites: string[];
  personalDictionary: string[];
  ignoredRules: string[];
  apiUrl: string;
  theme: "system" | "light" | "dark";
  /** LanguageTool detection level — picky finds more style/punctuation issues. */
  checkLevel: "default" | "picky";
}

export const DEFAULT_SETTINGS: Settings = {
  enabled: true,
  language: AUTO_LANGUAGE,
  debounceMs: 700,
  disabledSites: [],
  personalDictionary: [],
  ignoredRules: [],
  apiUrl: "",
  theme: "system",
  checkLevel: "picky",
};
