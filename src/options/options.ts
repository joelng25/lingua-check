import { DEFAULT_API_URL, resolveApiUrl } from "../shared/constants";
import { getSettings, removeIgnoredRule, saveSettings } from "../shared/storage";

const languageSelect = document.getElementById("language") as HTMLSelectElement;
const debounceInput = document.getElementById("debounce") as HTMLInputElement;
const apiUrlInput = document.getElementById("api-url") as HTMLInputElement;
const dictionaryInput = document.getElementById("dictionary") as HTMLTextAreaElement;
const saveButton = document.getElementById("save") as HTMLButtonElement;
const savedLabel = document.getElementById("saved")!;
const ignoredRulesList = document.getElementById("ignored-rules")!;

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

async function init(): Promise<void> {
  const settings = await getSettings();

  languageSelect.value = settings.language;
  debounceInput.value = String(settings.debounceMs);
  apiUrlInput.value = settings.apiUrl || "";
  dictionaryInput.value = settings.personalDictionary.join("\n");
  await renderIgnoredRules(settings.ignoredRules);

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
    });

    savedLabel.classList.add("visible");
    window.setTimeout(() => savedLabel.classList.remove("visible"), 1500);
  });
}

void init();
