import type { GrammarMatch } from "./types";

export function matchOccurrenceKey(match: GrammarMatch): string {
  return `${match.offset}:${match.length}:${match.rule.id}`;
}

export function filterMatches(
  matches: GrammarMatch[],
  text: string,
  options: {
    personalDictionary: string[];
    ignoredRules: string[];
    ignoredOccurrences: Set<string>;
  },
): GrammarMatch[] {
  const dictionary = new Set(options.personalDictionary.map((word) => word.toLowerCase()));
  const ignoredRules = new Set(options.ignoredRules);

  return matches.filter((match) => {
    if (ignoredRules.has(match.rule.id)) return false;
    if (options.ignoredOccurrences.has(matchOccurrenceKey(match))) return false;

    const word = text.slice(match.offset, match.offset + match.length).toLowerCase();
    if (dictionary.has(word)) return false;

    return true;
  });
}

export function getFirstApplicableMatch(matches: GrammarMatch[]): GrammarMatch | null {
  return matches.find((match) => match.replacements.length > 0) ?? matches[0] ?? null;
}
