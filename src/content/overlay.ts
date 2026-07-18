import type { GrammarMatch } from "../shared/types";
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

    const replacement = match.replacements[0]?.value;
    const word = this.activeField.getMatchText(match);
    this.tooltip.replaceChildren();

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

    const actions = document.createElement("div");
    actions.className = "lc-tooltip-actions";

    if (replacement) {
      const applyButton = document.createElement("button");
      applyButton.type = "button";
      applyButton.className = "lc-tooltip-apply";
      applyButton.textContent = `Aplicar: ${replacement}`;
      applyButton.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
        this.onApply?.(match, replacement);
        this.hideTooltip();
      });
      actions.appendChild(applyButton);
    }

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
    if (!this.tooltip) return;
    this.tooltip.hidden = true;
    this.tooltip.replaceChildren();
  }

  private reposition(): void {
    if (!this.activeField || this.matches.length === 0) return;
    this.render(this.activeField, this.matches);
  }
}
