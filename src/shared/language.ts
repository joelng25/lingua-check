export const AUTO_LANGUAGE = "auto";

export interface DetectedLanguage {
  code: string;
  name: string;
  confidence?: number;
}

export interface LanguageHint {
  code: string;
  percentage: number;
  reliable: boolean;
  source: "cld" | "sticky" | "ui";
}

export interface AutoLanguageResolution {
  language: string;
  preferredVariants?: string;
  hint?: LanguageHint;
}

const LOCALE_TO_VARIANT: Record<string, string> = {
  es: "es",
  en: "en-US",
  "en-us": "en-US",
  "en-gb": "en-GB",
  fr: "fr",
  de: "de-DE",
  "de-de": "de-DE",
  "de-at": "de-DE",
  pt: "pt-BR",
  "pt-br": "pt-BR",
  "pt-pt": "pt-PT",
  it: "it",
  nl: "nl",
  ca: "ca",
};

const MIN_RELIABLE_PERCENT = 50;
const MIN_WEAK_PERCENT = 35;

export function resolveApiLanguage(language: string): string {
  if (!language || language === AUTO_LANGUAGE) return AUTO_LANGUAGE;
  return language;
}

export function isAutoLanguage(language: string): boolean {
  return resolveApiLanguage(language) === AUTO_LANGUAGE;
}

export function getUiLocale(): string {
  if (typeof chrome !== "undefined" && chrome.i18n?.getUILanguage) {
    return chrome.i18n.getUILanguage();
  }
  return typeof navigator !== "undefined" ? navigator.language : "es";
}

export function mapLocaleToVariant(locale: string): string {
  const normalized = locale.replace("_", "-").toLowerCase();
  if (LOCALE_TO_VARIANT[normalized]) return LOCALE_TO_VARIANT[normalized];
  const lang = normalized.split("-")[0];
  return LOCALE_TO_VARIANT[lang] ?? "en-US";
}

function mapCldToLt(code: string, uiLocale: string): string {
  const normalized = code.toLowerCase();

  if (normalized === "en") {
    const uiVariant = mapLocaleToVariant(uiLocale);
    return uiVariant.startsWith("en") ? uiVariant : "en-US";
  }

  if (normalized === "pt") {
    const uiVariant = mapLocaleToVariant(uiLocale);
    return uiVariant.startsWith("pt") ? uiVariant : "pt-BR";
  }

  if (normalized === "de") return "de-DE";

  const mapped = LOCALE_TO_VARIANT[normalized];
  if (mapped) return mapped;

  return mapLocaleToVariant(uiLocale);
}

/** Helps LanguageTool pick variants when language=auto. Keeps the list small to avoid wrong picks. */
export function getPreferredVariants(uiLocale = getUiLocale(), primaryHint?: string): string {
  const primary = primaryHint || mapLocaleToVariant(uiLocale);
  const variants = [primary];

  for (const required of ["en-US", "en-GB", "de-DE"]) {
    if (!variants.includes(required)) variants.push(required);
  }

  if (primary.startsWith("pt") || mapLocaleToVariant(uiLocale).startsWith("pt")) {
    for (const ptVariant of ["pt-BR", "pt-PT"]) {
      if (!variants.includes(ptVariant)) variants.push(ptVariant);
    }
  }

  return variants.join(",");
}

export async function detectLanguageWithChrome(text: string): Promise<LanguageHint | null> {
  const sample = text.trim();
  if (sample.length < 8) return null;
  if (typeof chrome === "undefined" || !chrome.i18n?.detectLanguage) return null;

  try {
    const result = await chrome.i18n.detectLanguage(sample);
    const top = result.languages?.[0];
    if (!top?.language) return null;

    const uiLocale = getUiLocale();
    return {
      code: mapCldToLt(top.language, uiLocale),
      percentage: top.percentage ?? 0,
      reliable: Boolean(result.isReliable),
      source: "cld",
    };
  } catch {
    return null;
  }
}

export function resolveAutoLanguage(
  hint: LanguageHint | null,
  stickyCode: string | null,
  uiLocale = getUiLocale(),
): AutoLanguageResolution {
  if (hint && (hint.reliable || hint.percentage >= MIN_RELIABLE_PERCENT)) {
    return { language: hint.code, hint };
  }

  if (stickyCode) {
    return {
      language: stickyCode,
      hint: { code: stickyCode, percentage: 100, reliable: true, source: "sticky" },
    };
  }

  if (hint && hint.percentage >= MIN_WEAK_PERCENT) {
    return {
      language: AUTO_LANGUAGE,
      preferredVariants: getPreferredVariants(uiLocale, hint.code),
      hint,
    };
  }

  const uiVariant = mapLocaleToVariant(uiLocale);
  return {
    language: AUTO_LANGUAGE,
    preferredVariants: getPreferredVariants(uiLocale, uiVariant),
    hint: hint ?? { code: uiVariant, percentage: 0, reliable: false, source: "ui" },
  };
}

export function extractDetectedLanguage(data: {
  language?: {
    code?: string;
    name?: string;
    detectedLanguage?: { code?: string; name?: string; confidence?: number };
  };
}): DetectedLanguage | undefined {
  const detected = data.language?.detectedLanguage;
  if (detected?.code) {
    return {
      code: detected.code,
      name: detected.name || detected.code,
      confidence: detected.confidence,
    };
  }

  if (data.language?.code && data.language.code !== AUTO_LANGUAGE) {
    return {
      code: data.language.code,
      name: data.language.name || data.language.code,
    };
  }

  return undefined;
}

export function hintToDetectedLanguage(hint: LanguageHint): DetectedLanguage {
  return {
    code: hint.code,
    name: hint.code,
    confidence: hint.percentage,
  };
}
