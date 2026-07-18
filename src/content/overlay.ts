import type { GrammarMatch } from "../shared/types";
import { getCategoryInfo } from "../shared/categories";
import type { FieldAdapter } from "./field-adapter";

const HIT_CLASS = "lc-hit";
const UNDERLINE_CLASS = "lc-underline";
const UNDERLINE_ACTIVE_CLASS = "lc-underline-active";

type ApplyHandler = (match: GrammarMatch, replacement: string) => void;
type DictionaryHandler = (match: GrammarMatch, word: string) => void;
type IgnoreOccurrenceHandler = (match: GrammarMatch) => void;
type IgnoreRuleHandler = (match: GrammarMatch) => void;

export class OverlayManager {
  private container: HTMLDivElement | null = null;
  private tooltip: HTMLDivElement | null = null;
  private activeField: FieldAdapter | null = null;
  private matches: GrammarMatch[] = [];
  private hideTimer: number | null = null;
  private activeMatch: GrammarMatch | null = null;
  private suggestions: string[] = [];
  private suggestionIndex = 0;
  private onApply: ApplyHandler | null = null;
  private onAddToDictionary: DictionaryHandler | null = null;
  private onIgnoreOccurrence: IgnoreOccurrenceHandler | null = null;
  private onIgnoreRule: IgnoreRuleHandler | null = null;

  mount(): void {
    if (this.container) return;

    this.container = document.createElement("div");
    this.container.id = "lingua-check-overlay";
    document.body.appendChild(this.container);

    this.tooltip = document.createElement("div");
    this.tooltip.id = "lc-tooltip";
    this.tooltip.className = "lc-tooltip";
    this.tooltip.hidden = true;
    document.body.appendChild(this.tooltip);

    this.tooltip.addEventListener("mouseenter", () => this.cancelHide());
    this.tooltip.addEventListener("mouseleave", () => this.scheduleHide());
    // Keep focus in the editor when interacting with the tooltip (critical for Gmail).
    this.tooltip.addEventListener("mousedown", (event) => {
      event.preventDefault();
      event.stopPropagation();
    });

    window.addEventListener("scroll", () => this.reposition(), true);
    window.addEventListener("resize", () => this.reposition());
  }

  setApplyHandler(handler: ApplyHandler): void {
    this.onApply = handler;
  }

  setDictionaryHandler(handler: DictionaryHandler): void {
    this.onAddToDictionary = handler;
  }

  setIgnoreOccurrenceHandler(handler: IgnoreOccurrenceHandler): void {
    this.onIgnoreOccurrence = handler;
  }

  setIgnoreRuleHandler(handler: IgnoreRuleHandler): void {
    this.onIgnoreRule = handler;
  }

  getMatches(): GrammarMatch[] {
    return this.matches;
  }

  isTooltipOpen(): boolean {
    return Boolean(this.tooltip && !this.tooltip.hidden);
  }

  closeTooltip(): void {
    this.hideTooltip();
  }

  cycleSuggestion(delta: number): void {
    if (!this.isTooltipOpen() || this.suggestions.length === 0) return;
    this.suggestionIndex =
      (this.suggestionIndex + delta + this.suggestions.length) % this.suggestions.length;
    this.updateSuggestionHighlight();
  }

  applySelectedSuggestion(): boolean {
    if (!this.isTooltipOpen() || !this.activeMatch) return false;
    const suggestion = this.suggestions[this.suggestionIndex];
    if (!suggestion) return false;
    this.onApply?.(this.activeMatch, suggestion);
    this.hideTooltip();
    return true;
  }

  highlightMatch(offset: number, length: number): void {
    if (!this.container) return;

    const hits = this.container.querySelectorAll<HTMLElement>(`.${HIT_CLASS}`);
    let target: HTMLElement | null = null;

    for (const hit of hits) {
      hit.classList.remove(UNDERLINE_ACTIVE_CLASS);
      if (
        hit.dataset.offset === String(offset) &&
        hit.dataset.length === String(length)
      ) {
        target = hit;
      }
    }

    if (!target) return;

    target.classList.add(UNDERLINE_ACTIVE_CLASS);
    target.scrollIntoView({ behavior: "smooth", block: "center", inline: "nearest" });

    const match = this.matches.find(
      (item) => item.offset === offset && item.length === length,
    );
    if (match) {
      const rect = target.getBoundingClientRect();
      this.showTooltip(match, rect);
    }

    window.setTimeout(() => {
      target?.classList.remove(UNDERLINE_ACTIVE_CLASS);
    }, 1800);
  }

  render(field: FieldAdapter, matches: GrammarMatch[]): void {
    this.mount();
    this.activeField = field;
    this.matches = matches;

    if (!this.container) return;

    this.container.replaceChildren();

    if (matches.length === 0) {
      this.hideTooltip();
      return;
    }

    const useFixed = field.kind === "googledocs";

    for (const match of matches) {
      for (const rect of field.getMatchRects(match)) {
        this.container.appendChild(this.createHitArea(match, rect, useFixed));
      }
    }
  }

  clear(): void {
    this.matches = [];
    this.activeField = null;
    this.container?.replaceChildren();
    this.hideTooltip();
  }

  private createHitArea(
    match: GrammarMatch,
    rect: DOMRect,
    useFixed = false,
  ): HTMLSpanElement {
    const hit = document.createElement("span");
    hit.className = HIT_CLASS;
    hit.dataset.offset = String(match.offset);
    hit.dataset.length = String(match.length);

    const paddingY = 2;
    const top = useFixed
      ? rect.top - paddingY
      : rect.top + window.scrollY - paddingY;
    const left = useFixed ? rect.left : rect.left + window.scrollX;

    Object.assign(hit.style, {
      position: useFixed ? "fixed" : "absolute",
      top: `${top}px`,
      left: `${left}px`,
      width: `${Math.max(rect.width, 4)}px`,
      height: `${Math.max(rect.height + paddingY * 2, 14)}px`,
    });

    const underline = document.createElement("span");
    underline.className = UNDERLINE_CLASS;
    const category = getCategoryInfo(match.rule.category?.id, match.rule.category?.name);
    underline.style.setProperty("--lc-underline-color", category.color);
    underline.dataset.tone = category.tone;
    hit.appendChild(underline);

    hit.addEventListener("mouseenter", () => {
      this.cancelHide();
      this.showTooltip(match, rect);
    });

    hit.addEventListener("mouseleave", () => this.scheduleHide());

    hit.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      this.cancelHide();
      this.showTooltip(match, rect);
    });

    return hit;
  }

  private showTooltip(match: GrammarMatch, rect: DOMRect): void {
    if (!this.tooltip || !this.activeField) return;

    this.activeMatch = match;
    this.suggestions = Array.from(
      new Set(
        match.replacements
          .map((item) => item.value)
          .filter((value) => Boolean(value?.trim())),
      ),
    ).slice(0, 3);
    this.suggestionIndex = 0;

    const word = this.activeField.getMatchText(match);
    this.tooltip.replaceChildren();

    const category = getCategoryInfo(match.rule.category?.id, match.rule.category?.name);
    const categoryBadge = document.createElement("div");
    categoryBadge.className = "lc-tooltip-category";
    categoryBadge.innerHTML = `<span class="lc-tooltip-dot" style="background:${category.color}"></span><span>${category.label}</span>`;
    this.tooltip.appendChild(categoryBadge);

    const message = document.createElement("p");
    message.className = "lc-tooltip-message";
    message.textContent = match.message;
    this.tooltip.appendChild(message);

    if (match.rule.description || match.rule.id) {
      const rule = document.createElement("p");
      rule.className = "lc-tooltip-rule";
      rule.textContent = match.rule.description || match.rule.id;
      this.tooltip.appendChild(rule);
    }

    if (this.suggestions.length > 0) {
      const suggestionsRow = document.createElement("div");
      suggestionsRow.className = "lc-tooltip-suggestions";

      for (const [index, suggestion] of this.suggestions.entries()) {
        const applyButton = document.createElement("button");
        applyButton.type = "button";
        applyButton.dataset.suggestionIndex = String(index);
        applyButton.className =
          index === this.suggestionIndex ? "lc-tooltip-apply" : "lc-tooltip-suggestion";
        applyButton.textContent = suggestion;
        applyButton.title = `Aplicar: ${suggestion}`;
        applyButton.addEventListener("click", (event) => {
          event.preventDefault();
          event.stopPropagation();
          this.suggestionIndex = index;
          this.onApply?.(match, suggestion);
          this.hideTooltip();
        });
        suggestionsRow.appendChild(applyButton);
      }

      this.tooltip.appendChild(suggestionsRow);

      const hint = document.createElement("p");
      hint.className = "lc-tooltip-hint";
      hint.textContent = "← → elegir · Enter aplicar · Esc cerrar";
      this.tooltip.appendChild(hint);
    }

    const actions = document.createElement("div");
    actions.className = "lc-tooltip-actions";

    if (word.trim()) {
      const dictionaryButton = document.createElement("button");
      dictionaryButton.type = "button";
      dictionaryButton.className = "lc-tooltip-dictionary";
      dictionaryButton.textContent = "Añadir al diccionario";
      dictionaryButton.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
        this.onAddToDictionary?.(match, word);
        this.hideTooltip();
      });
      actions.appendChild(dictionaryButton);
    }

    const ignoreButton = document.createElement("button");
    ignoreButton.type = "button";
    ignoreButton.className = "lc-tooltip-ignore";
    ignoreButton.textContent = "Ignorar";
    ignoreButton.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      this.onIgnoreOccurrence?.(match);
      this.hideTooltip();
    });
    actions.appendChild(ignoreButton);

    const ignoreRuleButton = document.createElement("button");
    ignoreRuleButton.type = "button";
    ignoreRuleButton.className = "lc-tooltip-ignore-rule";
    ignoreRuleButton.textContent = "Ignorar regla";
    ignoreRuleButton.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      this.onIgnoreRule?.(match);
      this.hideTooltip();
    });
    actions.appendChild(ignoreRuleButton);

    this.tooltip.appendChild(actions);
    this.tooltip.hidden = false;
    this.tooltip.style.top = `${rect.bottom + window.scrollY + 6}px`;
    this.tooltip.style.left = `${rect.left + window.scrollX}px`;
  }

  private updateSuggestionHighlight(): void {
    if (!this.tooltip) return;
    const buttons = this.tooltip.querySelectorAll<HTMLButtonElement>(
      ".lc-tooltip-suggestions button",
    );
    for (const button of buttons) {
      const index = Number(button.dataset.suggestionIndex ?? -1);
      button.className =
        index === this.suggestionIndex ? "lc-tooltip-apply" : "lc-tooltip-suggestion";
    }
  }

  private scheduleHide(): void {
    this.cancelHide();
    this.hideTimer = window.setTimeout(() => {
      if (!this.tooltip?.matches(":hover")) {
        this.hideTooltip();
      }
    }, 180);
  }

  private cancelHide(): void {
    if (this.hideTimer !== null) {
      window.clearTimeout(this.hideTimer);
      this.hideTimer = null;
    }
  }

  private hideTooltip(): void {
    this.cancelHide();
    this.activeMatch = null;
    this.suggestions = [];
    this.suggestionIndex = 0;
    if (!this.tooltip) return;
    this.tooltip.hidden = true;
    this.tooltip.replaceChildren();
  }

  private reposition(): void {
    if (!this.activeField || this.matches.length === 0) return;
    this.render(this.activeField, this.matches);
  }
}
