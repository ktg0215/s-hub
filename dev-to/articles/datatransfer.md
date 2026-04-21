---
title: "I Built a Chrome Extension That Maps and Transfers Data Between Web Pages Visually"
published: true
publish_date: "2026-04-20"
devto_id: "3519743"
tags: ["chrome","javascript","webdev","productivity"]
---

The most common complaint I hear from office workers who do data entry: "I have to copy from System A and paste into System B, field by field, a hundred times a day."

Clipboard managers help a little. Spreadsheet macros help for some cases. But the fundamental problem — transferring structured data between two web UIs — has no good solution that doesn't involve custom automation or browser developer tools.

I spent a week building **DataBridge**, a Chrome extension that lets you visually map elements between two pages and transfer data in one click.

## The Core Idea

Instead of writing a script that targets specific selectors, DataBridge lets you:

1. Open the source page and click each field you want to copy — the extension records the element and its current value
2. Open the destination page and click the corresponding input field
3. Save that mapping as a template
4. On future visits, load the template and hit Transfer — all values fill in automatically

The mapping is visual: you click on elements in the page, not on CSS selectors in a config file. No code required.

## Technical Architecture

The extension uses three communicating pieces:

```
popup.html          — UI for managing templates and starting transfer
content-script.ts   — Injected into pages for element selection and fill
background.ts       — Message broker + template storage
```

The hard part is that source and destination are often in different tabs. Chrome extension messaging handles inter-tab communication:

```typescript
// In content script: broadcast value captures to background
async function captureElement(element: HTMLElement): Promise<CapturedField> {
  const rect = element.getBoundingClientRect();
  const field: CapturedField = {
    selector: buildRobustSelector(element),
    value: extractValue(element),
    label: inferLabel(element),
    position: { x: rect.left, y: rect.top },
    timestamp: Date.now(),
  };

  await chrome.runtime.sendMessage({
    type: 'FIELD_CAPTURED',
    field,
    tabId: (await chrome.tabs.getCurrent())?.id,
  });

  return field;
}
```

## Building a Robust Selector

This is the most fragile part of any DOM automation tool. A CSS selector that works today might break tomorrow when the page updates. DataBridge builds a layered selector strategy:

```typescript
function buildRobustSelector(element: HTMLElement): SelectorChain {
  const strategies: SelectorStrategy[] = [];

  // 1. Stable attributes (most reliable)
  for (const attr of ['id', 'name', 'data-testid', 'aria-label']) {
    const val = element.getAttribute(attr);
    if (val) {
      strategies.push({ type: attr, value: val, confidence: 'high' });
    }
  }

  // 2. Label association (for form fields)
  const label = findAssociatedLabel(element);
  if (label) {
    strategies.push({
      type: 'label-text',
      value: label.textContent?.trim() ?? '',
      confidence: 'medium',
    });
  }

  // 3. Position-based fallback (least reliable)
  strategies.push({
    type: 'nth-child-path',
    value: buildNthChildPath(element),
    confidence: 'low',
  });

  return { strategies, preferredType: strategies[0]?.type };
}
```

At transfer time, it tries each strategy in order and uses the first match. The confidence level is shown in the UI so users know which mappings are fragile.

## Handling Different Input Types

Web forms are messy. DataBridge handles:

```typescript
function fillElement(element: HTMLElement, value: string): boolean {
  if (element instanceof HTMLSelectElement) {
    // Match by value or visible text
    const option = Array.from(element.options).find(
      o => o.value === value || o.text === value
    );
    if (option) {
      element.value = option.value;
      element.dispatchEvent(new Event('change', { bubbles: true }));
    }
    return !!option;
  }

  if (element instanceof HTMLInputElement) {
    if (element.type === 'checkbox' || element.type === 'radio') {
      element.checked = value === 'true' || value === element.value;
      element.dispatchEvent(new Event('change', { bubbles: true }));
      return true;
    }
    // Text inputs — use native input value setter for React compatibility
    const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
      window.HTMLInputElement.prototype,
      'value'
    )?.set;
    nativeInputValueSetter?.call(element, value);
    element.dispatchEvent(new InputEvent('input', { bubbles: true }));
    element.dispatchEvent(new Event('change', { bubbles: true }));
    return true;
  }

  if (element.contentEditable === 'true') {
    element.textContent = value;
    element.dispatchEvent(new InputEvent('input', { bubbles: true }));
    return true;
  }

  return false;
}
```

The React compatibility trick (using the native value setter + dispatching synthetic events) is essential — React's synthetic event system ignores direct `element.value =` assignments on controlled inputs.

## Template Storage

Templates are stored in `chrome.storage.local` with a simple schema:

```typescript
interface MappingTemplate {
  id: string;
  name: string;
  sourceUrl: string;  // Used to auto-suggest on page load
  targetUrl: string;
  fields: FieldMapping[];
  createdAt: number;
  useCount: number;
}
```

The `sourceUrl` and `targetUrl` are stored as glob patterns so templates trigger on similar pages (e.g., `https://app.example.com/orders/*` matches all order pages).

## What It's Good For

DataBridge works best for repetitive, structured workflows: copying order data from an ERP into a CRM, filling government forms from a spreadsheet, migrating records between two SaaS tools that don't have a native integration.

It doesn't work well for pages with heavy client-side routing that replaces the DOM on navigation (the mapped selectors become stale). That's a known limitation I'm working on for a future version using MutationObserver to reattach selectors after navigation.

The extension is live on the Chrome Web Store.

---

*Built with WXT + React + TypeScript. Dark mode UI with element-level visual selection.*
