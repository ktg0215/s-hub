---
title: "I Built a Chrome Extension That Automatically Creates Step-by-Step Guides from Your Browser Actions"
published: true
tags: ["chromeextension","documentation","productivity","tutorial"]
series: null
canonical_url: null
publish_date: "2026-04-14"
main_image: "https://dev-tools-hub.xyz/screenshots/procshot/screenshot-01.png"
devto_id: "3392104"
---

Documentation is the thing everyone agrees is important and nobody wants to write. Especially step-by-step guides. You know the type -- those internal wiki pages that show new team members how to configure the CI pipeline, or the customer support articles that walk users through a multi-step process with screenshots at every turn.

Writing these guides by hand is miserable. You do the task. You take a screenshot. You crop it. You write a description. You do the next step. You take another screenshot. You crop it. You write another description. The process of documenting the process takes five times longer than the process itself.

So I built **Procshot** (short for Procedure Shot) -- a Chrome extension that records your browser actions and automatically generates a step-by-step guide with annotated screenshots. You click "Record," do the thing, click "Stop," and you have a guide ready to export as HTML, Markdown, or PDF.

## How It Works: Action Capture Pipeline

The extension has three main pieces: a content script that detects user actions, a background service worker that captures screenshots, and a popup UI for managing recordings and guides.

When recording starts, the content script attaches event listeners to the page:

```typescript
type ActionType =
  | "click"
  | "input"
  | "select"
  | "navigation"
  | "scroll"
  | "keypress"
  | "start";
```

Each action type maps to a different user interaction. Clicks on buttons and links, text input into fields, dropdown selections, page navigations, scroll events, and keypress events are all captured. The "start" action is a special initial capture that screenshots the starting state before any interaction.

For each action, the content script analyzes the target DOM element and sends the information to the background service worker:

```typescript
interface UserActionPayload {
  actionType: ActionType;
  elementInfo: ElementInfo;
  url: string;
  pageTitle: string;
  timestamp: number;
  elementRect?: ElementRect;
  viewportSize?: ViewportSize;
  preScreenshot?: string;
}
```

The `preScreenshot` field handles a tricky timing problem. When a user clicks a link that triggers navigation, the screenshot needs to capture the page before the navigation happens, not after. The content script captures a screenshot immediately on click and sends it along with the action payload, so the background service worker has the before-state even if the page has already navigated by the time it processes the event.

## DOM Analysis: Turning Raw Clicks into Readable Descriptions

The hardest engineering challenge was generating meaningful step descriptions from raw DOM events. When a user clicks a `<div class="css-1abc2de">Submit</div>`, the guide should say "Click the Submit button," not "Click the div element."

The DOM analyzer resolves raw click targets up and down the DOM tree:

```typescript
function resolveActionTarget(rawEl: Element): Element {
  // 1. Walk UP to find an interactive ancestor
  const ancestor = findInteractiveAncestor(rawEl);
  if (ancestor) return ancestor;

  // 2. If raw element is generic, walk DOWN for meaningful child
  const tag = rawEl.tagName.toLowerCase();
  if (GENERIC_TAGS.has(tag)) {
    const directText = getDirectText(rawEl);
    if (directText.length > 0 && directText.length <= 60) {
      return rawEl;
    }
    const child = findMeaningfulChild(rawEl);
    if (child) return child;
  }

  return rawEl;
}
```

This two-direction resolution is essential. Consider this common HTML pattern:

```html
<button class="submit-btn">
  <svg>...</svg>
  <span>Submit Order</span>
</button>
```

If the user clicks the SVG icon inside the button, the raw event target is the `<svg>`. Walking UP finds the `<button>` ancestor, which is the semantically meaningful element. Conversely, if the user clicks a large `<div>` container, walking DOWN finds the first button, link, or heading inside it.

The label extraction uses a priority chain: `aria-label`, then `aria-labelledby` reference, then `<label for="...">`, then placeholder text, then the `title` attribute, and finally clean text content. For links, there is special handling that checks inner image `alt` text, SVG title elements, and even derives readable text from the URL path as a last resort.

Noise filtering is critical. Modern pages are full of icon fonts and CSS ligature names -- elements whose "text content" is `open_in_new` or `chevron_right` or `arrow_forward`. The analyzer strips these out:

```typescript
const NOISE_TEXT_PATTERNS = [
  /^(open_in_new|close|menu|search|arrow_\w+|chevron_\w+|expand_\w+|navigate_\w+|more_\w+|add|remove|delete|edit|star|favorite|share|thumb_up|visibility|check|check_circle)$/i,
  /^\d+$/,
];
```

The result is that `<button><span class="material-icons">close</span> Cancel</button>` produces the label "Cancel" rather than "close Cancel" or just "close."

## Multilingual Step Descriptions: 8 Languages from One Action

Every step description is generated in the user's language. Procshot supports Japanese, English, Spanish, Portuguese, French, German, Korean, and Simplified Chinese. The step generator uses template functions for each action type and language combination:

```typescript
// Click -- button with label
const clickButtonLabel: Record<StepLang, (label: string) => string> = {
  ja: (l) => `${l}ボタンをクリックします`,
  en: (l) => `Click the ${l} button`,
  es: (l) => `Haz clic en el boton ${l}`,
  fr: (l) => `Cliquez sur le bouton ${l}`,
  de: (l) => `Klicken Sie auf die Schaltflache ${l}`,
  ko: (l) => `${l} 버튼을 클릭합니다`,
  zh_CN: (l) => `点击${l}按钮`,
  pt_BR: (l) => `Clique no botao ${l}`,
};
```

There are templates for every combination of action type and context: click with label, click without label, link clicks, checkbox toggles, input fields with different types (email, password, search, phone), dropdown selections, navigation events, scroll directions, and generic clicks on unknown elements.

The quoting function adapts to language conventions -- Japanese uses corner brackets, while Western languages use straight double quotes:

```typescript
function q(lang: StepLang, label: string): string {
  switch (lang) {
    case "ja": return `「${label}」`;
    case "ko": return `"${label}"`;
    default: return `"${label}"`;
  }
}
```

This attention to typographic detail makes the generated guides look polished in every language, not like machine-translated English.

## Screenshot Capture and Storage with IndexedDB

Each step includes a full-page screenshot captured at the moment of the action. The background service worker uses `chrome.tabs.captureVisibleTab()` to take the screenshot, then stores it as a Blob in IndexedDB.

```typescript
interface ProcshotDB extends DBSchema {
  guides: {
    key: string;
    value: GuideData;
    indexes: { "by-date": number };
  };
  screenshots: {
    key: string;
    value: Blob;
  };
}
```

Why IndexedDB instead of `chrome.storage.local`? Size. A single screenshot at full resolution is typically 200-500KB as a PNG. A guide with 15 steps means 3-7.5MB of image data. Chrome's storage API was not designed for this volume of binary data -- it serializes everything to JSON, which doubles the size for binary blobs. IndexedDB stores Blobs natively and handles large datasets efficiently.

The guide metadata (steps, descriptions, timestamps) lives in the `guides` object store, while the actual screenshot Blobs are in a separate `screenshots` store. This separation means listing all guides is fast -- you only load the metadata, not the images.

## Annotations: Highlight, Arrow, Text, and Blur

Raw screenshots are informative, but annotated screenshots are instructive. Procshot includes annotation tools that let you mark up screenshots after recording:

```typescript
type AnnotationType = "highlight" | "arrow" | "text" | "blur";

interface Annotation {
  id: string;
  type: AnnotationType;
  startX: number;  // Relative coordinates (0-1)
  startY: number;
  endX: number;
  endY: number;
  text?: string;
  color: string;
  strokeWidth: number;
}
```

Annotations are stored as relative coordinates (0 to 1 range) rather than pixel values. This makes them resolution-independent -- if the guide is exported at a different resolution or the screenshot is resized, the annotations scale correctly.

The rendering uses Canvas 2D:

```typescript
function renderAnnotations(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  annotations: Annotation[]
): void {
  for (const ann of annotations) {
    const x1 = ann.startX * width;
    const y1 = ann.startY * height;
    const x2 = ann.endX * width;
    const y2 = ann.endY * height;

    switch (ann.type) {
      case "highlight":
        drawHighlight(ctx, x1, y1, x2 - x1, y2 - y1, ann.color, ann.strokeWidth);
        break;
      case "arrow":
        drawArrow(ctx, x1, y1, x2, y2, ann.color, ann.strokeWidth);
        break;
      case "text":
        drawText(ctx, x1, y1, ann.text ?? "", ann.color, width);
        break;
      case "blur":
        applyBlur(ctx, x1, y1, x2 - x1, y2 - y1);
        break;
    }
  }
}
```

The blur annotation is particularly useful for documentation that will be shared externally -- it lets you hide sensitive information (emails, account numbers, personal data) directly in the screenshot without post-processing in an image editor.

Auto-highlighting is also built in. Since the content script captures the bounding rectangle of the clicked element (`elementRect` and `viewportSize`), the guide viewer can automatically draw a highlight box around the action target on each screenshot. Users see exactly where to click without any manual annotation.

## Export Formats: HTML, Markdown, and PDF

A guide is only useful if it can be shared. Procshot exports to three formats:

**HTML** generates a self-contained HTML file with inline CSS and base64-encoded images. No external dependencies. You can drop it into a wiki, attach it to an email, or host it on any static file server. The exported HTML includes step numbers, descriptions, and annotated screenshots in a clean, printable layout.

**Markdown** produces a `.md` file with image references. This is ideal for developers who want to drop guides into GitHub repos, Confluence pages, or static site generators. The images are exported as separate files referenced from the Markdown.

**PDF** uses html2pdf.js to render the HTML export into a PDF document. This is the most portable format for non-technical users -- customers, stakeholders, and team members who just need to follow instructions.

The PDF export is a Pro feature, along with annotations. The free tier allows up to 5 guides per month with HTML and Markdown export. This creates a natural upgrade path: users who find value in the tool for personal use can unlock professional features when they need to share polished documentation.

## The Freemium Model with ExtensionPay

Procshot uses ExtensionPay for payment processing. The paywall logic runs in the background:

```typescript
// Free tier: 5 guides per month
// Pro: Unlimited guides + PDF export + annotations
```

The free tier is generous enough to be genuinely useful. Five guides per month covers most personal documentation needs. The Pro upgrade makes sense for people who create guides regularly -- support teams, technical writers, trainers, and developers documenting processes for their teams.

The monthly guide count resets on the first of each month. When a user hits the limit, the extension shows an upgrade prompt with a clear count of remaining guides rather than a hard block. This respects the user's workflow -- they can still view and export existing guides, they just cannot start new recordings.

## The Content Script: Capturing Actions Without Breaking Pages

The content script needs to intercept user actions without interfering with the page's functionality. A click on a "Submit Order" button must still submit the order -- the extension just needs to know it happened.

The approach is entirely passive. Event listeners are attached in capture phase but never call `preventDefault()` or `stopPropagation()`. The content script observes events, extracts information from the target element, sends a message to the background, and lets the event continue its normal propagation.

```javascript
document.addEventListener('click', handleClick, true);  // Capture phase
```

Using the capture phase (the `true` parameter) ensures the extension sees events even on elements where the page has called `stopPropagation()`. This is important for SPAs that use event delegation patterns where clicks are handled at the root and never propagate normally.

For input events, the content script waits for the user to stop typing (debounced) before recording the step. Recording every keystroke would produce a guide with 50 steps just for typing a URL. The debounce captures the final value after a pause.

Navigation events are detected through the `chrome.webNavigation` API in the background service worker rather than through content script events. This catches both same-page navigations (History API pushes) and full page loads.

## Building with React 19, Vite, and Tailwind v4

The extension is built with React 19, Vite 6, and Tailwind CSS v4. The Tailwind v4 integration uses the `@tailwindcss/vite` plugin, which is the new first-class Vite integration that replaces the PostCSS-based approach from v3.

TypeScript is used throughout the project. The type definitions for Chrome APIs come from `@types/chrome`. The `idb` library provides typed wrappers for IndexedDB, and `jszip` handles bundling multiple files for the Markdown export (images + `.md` file in a single `.zip` download).

The build pipeline has a post-build step (`scripts/post-build.js`) that processes the output for Chrome Web Store submission. Service workers need special bundling treatment in Manifest V3, and the post-build script ensures all paths are correct in the final output.

## Technical Lessons Learned

**1. Screenshot timing is everything.** When a user clicks a navigation link, you need the screenshot before the page unloads. The content script pre-captures a screenshot on the click event and sends it with the action payload. If the navigation is fast (which it usually is), the `chrome.tabs.captureVisibleTab()` call in the background would capture the new page, not the old one. The pre-capture solves this.

**2. IndexedDB in service workers has quirks.** The `idb` library (which wraps IndexedDB with Promises) works in service workers, but you need to handle the case where the service worker terminates mid-transaction. Transactions that span an `await` boundary can fail silently if the worker is killed. The solution is to keep transactions short and to not await across transaction boundaries.

**3. DOM analysis requires defense in depth.** No single strategy works for extracting element labels. Some pages use `aria-label`, others use `<label for>`, others have text content, and others have none of the above. The priority chain in the DOM analyzer handles these cases gracefully, always falling back to the next strategy rather than returning an empty label.

**4. Relative coordinates for annotations were the right call.** Storing annotation positions as percentages rather than pixels means they survive resolution changes, zoom levels, and export to different formats. The math is trivial (multiply by width/height), and the flexibility is significant.

**5. Blob storage in IndexedDB outperforms chrome.storage for binary data by an order of magnitude.** A test with 20 screenshots showed chrome.storage taking 4-5 seconds for a round trip (serialize to base64, store, retrieve, deserialize) versus under 200ms for IndexedDB with native Blob storage. For a tool that captures screenshots on every user action, this difference is visible to the user.

## Try It Out

If you have ever spent an afternoon screenshotting and annotating a step-by-step guide that could have been recorded in three minutes, Procshot is for you. Hit record, do the task, stop recording, and export. The guide writes itself.

The free tier gives you 5 guides per month with HTML and Markdown export. Pro adds unlimited guides, PDF export, and screenshot annotations with highlight boxes, arrows, text labels, and blur for sensitive data.

{% embed https://dev-tools-hub.xyz/extensions/procshot %}

---

*Other tools I've built:*

**[PageMemo – Web Page Notes](https://chromewebstore.google.com/detail/jmpmfbheoclfmceceihjpcjlabakkdde)**

**[SnippetVault – Code Snippet Manager](https://chromewebstore.google.com/detail/snippetvault/gnnmjklohcoaiheikefoifiekcnndcdi)**
