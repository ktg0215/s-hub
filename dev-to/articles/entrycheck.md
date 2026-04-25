---
title: "I Built a Visa Requirement Overlay for Google Flights — Here's How the Chrome Extension Works"
description: "Injecting visa requirement badges on Google Flights using a local JSON matrix, MutationObserver, and multi-selector destination extraction."
tags: ["chromeextension", "javascript", "webdev", "travel"]
published: false
publish_date: "2026-06-09"
devto_id: "3532587"
---

Every time I plan a multi-country trip, I end up in the same loop: open the foreign ministry website, navigate three layers of dropdowns, find the right passport/destination combination, then repeat for every country on the itinerary.

There's no reason this should require multiple tabs and five minutes of clicking. So I built **EntryCheck** — a Chrome extension that injects visa requirement badges directly onto Google Flights results.

## The Core Idea

EntryCheck overlays colored status badges on flight destination cards while you browse Google Flights. You set your nationality once in the popup; the extension takes care of the rest.

The five statuses:
- 🟢 **Visa-free** — enter without a visa
- 🟡 **Visa on Arrival** — get a stamp at the border
- 🔵 **eVisa** — apply online before you fly
- 🟠 **Visa required** — apply at an embassy
- 🔴 **Not admitted** — entry is prohibited

## Local JSON Matrix, Zero API Calls

The visa data lives in a local `visa-matrix.json` file bundled with the extension — 190+ passport/destination combinations, structured as a two-level lookup:

```typescript
export async function getVisaRequirement(
  passport: string,
  destination: string,
): Promise<VisaRequirement | null> {
  const matrix = await loadVisaMatrix(); // lazy-loaded, cached after first call
  const result = matrix[passport.toUpperCase()]?.[destination.toUpperCase()];
  if (result) return result;
  // EU block: if destination is an EU member, use the EU entry
  if (isEUCountry(destination)) return matrix[passport.toUpperCase()]?.['EU'] ?? null;
  return null;
}
```

Lazy-loading prevents the 200KB JSON from blocking the content script at startup. The first lookup pays the parse cost; every subsequent lookup hits the cached object.

No external API means no latency, no rate limits, and the extension works offline — useful in airports.

## The Hard Part: Google Flights Is a SPA

Google Flights is a single-page app. Destination names appear, change, and disappear without a full page reload, so `DOMContentLoaded` fires once and then nothing.

The fix is `MutationObserver` with a 500ms debounce:

```typescript
const observer = new MutationObserver(() => {
  if (debounceTimer) clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => injectBadges(nationality), 500);
});
observer.observe(document.body, { childList: true, subtree: true });
```

Debouncing matters here. Google Flights fires dozens of micro-mutations per second during search animations and autocomplete. Without throttling, you'd call `injectBadges()` hundreds of times for a single search.

## Extracting Destination Text From an Obfuscated DOM

Google's DOM uses auto-generated class names that change between A/B test variants. I use a multi-selector waterfall with a fallback chain:

```typescript
const selectors = [
  '[jsname="ik4t5"]',           // flight destination text (most stable)
  '[role="listitem"] h2',       // Travel explore cards
  '[role="listitem"] h3',
  '[aria-label*="Flight to"]',  // aria-label match
  '[data-destination-name]',   // data attribute variant
];
```

Each matched element is tagged with `data-entrycheck-injected` after processing to skip it on the next observer cycle — otherwise the badge would be re-injected on every DOM mutation.

## Country Name → ISO Code

Destination text comes as human-readable names ("Japan", "Paris", "United States"). The visa matrix uses ISO 3166-1 alpha-2 codes ("JP", "FR", "US"). The `countryNameToCode` function maps between them using a bundled dictionary.

Partial matches help here: Google sometimes shows city names instead of countries ("Tokyo" → "JP", "Paris" → "FR"). The dictionary maps both.

## Cleanup

Always disconnect observers when they're no longer needed:

```typescript
window.addEventListener('unload', () => {
  observer.disconnect();
});
```

Forgetting this is the most common memory leak in content scripts. With `subtree: true` watching `document.body`, a persistent observer accumulates a lot of internal bookkeeping.

---

**Chrome Web Store:** https://chromewebstore.google.com/detail/gfbdmeieifamgheecbmdpadniofodkfa

If you book international travel and have ever spent 20 minutes figuring out whether you need a visa, give it a try.
