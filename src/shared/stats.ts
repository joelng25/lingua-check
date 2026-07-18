export interface Stats {
  correctionsTotal: number;
  correctionsThisWeek: number;
  weekStartedAt: string;
  byCategory: Record<string, number>;
}

export const DEFAULT_STATS: Stats = {
  correctionsTotal: 0,
  correctionsThisWeek: 0,
  weekStartedAt: startOfWeekIso(),
  byCategory: {},
};

function startOfWeekIso(): string {
  const now = new Date();
  const day = now.getDay();
  const diff = day === 0 ? 6 : day - 1;
  const monday = new Date(now);
  monday.setHours(0, 0, 0, 0);
  monday.setDate(now.getDate() - diff);
  return monday.toISOString().slice(0, 10);
}

export async function getStats(): Promise<Stats> {
  const stored = await chrome.storage.local.get({ stats: DEFAULT_STATS });
  const stats = { ...DEFAULT_STATS, ...(stored.stats as Stats) };
  const week = startOfWeekIso();

  if (stats.weekStartedAt !== week) {
    stats.weekStartedAt = week;
    stats.correctionsThisWeek = 0;
    await chrome.storage.local.set({ stats });
  }

  return stats;
}

export async function recordCorrection(categoryId = "UNKNOWN"): Promise<Stats> {
  const stats = await getStats();
  stats.correctionsTotal += 1;
  stats.correctionsThisWeek += 1;
  stats.byCategory[categoryId] = (stats.byCategory[categoryId] ?? 0) + 1;
  await chrome.storage.local.set({ stats });
  return stats;
}

export async function resetStats(): Promise<Stats> {
  const stats = { ...DEFAULT_STATS, weekStartedAt: startOfWeekIso() };
  await chrome.storage.local.set({ stats });
  return stats;
}
