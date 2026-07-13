import { DEFAULT_SETTINGS, type Settings } from "./types";

export async function getSettings(): Promise<Settings> {
  const result = await chrome.storage.sync.get(DEFAULT_SETTINGS);
  return { ...DEFAULT_SETTINGS, ...result };
}

export async function saveSettings(partial: Partial<Settings>): Promise<void> {
  await chrome.storage.sync.set(partial);
}

export async function addToPersonalDictionary(word: string): Promise<string[]> {
  const settings = await getSettings();
  const normalized = word.trim();
  if (!normalized) return settings.personalDictionary;

  const personalDictionary = Array.from(
    new Set([...settings.personalDictionary, normalized]),
  );

  await saveSettings({ personalDictionary });
  return personalDictionary;
}

export async function addIgnoredRule(ruleId: string): Promise<string[]> {
  const settings = await getSettings();
  const normalized = ruleId.trim();
  if (!normalized) return settings.ignoredRules;

  const ignoredRules = Array.from(new Set([...settings.ignoredRules, normalized]));
  await saveSettings({ ignoredRules });
  return ignoredRules;
}

export async function removeIgnoredRule(ruleId: string): Promise<string[]> {
  const settings = await getSettings();
  const ignoredRules = settings.ignoredRules.filter((rule) => rule !== ruleId);
  await saveSettings({ ignoredRules });
  return ignoredRules;
}

export function isSiteDisabled(hostname: string, disabledSites: string[]): boolean {
  return disabledSites.some(
    (site) => hostname === site || hostname.endsWith(`.${site}`),
  );
}
