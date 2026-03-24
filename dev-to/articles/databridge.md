---
title: "I Built a Chrome Extension That Transfers Data Between Web Pages Visually"
published: false
tags: ["chromeextension", "automation", "productivity", "forms"]
series: null
canonical_url: null
publish_date: "2026-04-16"
devto_id: null
---

Here is a workflow I used to do ten times a day: open a CRM page, find a customer's name, address, and email, switch to an invoice generator, type all three fields manually. Or: open a spreadsheet export in the browser, copy a cell value, switch to an admin panel form, paste it, go back, copy the next cell, switch again, paste again. Repeat for every row.

The data already exists on one page. I just need it on another page. But browsers do not have a built-in way to move data between tabs. Copy-paste is the only tool, and it handles one field at a time.

So I built **DataBridge** -- a Chrome extension that lets you visually select elements on a source page, visually select target fields on a destination page, and transfer all the data with one click. You click elements, they get numbered badges, and the numbers tell the extension which source maps to which target. Then you hit transfer and everything fills in.

## The Mental Model: Numbered Badges

The core UX concept is borrowed from screen recording tools that annotate click targets. When you enter selection mode on a source page, every element you click gets a numbered badge: 1, 2, 3. Then you switch to the target page, enter selection mode there, and click the target fields in the same order. Source element 1 maps to target element 1, source 2 to target 2, and so on.

This is more intuitive than building a mapping table with CSS selectors. Users do not need to know anything about the DOM. They just click what they see.

The content script manages the visual state:

```typescript
let isSelectionMode = false;
let currentMode: SelectionMode = null;
let selectedElements = new Map<number, Element>();
let elementToIndex = new Map<Element, number>();
let nextIndex = 1;

function selectElement(element: Element): void {
  const index = nextIndex++;
  selectedElements.set(index, element);
  elementToIndex.set(element, index);

  addHighlight(element, index);

  const selectorResult = generateSelector(element);
  const value = getElementValue(element);
  const label = findNearbyLabel(element);

  chrome.runtime.sendMessage({
    type: 'ELEMENT_SELECTED',
    data: {
      index,
      selector: selectorResult.primary,
      fallbackSelectors: selectorResult.fallbacks,
      value,
      tagName: element.tagName.toLowerCase(),
      label,
    },
  });
}
```

Two maps maintain the bidirectional relationship between elements and their indices. This enables both lookup directions: given an index, find the element (for data transfer); given an element, find its index (for deselection on second click). The deselection triggers a reindex operation that renumbers all remaining elements sequentially, so there are never gaps in the numbering.

## CSS Selector Generation: The Hard Problem

When the user clicks an element on the source page, DataBridge needs to generate a CSS selector that can reliably find the same element later -- even after a page refresh. This is harder than it sounds.

The naive approach -- using the element's class names -- breaks on any site that uses CSS Modules, styled-components, or Tailwind's JIT mode. The class `text-display--3jedW` or `css-1abc2de` will change on the next build.

DataBridge uses a multi-strategy selector generator that detects and avoids unstable class names:

```typescript
function isUnstableClass(className: string): boolean {
  // State classes and framework-specific classes
  if (/^(active|selected|hover|focus|ng-|v-|react-|dt-|css-|sc-|emotion-)/.test(className)) {
    return true;
  }
  // CSS Modules hash suffix (e.g., text-display--3jedW)
  if (/--[a-zA-Z0-9]{3,}$/.test(className)) {
    return true;
  }
  // Styled-components / Emotion hash classes
  if (/^(css|sc|emotion)-[a-zA-Z0-9]+$/.test(className)) {
    return true;
  }
  return false;
}
```

When all class names are unstable, the generator falls back to structural selectors: `nth-child` paths anchored to the nearest ancestor with a stable ID. The algorithm walks up the DOM tree looking for an element with an ID, then builds a path back down using `nth-child` indices. This is less readable but more reliable.

Every selector is generated with a confidence score. The primary selector (the most specific one) is used first, but fallback selectors are generated too. During data transfer, if the primary selector fails, the system tries each fallback in order:

```typescript
for (const { index, selector, fallbackSelectors } of selectors) {
  let element = document.querySelector(selector);

  if (!element && fallbackSelectors?.length > 0) {
    for (const fallback of fallbackSelectors) {
      try {
        element = document.querySelector(fallback);
        if (element) break;
      } catch { /* invalid selector */ }
    }
  }
}
```

This fallback chain means that even if the page structure changes slightly between selection and transfer (which happens on dynamic SPAs), the data usually lands in the right place.

## Setting Values: Framework-Aware Input

Finding the target element is only half the problem. Setting its value needs to work with React, Angular, Vue, and plain HTML. Just setting `element.value` is not enough -- React maintains its own internal state and ignores direct DOM mutations.

The solution is to dispatch synthetic events after setting the value:

```typescript
function setElementValue(element: Element, value: string): void {
  const tag = element.tagName.toLowerCase();

  if (tag === 'input') {
    const input = element as HTMLInputElement;
    if (input.type === 'checkbox' || input.type === 'radio') {
      input.checked = value === 'true';
    } else {
      input.value = value;
    }
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
  } else if (tag === 'textarea') {
    const textarea = element as HTMLTextAreaElement;
    textarea.value = value;
    textarea.dispatchEvent(new Event('input', { bubbles: true }));
    textarea.dispatchEvent(new Event('change', { bubbles: true }));
  } else if (tag === 'select') {
    const select = element as HTMLSelectElement;
    select.value = value;
    select.dispatchEvent(new Event('change', { bubbles: true }));
  }
}
```

Both `input` and `change` events are dispatched with `bubbles: true`. React's synthetic event system listens for bubbled events at the root, so the `bubbles` flag is essential. Without it, React controlled components silently reject the value change.

Select elements only need the `change` event -- they do not fire `input` events in normal browser behavior, and dispatching one could confuse framework event handlers.

For elements that are not standard form controls -- like `contentEditable` divs used by rich text editors -- we fall back to setting `textContent` directly. This works for simple cases but will not trigger framework reactivity in all editors. It is an honest limitation.

## Template System: Save and Reuse Mappings

The badge-based selection is fast for one-time transfers, but many data transfer tasks are repetitive. You move data from the same type of source page to the same type of target page, day after day.

DataBridge lets you save a mapping as a template:

```typescript
interface Template {
  id: string;
  name: string;
  sourceUrlPattern: string;
  targetUrlPattern: string;
  sourceTitle?: string;
  targetTitle?: string;
  mappings: Array<{
    sourceSelector: string;
    targetSelector: string;
    label?: string;
    savedValue?: string;
  }>;
  createdAt: string;
  updatedAt: string;
}
```

Templates store URL patterns (not exact URLs) for source and target pages, so they match across different records on the same site. When you load a template, the extension highlights the matched source and target elements on the current pages, so you can verify the mapping before executing the transfer.

The `savedValue` field is a fallback mechanism. Some source pages load data dynamically, and the element might be empty at the moment the transfer executes. By storing the value captured at template creation time, the user has the option to transfer saved values when live values are unavailable.

## The Side Panel Architecture

DataBridge uses Chrome's Side Panel API for its main interface. The side panel contains the mode switcher (source/target), the list of selected elements, template management, and the transfer button. The choice of side panel over popup is intentional -- the user needs to interact with the web page and the extension simultaneously.

The architecture follows a message-passing pattern:

1. **Side panel** sends commands to the **background service worker**
2. **Background** routes commands to the appropriate **content script** (source tab or target tab)
3. **Content script** executes DOM operations and sends results back
4. **Background** forwards results to the **side panel** for display

This three-layer architecture handles the cross-tab requirement. The source page and target page are in different tabs, each with their own content script instance. The background service worker knows which tab is which and routes messages accordingly.

```typescript
// Background service worker routes messages to the correct tab
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  switch (message.type) {
    case 'EXECUTE_TRANSFER':
      executeTransfer(); // Reads from source tab, writes to target tab
      break;
    case 'ELEMENT_SELECTED':
      // Forward to side panel for display
      updateSidePanel(message.data);
      break;
  }
});
```

## Smart Label Detection

When an element is selected, DataBridge tries to find a human-readable label for it. This is displayed in the side panel so users can verify their selections without memorizing index numbers.

The label detection walks through several strategies:

```typescript
function findNearbyLabel(element: Element): string | undefined {
  // 1. Explicit <label for="...">
  const id = element.id;
  if (id) {
    const label = document.querySelector(`label[for="${CSS.escape(id)}"]`);
    if (label) return label.textContent?.trim();
  }

  // 2. Wrapping <label>
  const parent = element.closest('label');
  if (parent) return parent.textContent?.trim();

  // 3. Adjacent <label>
  const prev = element.previousElementSibling;
  if (prev?.tagName.toLowerCase() === 'label') {
    return prev.textContent?.trim();
  }

  return undefined;
}
```

The `CSS.escape()` call on the ID is a subtle but important detail. Some sites use IDs with characters that are valid in HTML but invalid in CSS selectors (like colons or dots). Without escaping, `querySelector` would fail or match the wrong element.

## The Notepad Mode

Not all data transfer starts from a structured web page. Sometimes you have data in your head, in a text file, or in a chat message. For these cases, DataBridge includes a notepad mode -- a plain text area where you can type or paste values, one per line, and transfer them to form fields on a target page.

```typescript
interface NotepadData {
  content: string;           // Newline-separated values
  sourceTabId: number | null;
  sourceElements: SelectedElement[];
}
```

Each line in the notepad maps to a target field by position. Line 1 goes to target element 1, line 2 to target element 2, and so on. The notepad can also be saved as a template with `isNotepad: true`, creating reusable fill-in templates for forms you fill out frequently.

## Technical Challenges and Solutions

**Handling iframes.** The content script runs in all frames (`"all_frames": true` in the manifest), but element selection is restricted to the top frame. Cross-frame CSS selectors are not a thing -- a selector generated in an iframe would be meaningless in the top frame. This is a practical limitation: forms inside iframes cannot be targeted. Most modern sites avoid iframes for form content, so this rarely matters in practice.

**React's controlled components.** Setting `input.value` directly does not update React state. React listens for the native `input` event fired by the browser, but only if the event follows the internal event pipeline. Dispatching a synthetic `input` event with `bubbles: true` tricks React into processing the new value. This works with React 16+, but there are edge cases with React 19's concurrent features where event ordering can differ. In testing, the approach has been reliable.

**Element reindexing on deselection.** When the user deselects element 2 out of [1, 2, 3], the remaining elements need to become [1, 2]. The reindex operation clears both maps, iterates over the remaining elements in order, and rebuilds the indices from 1. It also updates the DOM badges to show the new numbers. This keeps the mapping intuitive -- source 1 always maps to target 1.

**Highlight positioning.** The numbered badges are positioned using `position: fixed` with coordinates from `getBoundingClientRect()`. This works well on static pages, but breaks when the page scrolls -- the badges stay in their initial viewport positions while the elements move with the scroll. A MutationObserver or scroll listener could update badge positions, but this adds complexity. The current approach works because users typically select elements that are visible and do not scroll while in selection mode.

## The Tech Stack

- **React 18** for the side panel UI
- **Zustand** for state management
- **TypeScript** throughout
- **Tailwind CSS** for styling
- **Vite** with the CRXJS plugin for hot-reload during development
- **webextension-polyfill** for cross-browser compatibility (future-proofing for Firefox/Edge ports)

The CRXJS Vite plugin deserves a mention. It makes Chrome extension development feel like regular web development -- hot module replacement works in the side panel, and manifest changes are picked up automatically. The `@crxjs/vite-plugin` handles the complex build output required by Manifest V3.

## Try It Out

If you regularly copy data between web pages -- filling invoices from CRMs, transferring spreadsheet data to admin panels, populating forms from other forms -- DataBridge eliminates the repetitive copy-paste cycle. Select your source elements, select your target fields, and transfer. Save templates for workflows you repeat.

{% embed https://chromewebstore.google.com/detail/gbjklhkdilhnnfgikfcnahaijacnhfce %}
