import { DEFAULT_API_URL, resolveApiUrl } from "./constants";
import type { CheckResult, GrammarMatch } from "./types";

export async function checkText(
  text: string,
  language: string,
  personalDictionary: string[] = [],
  ignoredRules: string[] = [],
  apiUrl: string = DEFAULT_API_URL,
): Promise<GrammarMatch[]> {
  if (!text.trim()) {
    return [];
  }

  const params = new URLSearchParams({
    text,
    language,
    enabledOnly: "false",
  });

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

  return data.matches.filter((match) => {
    if (rules.has(match.rule.id)) return false;

    const word = text.slice(match.offset, match.offset + match.length).toLowerCase();
    return !dictionary.has(word);
  });
}
