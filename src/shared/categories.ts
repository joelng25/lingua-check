/** LanguageTool category styling + Spanish labels (aligned with LT UI). */

export type CategoryTone = "error" | "warning" | "style" | "info";

export interface CategoryInfo {
  id: string;
  label: string;
  tone: CategoryTone;
  /** Underline / accent color */
  color: string;
}

const CATEGORIES: Record<string, CategoryInfo> = {
  TYPOS: { id: "TYPOS", label: "Ortografía", tone: "error", color: "#e53935" },
  MISSPELLING: { id: "MISSPELLING", label: "Ortografía", tone: "error", color: "#e53935" },
  CASING: { id: "CASING", label: "Mayúsculas y minúsculas", tone: "warning", color: "#f9a825" },
  PUNCTUATION: { id: "PUNCTUATION", label: "Puntuación", tone: "warning", color: "#f9a825" },
  TYPOGRAPHY: { id: "TYPOGRAPHY", label: "Tipografía", tone: "warning", color: "#f9a825" },
  GRAMMAR: { id: "GRAMMAR", label: "Gramática", tone: "error", color: "#e53935" },
  CONFUSED_WORDS: {
    id: "CONFUSED_WORDS",
    label: "Palabras confusas",
    tone: "error",
    color: "#e53935",
  },
  REDUNDANCY: {
    id: "REDUNDANCY",
    label: "Uso innecesario",
    tone: "style",
    color: "#fb8c00",
  },
  STYLE: { id: "STYLE", label: "Estilo", tone: "style", color: "#fb8c00" },
  STYLE_REPETITION: {
    id: "STYLE_REPETITION",
    label: "Repetición",
    tone: "style",
    color: "#fb8c00",
  },
  SEMANTICS: { id: "SEMANTICS", label: "Semántica", tone: "style", color: "#fb8c00" },
  COLLOCATIONS: {
    id: "COLLOCATIONS",
    label: "Colocaciones",
    tone: "style",
    color: "#fb8c00",
  },
  PLAIN_ENGLISH: {
    id: "PLAIN_ENGLISH",
    label: "Claridad",
    tone: "style",
    color: "#fb8c00",
  },
  WIKIPEDIA: { id: "WIKIPEDIA", label: "Estilo", tone: "style", color: "#fb8c00" },
  MISC: { id: "MISC", label: "Otros", tone: "info", color: "#8e24aa" },
  COMPOUNDING: {
    id: "COMPOUNDING",
    label: "Composición",
    tone: "warning",
    color: "#f9a825",
  },
  UNKNOWN: { id: "UNKNOWN", label: "Otros", tone: "info", color: "#8e24aa" },
};

/** Categories we ask LanguageTool to keep active (free public API). */
export const ENABLED_CATEGORIES = [
  "TYPOS",
  "CASING",
  "PUNCTUATION",
  "TYPOGRAPHY",
  "GRAMMAR",
  "CONFUSED_WORDS",
  "REDUNDANCY",
  "STYLE",
  "SEMANTICS",
  "COLLOCATIONS",
  "COMPOUNDING",
  "MISC",
].join(",");

export function getCategoryInfo(
  categoryId?: string | null,
  fallbackName?: string | null,
): CategoryInfo {
  const id = (categoryId || "UNKNOWN").toUpperCase();
  const known = CATEGORIES[id];
  if (known) return known;

  return {
    id,
    label: fallbackName?.trim() || "Otros",
    tone: "info",
    color: "#8e24aa",
  };
}

export function categoryCssVar(categoryId?: string | null): string {
  return getCategoryInfo(categoryId).color;
}
