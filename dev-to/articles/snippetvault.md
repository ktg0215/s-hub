---
title: "Best Chrome Extension for Code Snippets - VS Code-Style Snippet Manager"
published: true
tags: ["chromeextension","snippets","productivity","webdev"]
series: null
canonical_url: null
publish_date: "2026-04-11"
main_image: "https://dev-tools-hub.xyz/screenshots/SnippetVault/screenshot-01.png"
devto_id: "3392105"
---

Every developer has a folder of code snippets somewhere. Maybe it is a Notion page, a GitHub Gist collection, a random `.txt` file on the desktop, or a pile of sticky notes in the back of your IDE. The problem is not saving snippets -- it is finding them again when you need them. And more importantly, getting them into the place where you actually write code: the browser.

I spend a lot of my coding time inside browser-based tools. GitHub PRs, CodeSandbox, StackBlitz, Jupyter notebooks, CMS editors, CI/CD config panels. Whenever I needed a snippet, the flow was always the same: switch to VS Code, open the snippets file, copy, switch back, paste. Over and over.

So I built **SnippetVault** -- a Chrome extension that brings VS Code-style snippet management directly into the browser, complete with syntax highlighting, slash commands, smart variables, and fuzzy search.

## The Architecture: React + Zustand + Prism.js in Manifest V3

SnippetVault is built on Chrome's Manifest V3 platform. The tech stack is React 18 for the popup UI, Zustand for state management, Prism.js for syntax highlighting, and Fuse.js for fuzzy search. The build tooling is Vite with TypeScript.

The extension has three main components:

1. **Popup UI** -- The main interface where you create, edit, search, and organize snippets
2. **Background service worker** -- Handles storage operations and manages the ExtensionPay license state
3. **Content script** -- Injects the slash command handler into every page

Here is how the snippet data model looks:

```typescript
interface Snippet {
  id: string;
  title: string;
  code: string;
  language: string;
  tags: string[];
  category: 'code' | 'prompt' | 'template';
  createdAt: number;
  updatedAt: number;
  isFavorite: boolean;
  isPinned: boolean;
  usageCount: number;
  lastUsedAt: number | null;
  trigger?: string;           // Slash command trigger
  variables?: SnippetVariable[];  // Smart variable definitions
  links?: string[];           // Bidirectional links to other snippets
}
```

Three things worth calling out here. First, the `category` field distinguishes between raw code snippets, AI prompts, and text templates. Developers keep all three kinds of reusable text, and mixing them together makes search results noisy. Second, the `usageCount` and `lastUsedAt` fields let the search ranking prioritize frequently-used snippets. Third, `trigger` is the key to the slash command system, which I will get into next.

## Slash Commands: The Feature That Changed Everything

The popup works fine for browsing and organizing, but the real productivity gain comes from slash commands. Type `/` in any text input on any webpage, and SnippetVault shows an autocomplete popup with your snippets. Select one and it gets inserted directly.

The content script is injected at `document_idle` on all URLs. It listens for `input` events on text fields and textareas:

```typescript
function handleInput(e: Event): void {
  if (isComposing) return;

  const target = e.target as HTMLInputElement | HTMLTextAreaElement;
  if (!isTextInput(target)) return;

  const value = target.value;
  const cursorPos = target.selectionStart || 0;
  const textBefore = value.substring(0, cursorPos);
  const lastSlash = textBefore.lastIndexOf('/');

  if (lastSlash >= 0) {
    const charBefore = lastSlash > 0 ? textBefore[lastSlash - 1] : ' ';
    if (charBefore === ' ' || charBefore === '\n' || lastSlash === 0) {
      const query = textBefore.substring(lastSlash + 1);

      // Don't trigger on URLs or paths
      if (query.includes('://') || query.includes('\\')) {
        hidePopup();
        return;
      }

      currentInput = target;
      triggerStart = lastSlash;
      showPopup(target, query);
      return;
    }
  }
  hidePopup();
}
```

There are a few subtle decisions here. The slash must appear at the start of the line or after whitespace -- this prevents false positives inside URLs, file paths, and regular text that happens to contain slashes. The `isComposing` check handles IME input for CJK languages, where keystrokes during composition should not trigger the popup.

The popup positions itself near the caret using `getBoundingClientRect()`, and for textareas it estimates the caret line by counting newlines in the text before the cursor. The popup itself is a `<div>` injected into the page DOM with `z-index: 2147483647` -- the maximum value -- to ensure it appears above everything else on the page.

## Smart Variables: Dynamic Snippet Expansion

Static snippets are useful, but real power comes when snippets can include dynamic content. SnippetVault supports built-in variables that expand at insertion time:

```typescript
const BUILT_IN_VARIABLES: Record<string, () => string | Promise<string>> = {
  DATE: () => new Date().toISOString().split('T')[0],
  TIME: () => new Date().toTimeString().split(' ')[0],
  DATETIME: () => new Date().toISOString(),
  CLIPBOARD: async () => await navigator.clipboard.readText(),
  SELECTION: () => window.getSelection()?.toString() || '',
  URL: () => window.location.href,
  TITLE: () => document.title,
};
```

So a snippet like this:

```
// File: ${TITLE}
// Date: ${DATE}
// Source: ${URL}
```

Gets expanded to real values when inserted. The `CLIPBOARD` variable is particularly useful -- you can build snippets that incorporate whatever you just copied.

On top of built-in variables, there are tab-stops using VS Code syntax: `${1:placeholder}`, `${2:name}`. The parser handles them in two passes -- first expanding built-in variables, then locating tab-stop positions so the cursor can jump between them.

## Fuzzy Search with Fuse.js

With dozens or hundreds of snippets, search performance matters. I chose Fuse.js for client-side fuzzy matching. It runs against the snippet title, tags, trigger name, and even the code body. The search results are weighted so that trigger matches rank highest, title matches come next, and code body matches are lowest priority.

The filtering happens entirely in memory since all snippets live in `chrome.storage.local`. For most users this is fast enough even with hundreds of snippets, since the data fits comfortably in the browser's storage quota. The `unlimitedStorage` permission removes the default 10MB cap.

## Syntax Highlighting with Prism.js

Each snippet is displayed with proper syntax highlighting. SnippetVault supports 18 languages out of the box: JavaScript, TypeScript, Python, HTML, CSS, SQL, JSON, Markdown, Go, Rust, Java, C#, PHP, Ruby, Shell, YAML, XML, and plain text.

Prism.js was chosen over alternatives like Shiki or Highlight.js because it is lightweight (much smaller bundle size), works synchronously (no async loading of language grammars), and renders quickly in the popup where startup time matters.

## Organizing Snippets: Tags, Categories, and Favorites

The UI offers multiple ways to organize your collection:

- **Categories**: Code, Prompt, and Template -- filter by the type of content
- **Tags**: Freeform labels attached to each snippet
- **Favorites**: Star important snippets for quick access
- **Pinned**: Pin your most-used snippets to the top of the list

The popup has a tab bar at the top that switches between these views. This was a deliberate UX decision -- rather than forcing users to think in folders or hierarchies, the extension lets them slice the same collection multiple ways.

## One-Click Copy and Usage Tracking

The most common action is copying a snippet to the clipboard. Every snippet card has a copy button that uses the `clipboardWrite` permission to write to the system clipboard. The extension tracks how many times each snippet has been copied or inserted via slash commands, and the `usageCount` feeds back into search ranking.

This creates a virtuous cycle: the more you use a snippet, the easier it becomes to find. Over time, your most frequently needed snippets float to the top naturally.

## The Hard Part: Content Script Isolation

One challenge with injecting UI into arbitrary web pages is CSS isolation. The popup that appears during slash commands needs to look consistent regardless of the host page's styles. Some sites apply aggressive global CSS resets. Others use CSS frameworks that target common class names.

The solution was to use highly specific CSS selectors prefixed with `snippetvault-` and `sv-` class names, combined with explicit property declarations that override any inherited values. The popup also supports both light and dark modes via `prefers-color-scheme` media queries, so it blends naturally with the user's system preference.

```css
.snippetvault-popup {
  position: absolute;
  z-index: 2147483647;
  width: 320px;
  max-height: 320px;
  background: #1a1a1a;
  border: 1px solid #404040;
  border-radius: 8px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
  font-family: system-ui, -apple-system, BlinkMacSystemFont,
               'Segoe UI', Roboto, sans-serif;
  font-size: 13px;
}
```

Every property is set explicitly -- no reliance on inheritance from the page. This is defensive CSS for hostile environments.

## Freemium with ExtensionPay

SnippetVault uses a freemium model powered by ExtensionPay. The free tier gives you full snippet management. Pro unlocks advanced features. ExtensionPay handles payment processing and license verification through a content script that runs on `extensionpay.com/*`.

One lesson learned: always verify the payment state from the background service worker, not from the popup. The popup can be opened and closed freely, and checking license state every time it opens adds unnecessary latency. Instead, the service worker caches the license state and pushes updates to the popup when it changes.

## What I Learned Building This

**1. Manifest V3 service workers are not persistent.** Unlike Manifest V2 background pages, service workers can be terminated at any time. All state must be persisted to `chrome.storage` and reloaded on activation. This affected the design of the usage tracking system -- every increment writes to storage immediately rather than batching.

**2. Content scripts run in an isolated world, but share the DOM.** The slash command popup is part of the page DOM but runs in the content script's JavaScript context. This means event handlers attached to popup elements work normally, but the popup must be careful not to interfere with the page's own event handling. The `stopPropagation()` call on click events inside the popup prevents the host page from intercepting clicks meant for snippet selection.

**3. Keyboard shortcut conflicts are real.** The extension registers `Ctrl+Shift+S` as the default shortcut to open the popup. But many websites and other extensions also use this combination. Chrome's `commands` API handles the conflict resolution, but users may need to change the shortcut via `chrome://extensions/shortcuts`.

**4. The clipboard API is async and requires user gesture.** `navigator.clipboard.readText()` needs a recent user interaction to work. When expanding the `${CLIPBOARD}` variable during slash command insertion, the user has just pressed Enter or Tab to select a snippet, which counts as a user gesture. But if you try to read the clipboard during a background timer or storage change event, it will fail silently.

## Try It Out

If you spend time writing code in browser-based tools -- whether it is GitHub, online IDEs, CMS platforms, or anywhere else -- SnippetVault puts your snippet library right where you need it. The slash command system means you never have to leave the page to grab a snippet.

The extension supports 18 programming languages, smart variables, fuzzy search, and one-click copy. It is free to install and use.

**[Install SnippetVault on Chrome Web Store](https://chromewebstore.google.com/detail/snippetvault/gnnmjklohcoaiheikefoifiekcnndcdi)**

---

*Other tools I've built:*

{% embed https://chromewebstore.google.com/detail/snapreply-for-gmail/pijandokkbhdejnoienhjmoicjapgpmk %}

**[PageMemo – Web Page Notes](https://chromewebstore.google.com/detail/jmpmfbheoclfmceceihjpcjlabakkdde)**
