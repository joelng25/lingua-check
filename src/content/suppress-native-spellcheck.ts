const ORIGINAL_ATTR = "data-lc-original-spellcheck";
const SUPPRESSED_ATTR = "data-lc-spellcheck-suppressed";
const ROOT_FLAG = "data-lc-suppress-native-spellcheck";
const STYLE_ID = "lingua-check-spellcheck-style";
const BRIDGE_SOURCE = "lingua-check";

const EDITABLE_SELECTOR =
  "input, textarea, [contenteditable='true'], [contenteditable=''], [contenteditable='plaintext-only']";

let suppressing = false;
let domObserver: MutationObserver | null = null;

function isSpellcheckTarget(element: Element): element is HTMLElement {
  if (!(element instanceof HTMLElement)) return false;
  if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement) {
    const type = element instanceof HTMLInputElement ? element.type.toLowerCase() : "textarea";
    return (
      type === "text" ||
      type === "search" ||
      type === "email" ||
      type === "url" ||
      type === "" ||
      element instanceof HTMLTextAreaElement
    );
  }
  return element.isContentEditable;
}

function injectGlobalStyle(active: boolean): void {
  const existing = document.getElementById(STYLE_ID);
  if (!active) {
    existing?.remove();
    document.documentElement.removeAttribute(ROOT_FLAG);
    return;
  }

  document.documentElement.setAttribute(ROOT_FLAG, "true");

  if (existing) return;

  const style = document.createElement("style");
  style.id = STYLE_ID;
  style.textContent = `
    html[${ROOT_FLAG}] *::-webkit-spelling-error,
    html[${ROOT_FLAG}] *::-webkit-grammar-error {
      text-decoration: none !important;
      background-image: none !important;
    }

    html[${ROOT_FLAG}] [${SUPPRESSED_ATTR}] {
      text-decoration-skip-ink: none;
    }
  `;
  (document.head || document.documentElement).appendChild(style);
}

export function suppressElementSpellcheck(element: HTMLElement): void {
  if (!suppressing || !isSpellcheckTarget(element)) return;

  if (!element.hasAttribute(ORIGINAL_ATTR)) {
    element.setAttribute(ORIGINAL_ATTR, element.spellcheck ? "true" : "false");
  }

  element.spellcheck = false;
  element.setAttribute("spellcheck", "false");
  element.setAttribute(SUPPRESSED_ATTR, "true");

  // Gmail/Notion sometimes enable spellcheck on nested editables.
  for (const child of element.querySelectorAll<HTMLElement>(EDITABLE_SELECTOR)) {
    if (!isSpellcheckTarget(child)) continue;
    if (!child.hasAttribute(ORIGINAL_ATTR)) {
      child.setAttribute(ORIGINAL_ATTR, child.spellcheck ? "true" : "false");
    }
    child.spellcheck = false;
    child.setAttribute("spellcheck", "false");
    child.setAttribute(SUPPRESSED_ATTR, "true");
  }
}

function restoreElement(element: HTMLElement): void {
  if (!element.hasAttribute(ORIGINAL_ATTR)) return;
  element.spellcheck = element.getAttribute(ORIGINAL_ATTR) === "true";
  element.removeAttribute(ORIGINAL_ATTR);
  element.removeAttribute(SUPPRESSED_ATTR);
  if (element.spellcheck) {
    element.setAttribute("spellcheck", "true");
  } else {
    element.removeAttribute("spellcheck");
  }
}

function scan(root: ParentNode, apply: (element: HTMLElement) => void): void {
  if (root instanceof HTMLElement && isSpellcheckTarget(root)) {
    apply(root);
  }

  for (const element of root.querySelectorAll(EDITABLE_SELECTOR)) {
    if (element instanceof HTMLElement && isSpellcheckTarget(element)) {
      apply(element);
    }
  }

  if (location.hostname === "docs.google.com") {
    const iframe = document.querySelector<HTMLIFrameElement>("iframe.docs-texteventtarget-iframe");
    const doc = iframe?.contentDocument;
    if (doc?.body instanceof HTMLElement) {
      apply(doc.body);
      for (const element of doc.querySelectorAll<HTMLElement>(EDITABLE_SELECTOR)) {
        if (isSpellcheckTarget(element)) apply(element);
      }
    }
  }
}

function notifyGoogleDocs(active: boolean): void {
  if (location.hostname !== "docs.google.com") return;
  window.postMessage(
    { source: BRIDGE_SOURCE, type: "set-native-spellcheck-suppressed", active },
    "*",
  );
}

function startDomObserver(): void {
  if (domObserver) return;

  domObserver = new MutationObserver((mutations) => {
    if (!suppressing) return;

    for (const mutation of mutations) {
      if (mutation.type === "attributes" && mutation.target instanceof HTMLElement) {
        if (mutation.attributeName === "spellcheck" && mutation.target.spellcheck) {
          suppressElementSpellcheck(mutation.target);
        }
        continue;
      }

      for (const node of mutation.addedNodes) {
        if (node instanceof HTMLElement) {
          scan(node, suppressElementSpellcheck);
        }
      }
    }
  });

  domObserver.observe(document.documentElement, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ["spellcheck"],
  });
}

function stopDomObserver(): void {
  domObserver?.disconnect();
  domObserver = null;
}

export function setNativeSpellcheckSuppressed(active: boolean): void {
  if (active === suppressing) return;
  suppressing = active;

  injectGlobalStyle(active);

  if (active) {
    scan(document, suppressElementSpellcheck);
    startDomObserver();
    notifyGoogleDocs(true);
    return;
  }

  stopDomObserver();
  scan(document, restoreElement);
  notifyGoogleDocs(false);
}

export function isNativeSpellcheckSuppressed(): boolean {
  return suppressing;
}
