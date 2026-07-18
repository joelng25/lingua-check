import { getSettings, saveSettings } from "../shared/storage";
import { getStats } from "../shared/stats";
import { applyTheme } from "../shared/theme";

const statusEl = document.getElementById("status")!;
const statsLine = document.getElementById("stats-line")!;
const toggleBtn = document.getElementById("toggle") as HTMLButtonElement;
const siteBtn = document.getElementById("site") as HTMLButtonElement;
const panelBtn = document.getElementById("panel") as HTMLButtonElement;
const languageSelect = document.getElementById("language") as HTMLSelectElement;
const optionsLink = document.getElementById("options") as HTMLAnchorElement;

async function init(): Promise<void> {
  let settings = await getSettings();
  applyTheme(settings.theme);

  const stats = await getStats();
  statsLine.textContent = `${stats.correctionsThisWeek} correcciones esta semana · ${stats.correctionsTotal} total`;

  function render(): void {
    statusEl.textContent = settings.enabled ? "Activo" : "Desactivado";
    toggleBtn.textContent = settings.enabled ? "Desactivar" : "Activar";
    toggleBtn.classList.toggle("off", !settings.enabled);
    languageSelect.value = settings.language;
  }

  toggleBtn.addEventListener("click", async () => {
    settings.enabled = !settings.enabled;
    await saveSettings({ enabled: settings.enabled });
    render();
  });

  languageSelect.addEventListener("change", async () => {
    settings.language = languageSelect.value;
    await saveSettings({ language: settings.language });
  });

  siteBtn.addEventListener("click", async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    const hostname = tab?.url ? new URL(tab.url).hostname : null;
    if (!hostname) return;

    const disabledSites = settings.disabledSites.includes(hostname)
      ? settings.disabledSites.filter((site) => site !== hostname)
      : [...settings.disabledSites, hostname];

    settings.disabledSites = disabledSites;
    await saveSettings({ disabledSites });
    siteBtn.textContent = disabledSites.includes(hostname)
      ? "Activar en este sitio"
      : "Desactivar en este sitio";
  });

  optionsLink.addEventListener("click", (event) => {
    event.preventDefault();
    void chrome.runtime.openOptionsPage();
  });

  panelBtn.addEventListener("click", async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.windowId) return;
    await chrome.sidePanel.open({ windowId: tab.windowId });
  });

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  const hostname = tab?.url ? new URL(tab.url).hostname : "";
  siteBtn.textContent = settings.disabledSites.includes(hostname)
    ? "Activar en este sitio"
    : "Desactivar en este sitio";

  render();
}

void init();
