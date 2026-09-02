import { DEFAULT_API_URL, resolveApiUrl } from "./constants";
import {
  AUTO_LANGUAGE,
  extractDetectedLanguage,
  getPreferredVariants,
  hintToDetectedLanguage,
  resolveApiLanguage,
  type AutoLanguageResolution,
  type DetectedLanguage,
} from "./language";
import type { CheckResult, GrammarMatch, Settings } from "./types";

export interface CheckTextResult {
  matches: GrammarMatch[];
  detectedLanguage?: DetectedLanguage;
}

export interface CheckLanguageOptions {
  autoResolution?: AutoLanguageResolution;
}

export async function checkText(
  text: string,
  language: string,
  personalDictionary: string[] = [],
  ignoredRules: string[] = [],
  apiUrl: string = DEFAULT_API_URL,
  checkLevel: Settings["checkLevel"] = "picky",
  langOptions?: CheckLanguageOptions,
): Promise<CheckTextResult> {
  if (!text.trim()) {
    return { matches: [] };
  }

  const settingsLanguage = resolveApiLanguage(language);
  const resolution = langOptions?.autoResolution;
  const apiLanguage =
    settingsLanguage === AUTO_LANGUAGE && resolution
      ? resolution.language
      : settingsLanguage;

  const params = new URLSearchParams({
    text,
    language: apiLanguage,
    enabledOnly: "false",
    level: checkLevel === "picky" ? "picky" : "default",
  });

  if (apiLanguage === AUTO_LANGUAGE) {
    const variants =
      resolution?.preferredVariants ??
      getPreferredVariants();
    params.set("preferredVariants", variants);
  }

  const response = await fetch(resolveApiUrl(apiUrl), {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params.toString(),
  });

  if (!response.ok) {
    throw new Error(`LanguageTool API error: ${response.status}`);
  }

  const data = (await response.json()) as CheckResult;
  const dictionary = new Set(personalDictionary.map((word) => word.toLowerCase()));
  const rules = new Set(ignoredRules);

  const matches = data.matches.filter((match) => {
    if (rules.has(match.rule.id)) return false;

    const word = text.slice(match.offset, match.offset + match.length).toLowerCase();
    return !dictionary.has(word);
  });

  return {
    matches,
    detectedLanguage:
      extractDetectedLanguage(data) ??
      (resolution?.hint ? hintToDetectedLanguage(resolution.hint) : undefined),
  };
}
