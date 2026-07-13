# LinguaCheck

Chrome extension (Manifest V3) that checks **spelling and grammar in real time** as you type on the web. Inspired by tools like LanguageTool and Grammarly, built with TypeScript, Vite, and the [LanguageTool API](https://dev.languagetool.org/public-http-api).

**Privacy policy:** https://joelng25.github.io/lingua-check/

---

## Features

- Real-time underlines for spelling and grammar errors
- Tooltip with suggestions, apply, ignore, and add to dictionary
- Side panel with full error list and category stats
- Keyboard shortcut: `Ctrl + .` (Mac: `Cmd + .`) to apply the first suggestion
- Badge on the extension icon showing error count per tab
- Personal dictionary and ignored grammar rules
- Per-site enable/disable
- Optional custom LanguageTool server (e.g. localhost)
- Site-specific adapters for popular web apps

---

## Supported sites

| Site | Adapter |
|------|---------|
| Gmail | `gmail.ts` |
| Google Docs | `google-docs.ts` + `gdocs-bootstrap.ts` |
| LinkedIn | `linkedin.ts` |
| X (Twitter) | `twitter.ts` |
| Slack | `slack.ts` |
| Reddit | `reddit.ts` |
| Discord | `discord.ts` |
| WhatsApp Web | `whatsapp.ts` |
| Any other site | `generic.ts` (inputs, textareas, contenteditable) |

---

## Tech stack

- **Manifest V3**
- **TypeScript**
- **Vite** + [@crxjs/vite-plugin](https://crxjs.dev/vite-plugin)
- **LanguageTool API** for grammar checking
- **chrome.storage.sync** for settings
- **chrome.sidePanel** for the error list UI

---

## Project structure

```
lingua-check/
├── src/
│   ├── manifest.json           # Extension manifest (source)
│   ├── background/
│   │   └── service-worker.ts   # API calls, cache, badge, panel state
│   ├── content/
│   │   ├── index.ts            # Main content script entry
│   │   ├── field-adapter.ts    # Input / textarea / contenteditable adapters
│   │   ├── google-docs-adapter.ts
│   │   ├── gdocs-bootstrap.ts  # Google Docs canvas whitelist injection
│   │   ├── overlay.ts          # Underlines + tooltip UI
│   │   ├── shortcuts.ts        # Keyboard + message handlers
│   │   └── sites/              # Per-site field detection
│   │       ├── registry.ts
│   │       ├── generic.ts
│   │       ├── gmail.ts
│   │       ├── google-docs.ts
│   │       └── ...
│   ├── popup/                  # Toolbar popup
│   ├── options/                # Settings page
│   ├── sidepanel/              # Side panel error list
│   ├── shared/
│   │   ├── checker.ts          # LanguageTool API client
│   │   ├── storage.ts          # chrome.storage helpers
│   │   ├── types.ts
│   │   ├── constants.ts
│   │   ├── match-filters.ts
│   │   └── panel-state.ts
│   ├── styles/
│   │   └── overlay.css
│   └── icons/
├── docs/
│   └── index.html              # Privacy policy (GitHub Pages)
├── store/                      # Chrome Web Store assets & copy
├── scripts/
│   ├── generate-icons.mjs
│   └── package-store.mjs       # Build ZIP for store upload
├── dist/                       # Production build (gitignored)
└── release/                    # Store ZIP packages (gitignored)
```

---

## Architecture

```
User types in editable field
        │
        ▼
Content script (site adapter → field adapter)
        │ debounce
        ▼
Service worker ──POST──► LanguageTool API
        │
        ▼
Matches filtered (dictionary, ignored rules)
        │
        ├──► Overlay (underlines + tooltip)
        ├──► Badge count
        └──► Side panel state (chrome.storage.session)
```

### Message types (content ↔ background)

| Type | Purpose |
|------|---------|
| `CHECK_TEXT` | Send text to LanguageTool, return matches |
| `UPDATE_BADGE` | Set error count on extension icon |
| `UPDATE_PANEL` | Sync matches to side panel |
| `ADD_TO_DICTIONARY` | Save word to personal dictionary |
| `IGNORE_RULE` | Persist ignored grammar rule |
| `APPLY_FIRST_SUGGESTION` | Command shortcut handler |
| `APPLY_MATCH` | Apply correction from side panel |
| `HIGHLIGHT_MATCH` | Scroll to / flash underline |

---

## Development

### Prerequisites

- Node.js 18+
- Google Chrome 116+

### Install

```bash
git clone https://github.com/joelng25/lingua-check.git
cd lingua-check
npm install
```

### Dev mode (hot reload)

```bash
npm run dev
```

Load the extension in Chrome:

1. Open `chrome://extensions`
2. Enable **Developer mode**
3. **Load unpacked** → select the `dist/` folder

### Production build

```bash
npm run build
```

### Package for Chrome Web Store

```bash
npm run package:store
```

Output: `release/lingua-check-v{version}.zip`

---

## Configuration

Open extension **Options** or the popup:

| Setting | Description |
|---------|-------------|
| Language | `es`, `en-US`, `en-GB`, `fr`, `de`, `pt-BR` |
| Debounce | Delay before checking (ms) |
| Personal dictionary | Words to never flag as errors |
| Ignored rules | Grammar rules to skip globally |
| API URL | Optional custom LanguageTool server |

Default API: `https://api.languagetool.org/v2/check`

---

## Adding a new site adapter

1. Create `src/content/sites/mysite.ts`:

```typescript
import { createFieldAdapter } from "../field-adapter";
import { matchesHost, queryFields, resolveFieldFromSelectors, type SiteAdapter } from "./types";

export const mySiteAdapter: SiteAdapter = {
  id: "mysite",
  label: "My Site",
  matches: (hostname) => matchesHost(hostname, ["example.com"]),
  getFieldSelectors: () => ["div.editor[contenteditable='true']"],
  getExcludeSelectors: () => ["input[type='search']"],
  resolveField: (target) => resolveFieldFromSelectors(target, ["div.editor[contenteditable='true']"], []),
  createAdapter: (element) => createFieldAdapter(element),
};
```

2. Register it in `src/content/sites/registry.ts`
3. Rebuild and test on the target site

---

## Chrome Web Store

See [`store/PUBLISH.md`](store/PUBLISH.md) for the full publishing guide.

| Store form field | Value |
|------------------|-------|
| Single purpose | Real-time spelling and grammar checking in web text fields |
| Remote code | **No** (only JSON API responses, no remote JS execution) |
| Privacy policy | https://joelng25.github.io/lingua-check/ |

Listing copy: [`store/LISTING.md`](store/LISTING.md)

---

## Privacy

LinguaCheck sends text from **active editable fields** to the LanguageTool API (or your custom server) to obtain suggestions. Settings are stored locally in `chrome.storage.sync`. We do not sell data or create user accounts.

Full policy: [`docs/index.html`](docs/index.html) · [Live URL](https://joelng25.github.io/lingua-check/)

---

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Development build with HMR |
| `npm run build` | Production build → `dist/` |
| `npm run package:store` | Build + ZIP for Chrome Web Store |
| `npm run icons` | Regenerate placeholder icons |

---

## Contact

**joelnogao625@gmail.com**

---

## Acknowledgements

- [LanguageTool](https://languagetool.org) — grammar checking API
- [@crxjs/vite-plugin](https://crxjs.dev/vite-plugin) — Vite integration for Chrome extensions
