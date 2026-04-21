---
title: "I Built a Chrome Extension That Checks Visa Requirements for 190+ Countries Without Leaving Your Tab — EntryCheck"
published: false
publish_date: "2026-05-18"
devto_id: "3532587"
tags: ["chrome","javascript","webdev","travel"]
---

Every time I plan a multi-country trip, I end up in the same annoying loop: open the foreign ministry website, navigate three layers of dropdowns, find the right passport/destination combination, then repeat for each country in my itinerary.

There's no reason this should require multiple tabs and five minutes of clicking. So I built **EntryCheck**.

## What It Does

EntryCheck is a Chrome extension that gives you instant visa and entry requirement lookups directly in your browser popup. Select your nationality, pick a destination, and see:

- **Visa status**: Visa-free / Visa on Arrival / eVisa / Visa required / Not admitted
- **Maximum stay duration** in days
- **Key entry conditions** and notes
- **Color-coded badges** for at-a-glance scanning

It also injects requirement overlays on Google Flights and Booking.com pages when it detects destination information — so you get visa data without leaving the booking flow.

## Technical Highlights

The extension is built with **WXT + React + TypeScript** and covers 190+ passport/destination combinations via a local JSON dataset. No external API calls for basic lookups — everything resolves client-side.

```typescript
export type VisaStatus =
  | 'visa_free'
  | 'visa_on_arrival'
  | 'e_visa'
  | 'visa_required'
  | 'not_admitted';

export async function getVisaRequirement(
  nationality: string,
  destination: string
): Promise<VisaRequirement | null> {
  const key = `${nationality}_${destination}`;
  return VISA_DATA[key] ?? null;
}
```

Keeping the dataset local means the extension works offline and has zero latency on lookups.

**The content script** runs on `google.com/travel/*` and `booking.com/*`, using `MutationObserver` to watch for destination changes in the SPA and inject a badge when a match is found:

```typescript
observer = new MutationObserver(() => {
  const destination = extractDestination();
  if (destination && destination !== lastDestination) {
    lastDestination = destination;
    injectBadge(destination);
  }
});
observer.observe(document.body, { childList: true, subtree: true });
```

Always call `observer.disconnect()` on cleanup — forgetting this is a common memory leak source in content scripts.

## Free vs. Pro Tiers

| Feature | Free | Pro ($4/mo) |
|---------|------|-------------|
| Monthly lookups | 10 | Unlimited |
| Multi-country comparison | — | ✓ |
| Requirement change alerts | — | ✓ (email) |

The usage counter lives in `chrome.storage.local` and resets on the 1st of each month. When a Free user hits the cap, a paywall modal explains what they get by upgrading — no hard block, just a clear prompt.

The $4/month price point was intentional: lower than a cup of coffee, and the value prop for frequent travelers is obvious. If you're planning a multi-destination trip and need to compare visa requirements across 5 countries at once, $4 is nothing.

## Why "No External API for Basic Lookups"

I considered using a live travel API, but the tradeoffs weren't worth it:

1. **Latency** — any round-trip adds delay to what should be an instant lookup
2. **Offline use** — airport WiFi is unreliable; the extension should work regardless
3. **Cost** — most travel data APIs charge per call, which doesn't pair well with a low-priced subscription

The downside is that the dataset needs periodic updates when visa agreements change. I'm planning a webhook-based update system for Pro users to get notified when a requirement in their saved destinations changes.

---

**Chrome Web Store:** https://chromewebstore.google.com/detail/gfbdmeieifamgheecbmdpadniofodkfa

Travel researchers, digital nomads, or anyone who's ever spent 20 minutes figuring out whether they need a visa — give it a try.
