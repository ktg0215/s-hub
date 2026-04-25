---
title: "190 Countries, Zero API Calls: Shipping Static Data in a Chrome Extension"
description: "How I structured and bundled a 190-country visa requirements matrix into a Chrome extension without hitting any external API at runtime."
tags: ["chrome","javascript","webdev","data"]
published: false
publish_date: "2026-05-23"
canonical_url: ""
devto_id: "3550210"
---

Most Chrome extensions that need data fall into one of two patterns: they call an external API, or they store a small amount of user-specific data locally. [EntryCheck](https://chromewebstore.google.com/detail/gfbdmeieifamgheecbmdpadniofodkfa) does neither. It bundles a static dataset of visa requirements for 190+ passport/destination combinations directly into the extension and resolves every lookup client-side with zero network requests.

This tradeoff — large bundle, instant lookups, no API dependency — turns out to be the right call for travel data. Here's why, and how it works.

## Why Static Over API

Visa requirements don't change often. A country might update its visa-on-arrival list two or three times a year. An API would add latency, require authentication, and create a failure mode (network unavailable, API down, rate-limited) in a context where the user is typically trying to quickly check something before booking a flight.

More practically: there's no reliable free public API for visa requirements. The data sources are government websites and reference databases. Scraping or licensing these for a real-time API isn't worth it for a tool whose value is speed and simplicity.

A local JSON file loaded at extension startup sidesteps all of this.

## Data Structure

The core dataset is a JSON object keyed by two-letter ISO passport code, then by two-letter destination code:

```typescript
type VisaStatus =
  | 'visa_free'
  | 'visa_on_arrival'
  | 'e_visa'
  | 'visa_required'
  | 'not_admitted';

interface EntryRequirement {
  status: VisaStatus;
  maxStay?: number;        // days, undefined if no limit
  notes?: string;
}

type VisaMatrix = Record<string, Record<string, EntryRequirement>>;
```

A lookup is just two array accesses:

```typescript
function lookup(matrix: VisaMatrix, passport: string, destination: string): EntryRequirement | null {
  return matrix[passport]?.[destination] ?? null;
}
```

The matrix itself compresses well: `visa_free` and `visa_required` cover the majority of combinations, so the JSON has a lot of repeated structure. Gzipped, the full dataset is under 30KB.

## Bundling with WXT

The matrix lives in `public/visa-matrix.json`. WXT (the extension framework) copies the `public/` directory to the output root verbatim. The background service worker loads it once on install and caches the result:

```typescript
let cachedMatrix: VisaMatrix | null = null;

async function getMatrix(): Promise<VisaMatrix> {
  if (cachedMatrix) return cachedMatrix;
  const url = chrome.runtime.getURL('visa-matrix.json');
  const resp = await fetch(url);
  cachedMatrix = await resp.json();
  return cachedMatrix;
}
```

`chrome.runtime.getURL` converts the relative path to the extension's internal `chrome-extension://` URL. This is the standard pattern for accessing bundled assets from a service worker — it works in MV3 without any special permissions.

## Content Script Injection on Google Flights

The lookup popup works fine on its own, but the more useful feature is automatic injection on Google Flights. When a user searches for a flight and the page shows a destination, EntryCheck's content script detects the destination, looks up the requirements for the user's saved passport, and injects a badge next to the search results.

The content script reads the current destination from the URL parameters and page DOM, calls the background for a lookup via `chrome.runtime.sendMessage`, and renders a small badge component inline.

```typescript
chrome.runtime.sendMessage(
  { type: 'VISA_LOOKUP', passport: savedPassport, destination: detected },
  (response: EntryRequirement | null) => {
    if (response) renderBadge(response);
  }
);
```

The background receives this, calls `getMatrix()`, and returns the result. Because the matrix is in memory after the first load, the response is synchronous from the content script's perspective.

## The Maintenance Problem

Static data has one obvious downside: it goes stale. My current approach is to update the JSON file with each extension version bump and push it as a normal CWS update. This is manual but tractable — visa requirements change infrequently enough that quarterly checks cover 95% of changes.

For something that updates more frequently (exchange rates, business hours), this model breaks down and an API makes more sense. Visa requirements are the rare case where static actually wins.

---

🔗 **EntryCheck on Chrome Web Store**: [Install](https://chromewebstore.google.com/detail/gfbdmeieifamgheecbmdpadniofodkfa)
