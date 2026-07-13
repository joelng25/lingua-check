import type { GrammarMatch } from "../shared/types";
import type { FieldAdapter } from "./field-adapter";

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

    const underlines = this.container.querySelectorAll<HTMLElement>(`.${UNDERLINE_CLASS}`);
    let target: HTMLElement | null = null;

    for (const underline of underlines) {
      underline.classList.remove(UNDERLINE_ACTIVE_CLASS);
      if (
        underline.dataset.offset === String(offset) &&
        underline.dataset.length === String(length)
      ) {
        target = underline;
      }
    }

    if (!target) return;

    target.classList.add(UNDERLINE_ACTIVE_CLASS);
    target.scrollIntoView({ behavior: "smooth", block: "center", inline: "nearest" });

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

    for (const match of matches) {
      for (const rect of field.getMatchRects(match)) {
        const underline = this.createUnderline(match, rect);
        this.container.appendChild(underline);
      }
    }
  }

  clear(): void {
    this.matches = [];
    this.activeField = null;
    this.container?.replaceChildren();
    this.hideTooltip();
  }

  private createUnderline(match: GrammarMatch, rect: DOMRect): HTMLSpanElement {
    const underline = document.createElement("span");
    underline.className = UNDERLINE_CLASS;
    underline.dataset.offset = String(match.offset);
    underline.dataset.length = String(match.length);

    Object.assign(underline.style, {
      position: "absolute",
      top: `${rect.bottom + window.scrollY - 2}px`,
      left: `${rect.left + window.scrollX}px`,
      width: `${Math.max(rect.width, 4)}px`,
      height: "2px",
    });

    underline.addEventListener("mouseenter", () => this.showTooltip(match, rect));
    underline.addEventListener("mouseleave", () => {
      window.setTimeout(() => {
        if (!this.tooltip?.matches(":hover")) {
          this.hideTooltip();
        }
      }, 120);
    });

    underline.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      this.showTooltip(match, rect);
    });

    return underline;
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

    const rule = document.createElement("p");
    rule.className = "lc-tooltip-rule";
    rule.textContent = match.rule.description || match.rule.id;
    this.tooltip.appendChild(rule);

    const actions = document.createElement("div");
    actions.className = "lc-tooltip-actions";

    if (replacement) {
      const applyButton = document.createElement("button");
      applyButton.type = "button";
      applyButton.className = "lc-tooltip-apply";
      applyButton.textContent = `Aplicar: ${replacement}`;
      applyButton.addEventListener("click", () => {
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
      dictionaryButton.addEventListener("click", () => {
        this.onAddToDictionary?.(match, word);
        this.hideTooltip();
      });
      actions.appendChild(dictionaryButton);
    }

    const ignoreButton = document.createElement("button");
    ignoreButton.type = "button";
    ignoreButton.className = "lc-tooltip-ignore";
    ignoreButton.textContent = "Ignorar";
    ignoreButton.addEventListener("click", () => {
      this.onIgnoreOccurrence?.(match);
      this.hideTooltip();
    });
    actions.appendChild(ignoreButton);

    const ignoreRuleButton = document.createElement("button");
    ignoreRuleButton.type = "button";
    ignoreRuleButton.className = "lc-tooltip-ignore-rule";
    ignoreRuleButton.textContent = "Ignorar regla";
    ignoreRuleButton.addEventListener("click", () => {
      this.onIgnoreRule?.(match);
      this.hideTooltip();
    });
    actions.appendChild(ignoreRuleButton);

    this.tooltip.appendChild(actions);
    this.tooltip.hidden = false;
    this.tooltip.style.top = `${rect.bottom + window.scrollY + 8}px`;
    this.tooltip.style.left = `${rect.left + window.scrollX}px`;
  }

  private hideTooltip(): void {
    if (!this.tooltip) return;
    this.tooltip.hidden = true;
    this.tooltip.replaceChildren();
  }

  private reposition(): void {
    if (!this.activeField || this.matches.length === 0) return;
    this.render(this.activeField, this.matches);
  }
}
