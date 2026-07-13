const extensionId = chrome.runtime.id;

const script = document.createElement("script");
script.textContent = `window._docs_annotate_canvas_by_ext = ${JSON.stringify(extensionId)};`;
(document.documentElement || document.head).appendChild(script);
script.remove();
