/**
 * MAIN world, document_start.
 * Enables annotated canvas + precise replace for Google Docs.
 *
 * Important: do NOT drag-select by pixel ratio (proportional fonts overshoot
 * and Backspace then wipes the rest of the line). Instead: click at the
 * start of the error, Delete exactly N characters, then type the replacement.
 */
const DOCS_WHITELIST_ID = "oldceeleldhonbafppcapldpdifcinji";
const BRIDGE_SOURCE = "lingua-check";

const win = window as Window & {
  _docs_annotate_canvas_by_ext?: string;
};

win._docs_annotate_canvas_by_ext = DOCS_WHITELIST_ID;

try {
  if (!document.getElementById(DOCS_WHITELIST_ID)) {
    const marker = document.createElement("div");
    marker.id = DOCS_WHITELIST_ID;
    marker.setAttribute("data-lingua-check", "docs-whitelist");
    marker.style.display = "none";
    (document.documentElement || document.head).appendChild(marker);
  }
} catch {
  // ignore
}

patchUserActivation();

window.addEventListener("message", (event: MessageEvent) => {
  if (event.source !== window) return;
  const data = event.data as DocsBridgeCommand | null;
  if (!data || data.source !== BRIDGE_SOURCE || data.type !== "replace") return;
  handleDocsCommand(data);
});

interface DocsBridgeCommand {
  source: typeof BRIDGE_SOURCE;
  type: "replace";
  clientX: number;
  endClientX?: number;
  clientY: number;
  selectLength: number;
  replacement: string;
}

function patchUserActivation(): void {
  try {
    const activation = navigator.userActivation;
    if (!activation) return;
    const proto = Object.getPrototypeOf(activation);
    Object.defineProperty(proto, "isActive", {
      configurable: true,
      get: () => true,
    });
    Object.defineProperty(proto, "hasBeenActive", {
      configurable: true,
      get: () => true,
    });
  } catch {
    try {
      Object.defineProperty(navigator, "userActivation", {
        configurable: true,
        get: () => ({
          get isActive() {
            return true;
          },
          get hasBeenActive() {
            return true;
          },
        }),
      });
    } catch {
      // ignore
    }
  }
}

function getTextEventIframe(): HTMLIFrameElement | null {
  return document.querySelector<HTMLIFrameElement>("iframe.docs-texteventtarget-iframe");
}

function focusDocsEditor(): {
  iwin: Window & typeof globalThis;
  idoc: Document;
} | null {
  const iframe = getTextEventIframe();
  const iwin = iframe?.contentWindow as (Window & typeof globalThis) | null | undefined;
  const idoc = iframe?.contentDocument;
  if (!iframe || !iwin || !idoc) return null;

  iframe.focus();
  const editable =
    idoc.querySelector<HTMLElement>("[contenteditable='true']") ||
    idoc.querySelector<HTMLElement>("[role='textbox']") ||
    idoc.body;
  editable?.focus();
  return { iwin, idoc };
}

function hitTarget(clientX: number, clientY: number): Element {
  return (
    document.elementFromPoint(clientX, clientY) ||
    document.querySelector(".kix-canvas-tile-content") ||
    document.querySelector(".kix-appview-editor") ||
    document.body
  );
}

function clickAt(clientX: number, clientY: number): void {
  const target = hitTarget(clientX, clientY);
  const x = Math.round(clientX);
  const y = Math.round(clientY);
  for (const type of ["mousedown", "mouseup", "click"] as const) {
    target.dispatchEvent(
      new MouseEvent(type, {
        bubbles: true,
        cancelable: true,
        view: window,
        clientX: x,
        clientY: y,
        button: 0,
        buttons: type === "mousedown" ? 1 : 0,
      }),
    );
  }
}

function dispatchKey(
  iwin: Window & typeof globalThis,
  idoc: Document,
  type: "keydown" | "keypress" | "keyup",
  init: {
    key: string;
    code: string;
    keyCode: number;
    shiftKey?: boolean;
    ctrlKey?: boolean;
  },
): void {
  const ev = new iwin.KeyboardEvent(type, {
    bubbles: true,
    cancelable: true,
    composed: true,
    view: iwin,
    key: init.key,
    code: init.code,
    keyCode: init.keyCode,
    charCode: type === "keypress" ? init.keyCode : 0,
    which: init.keyCode,
    shiftKey: Boolean(init.shiftKey),
    ctrlKey: Boolean(init.ctrlKey),
    repeat: false,
    isComposing: false,
  } as KeyboardEventInit);

  try {
    Object.defineProperties(ev, {
      keyCode: { get: () => init.keyCode },
      which: { get: () => init.keyCode },
      charCode: { get: () => (type === "keypress" ? init.keyCode : 0) },
      key: { get: () => init.key },
      code: { get: () => init.code },
    });
  } catch {
    // ignore
  }

  idoc.dispatchEvent(ev);
}

function pressSpecial(
  iwin: Window & typeof globalThis,
  idoc: Document,
  key: string,
  code: string,
  keyCode: number,
  mods: { shiftKey?: boolean; ctrlKey?: boolean } = {},
): void {
  dispatchKey(iwin, idoc, "keydown", { key, code, keyCode, ...mods });
  dispatchKey(iwin, idoc, "keyup", { key, code, keyCode, ...mods });
}

function pressChar(iwin: Window & typeof globalThis, idoc: Document, char: string): void {
  if (char === "\n") {
    pressSpecial(iwin, idoc, "Enter", "Enter", 13);
    return;
  }

  const codePoint = char.codePointAt(0) ?? 0;
  const lower = char.toLowerCase();
  const isAsciiLetter = /^[a-zA-Z]$/.test(char);
  const code = isAsciiLetter
    ? `Key${lower.toUpperCase()}`
    : char === " "
      ? "Space"
      : "Unidentified";

  // Send the real character in `key` / keyCode. Do NOT use shiftKey for
  // capitals — Docs inserts from keypress charCode; shift-only keydown drops it.
  const init = {
    key: char,
    code,
    keyCode: codePoint,
  };

  dispatchKey(iwin, idoc, "keydown", init);
  dispatchKey(iwin, idoc, "keypress", init);
  dispatchKey(iwin, idoc, "keyup", init);
}

function typeTextSync(
  iwin: Window & typeof globalThis,
  idoc: Document,
  text: string,
): void {
  for (const char of text) {
    pressChar(iwin, idoc, char);
  }
}

function deleteCharsRight(
  iwin: Window & typeof globalThis,
  idoc: Document,
  count: number,
): void {
  const n = Math.max(0, Math.floor(count));
  for (let i = 0; i < n; i += 1) {
    pressSpecial(iwin, idoc, "Delete", "Delete", 46);
  }
}

function handleDocsCommand(command: DocsBridgeCommand): void {
  if (command.type !== "replace") return;

  const replacement = command.replacement ?? "";
  const deleteCount = Math.max(0, Math.floor(command.selectLength));
  // Aim slightly inside the first character so the caret lands at the start
  // of the error, not on the previous word.
  const clientX = command.clientX + 1;
  const clientY = command.clientY;

  clickAt(clientX, clientY);

  // One frame so Docs commits the caret, then delete exactly N chars to the right.
  requestAnimationFrame(() => {
    const ctx = focusDocsEditor();
    if (!ctx) return;

    const { iwin, idoc } = ctx;
    deleteCharsRight(iwin, idoc, deleteCount);

    if (replacement) {
      typeTextSync(iwin, idoc, replacement);
    }
  });
}
