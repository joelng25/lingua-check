import { DEFAULT_API_URL, resolveApiUrl } from "../shared/constants";
import { getCategoryInfo } from "../shared/categories";
import { getSettings, removeIgnoredRule, saveSettings } from "../shared/storage";
import { getStats, resetStats } from "../shared/stats";
import { applyTheme } from "../shared/theme";

const languageSelect = document.getElementById("language") as HTMLSelectElement;
const themeSelect = document.getElementById("theme") as HTMLSelectElement;
const checkLevelSelect = document.getElementById("check-level") as HTMLSelectElement;
const debounceInput = document.getElementById("debounce") as HTMLInputElement;
const apiUrlInput = document.getElementById("api-url") as HTMLInputElement;
const dictionaryInput = document.getElementById("dictionary") as HTMLTextAreaElement;
const saveButton = document.getElementById("save") as HTMLButtonElement;
const savedLabel = document.getElementById("saved")!;
const ignoredRulesList = document.getElementById("ignored-rules")!;
const testApiButton = document.getElementById("test-api") as HTMLButtonElement;
const apiStatus = document.getElementById("api-status")!;
const exportDictButton = document.getElementById("export-dict") as HTMLButtonElement;
const importDictButton = document.getElementById("import-dict") as HTMLButtonElement;
const importFileInput = document.getElementById("import-file") as HTMLInputElement;
const statsSummary = document.getElementById("stats-summary")!;
const statsList = document.getElementById("stats-list")!;
const resetStatsButton = document.getElementById("reset-stats") as HTMLButtonElement;

async function requestApiPermission(apiUrl: string): Promise<boolean> {
  if (!apiUrl.trim()) return true;

  try {
    const origin = new URL(resolveApiUrl(apiUrl)).origin;
    const hasPermission = await chrome.permissions.contains({ origins: [`${origin}/*`] });
    if (hasPermission) return true;
    return chrome.permissions.request({ origins: [`${origin}/*`] });
  } catch {
    return false;
  }
}

async function renderIgnoredRules(ruleIds: string[]): Promise<void> {
  ignoredRulesList.replaceChildren();

  if (ruleIds.length === 0) {
    const empty = document.createElement("li");
    empty.textContent = "No hay reglas ignoradas.";
    ignoredRulesList.appendChild(empty);
    return;
  }

  for (const ruleId of ruleIds) {
    const item = document.createElement("li");
    const label = document.createElement("span");
    label.textContent = ruleId;
    item.appendChild(label);

    const removeButton = document.createElement("button");
    removeButton.type = "button";
    removeButton.textContent = "Eliminar";
    removeButton.addEventListener("click", async () => {
      const updated = await removeIgnoredRule(ruleId);
      await renderIgnoredRules(updated);
    });
    item.appendChild(removeButton);
    ignoredRulesList.appendChild(item);
  }
}

async function renderStats(): Promise<void> {
  const stats = await getStats();
  statsSummary.textContent = `${stats.correctionsThisWeek} correcciones esta semana · ${stats.correctionsTotal} en total`;
  statsList.replaceChildren();

  const entries = Object.entries(stats.byCategory).sort((a, b) => b[1] - a[1]);
  if (entries.length === 0) {
    const empty = document.createElement("li");
    empty.textContent = "Aún no hay datos por categoría.";
    statsList.appendChild(empty);
    return;
  }

  for (const [category, count] of entries.slice(0, 8)) {
    const info = getCategoryInfo(category);
    const item = document.createElement("li");
    item.innerHTML = `<span>${info.label}</span><strong>${count}</strong>`;
    statsList.appendChild(item);
  }
}

async function init(): Promise<void> {
  const settings = await getSettings();
  applyTheme(settings.theme);

  languageSelect.value = settings.language;
  themeSelect.value = settings.theme;
  checkLevelSelect.value = settings.checkLevel || "picky";
  debounceInput.value = String(settings.debounceMs);
  apiUrlInput.value = settings.apiUrl || "";
  dictionaryInput.value = settings.personalDictionary.join("\n");
  await renderIgnoredRules(settings.ignoredRules);
  await renderStats();

  themeSelect.addEventListener("change", () => {
    applyTheme(themeSelect.value as "system" | "light" | "dark");
  });

  testApiButton.addEventListener("click", async () => {
    apiStatus.className = "";
    apiStatus.textContent = "Probando…";
    const apiUrl = apiUrlInput.value.trim();
    if (apiUrl && apiUrl !== DEFAULT_API_URL) {
      const granted = await requestApiPermission(apiUrl);
      if (!granted) {
        apiStatus.className = "err";
        apiStatus.textContent = "Sin permiso para ese servidor.";
        return;
      }
    }

    const response = await chrome.runtime.sendMessage({
      type: "TEST_API",
      payload: { apiUrl },
    });

    if (response?.ok) {
      apiStatus.className = "ok";
      apiStatus.textContent = "Servidor OK. Responde correctamente.";
    } else {
      apiStatus.className = "err";
      apiStatus.textContent = response?.error || "No se pudo conectar.";
    }
  });

  exportDictButton.addEventListener("click", () => {
    const words = dictionaryInput.value
      .split("\n")
      .map((word) => word.trim())
      .filter(Boolean);
    const blob = new Blob([words.join("\n")], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "linguacheck-dictionary.txt";
    anchor.click();
    URL.revokeObjectURL(url);
  });

  importDictButton.addEventListener("click", () => importFileInput.click());
  importFileInput.addEventListener("change", async () => {
    const file = importFileInput.files?.[0];
    if (!file) return;
    const content = await file.text();
    let words: string[] = [];

    try {
      const parsed = JSON.parse(content) as unknown;
      if (Array.isArray(parsed)) {
        words = parsed.map(String);
      } else if (parsed && typeof parsed === "object" && Array.isArray((parsed as { words?: string[] }).words)) {
        words = (parsed as { words: string[] }).words;
      }
    } catch {
      words = content.split(/\r?\n/);
    }

    const merged = Array.from(
      new Set([
        ...dictionaryInput.value.split("\n").map((word) => word.trim()).filter(Boolean),
        ...words.map((word) => word.trim()).filter(Boolean),
      ]),
    );
    dictionaryInput.value = merged.join("\n");
    importFileInput.value = "";
  });

  resetStatsButton.addEventListener("click", async () => {
    await resetStats();
    await renderStats();
  });

  saveButton.addEventListener("click", async () => {
    const personalDictionary = dictionaryInput.value
      .split("\n")
      .map((word) => word.trim())
      .filter(Boolean);

    const apiUrl = apiUrlInput.value.trim();
    if (apiUrl && apiUrl !== DEFAULT_API_URL) {
      const granted = await requestApiPermission(apiUrl);
      if (!granted) {
        window.alert("Se necesita permiso para acceder al servidor personalizado.");
        return;
      }
    }

    await saveSettings({
      language: languageSelect.value,
      debounceMs: Number(debounceInput.value) || 700,
      personalDictionary,
      apiUrl,
      theme: themeSelect.value as "system" | "light" | "dark",
      checkLevel: checkLevelSelect.value as "default" | "picky",
    });

    applyTheme(themeSelect.value as "system" | "light" | "dark");
    savedLabel.classList.add("visible");
    window.setTimeout(() => savedLabel.classList.remove("visible"), 1500);
  });
}

void init();
