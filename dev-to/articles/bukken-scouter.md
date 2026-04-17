---
title: "How to Scrape Japan Real Estate Data with a Chrome Extension - SUUMO Automation"
published: true
tags: ["chromeextension","realestate","javascript","webdev"]
series: null
canonical_url: null
publish_date: "2026-04-07"
main_image: "https://dev-tools-hub.xyz/screenshots/bukken-scouter-purchase/screenshot-01.png"
devto_id: "3392098"
---

If you've ever apartment-hunted in Japan, you know the drill. You open SUUMO -- the country's dominant real estate portal, think Zillow but with near-monopoly status -- and you're immediately staring at dozens of property listings. Each card shows rent, area, station distance, building age. But the numbers that actually matter for making a decision? Those aren't there. You have to calculate them yourself, mentally, for every single listing.

Price per square meter. Total move-in cost (which in Japan includes a dizzying mix of deposits, "key money," brokerage fees, insurance, and lock replacement charges). Two-year total cost of living. Whether the asking price is reasonable compared to the neighborhood average.

I got tired of doing this math on paper, so I built **Bukken Scouter** -- a pair of Chrome extensions that inject real-time financial analysis directly into SUUMO's listing pages. One for purchases (condos and houses), one for rentals. Both are built on Manifest V3, React, TypeScript, and Vite, and they solve fundamentally different problems despite sharing an architecture.

## Why SUUMO, and Why This Is Harder Than It Looks

SUUMO (suumo.jp) is operated by Recruit Holdings, one of Japan's largest tech conglomerates. It aggregates listings from nearly every real estate agency in the country. If you're looking for a place to live in Japan, you're using SUUMO. There's no real alternative with comparable coverage.

The problem is that SUUMO is designed as a listing aggregator, not an analysis tool. It shows you raw listing data -- price, area, age, station -- but leaves all the comparative analysis to you. There's no yield calculation for purchase properties. No total cost projection for rentals. No way to quickly assess whether a price is fair for the neighborhood.

And the DOM structure is... interesting. SUUMO uses multiple page layouts depending on property type, and the markup differs significantly between them. Condo listings (`/chukomansion/`), new construction (`/ms/`), detached houses (`/ikkodate/`, `/chukoikkodate/`), and rental listings (`/chintai/`) each have their own HTML patterns. Some use table layouts with `<dt>`/`<dd>` pairs. Others use CSS class-based cards. Detail pages use yet another structure entirely.

This means the content script can't just use one set of selectors. It needs a detection layer, a selector mapping layer, and fallback strategies for each.

## Architecture: How the Extension Works

Both extensions follow the same high-level architecture:

```
Content Script (injected into SUUMO pages)
  -> Page Detector (identifies page type from URL + DOM)
  -> Parser (extracts property data from DOM elements)
  -> Calculator (computes derived metrics)
  -> Injector (renders React components into the page)

Background Service Worker
  -> Storage management (chrome.storage)
  -> Alarm-based notifications
  -> Side panel coordination

Side Panel UI
  -> Favorites list with comparison view
  -> Settings management
```

The content script is the core of the system. It's declared in `manifest.json` with specific URL match patterns:

```json
// Purchase version
"content_scripts": [{
  "matches": [
    "https://suumo.jp/ms/*",
    "https://suumo.jp/chukomansion/*",
    "https://suumo.jp/ikkodate/*",
    "https://suumo.jp/chukoikkodate/*",
    "https://suumo.jp/jj/bukken/*"
  ],
  "js": ["content.js"],
  "css": ["content.css"],
  "run_at": "document_idle"
}]

// Rental version
"content_scripts": [{
  "matches": [
    "https://suumo.jp/chintai/*",
    "https://suumo.jp/jj/chintai/*"
  ],
  "js": ["content.js"],
  "css": ["content.css"],
  "run_at": "document_idle"
}]
```

The separation into two extensions wasn't an arbitrary choice. Purchase and rental properties have fundamentally different data models and calculation needs. A purchase property cares about price-per-tsubo (a traditional Japanese area unit, 1 tsubo = 3.3 sqm), building age depreciation curves, and management/repair reserve fees. A rental property cares about initial move-in costs, annual cost projections, and two-year total costs (Japan's standard lease term). Trying to cram both into one extension would have made the codebase harder to maintain and the UI confusing.

## DOM Parsing: The Messiest Part

SUUMO's DOM structure is the most technically challenging aspect of this project. The site uses what I call a "dottable" layout -- a `<dl>`/`<dt>`/`<dd>` pattern where property attributes are rendered as label-value pairs. But the specific CSS classes and nesting patterns change depending on the property category.

Here's how the selector mapping works for the purchase version:

```typescript
export const SUUMO_SELECTORS = {
  CHUKOMANSION_LIST: {
    propertyCard: '.property_unit, .cassette_list-item, .cassetteitem',
    propertyName: 'dd.dottable-vm, .property_unit-title a, .cassetteitem_content-title a',
    price: 'span.dottable-value, .dottable-value--price, .cassetteitem_price--emphasis',
    area: '.dottable-fix dd, .dottable-value--area, .cassetteitem_menseki',
    age: '.dottable-fix dd, .dottable-value--age',
    // ... more selectors
  },
  DETAIL: {
    propertyName: '.section_h1-header-title, h1.ui-section-header',
    price: '.property_view_main-emphasis, .property_view_note-emphasis',
    infoTable: '.property_view_table, .secti table',
    // ... detail page selectors
  }
};
```

Each selector field is actually a comma-separated list of fallback selectors. The parser tries them in order until one matches. This handles the reality that SUUMO's frontend team apparently ships different markup structures for different property subtypes, and occasionally updates them.

The parser itself uses a priority system. It first tries the "dottable" structure (the `<dt>`/`<dd>` pattern), because that's the most reliable:

```typescript
function findDottableValue(card: Element, labelText: string): string {
  const dts = card.querySelectorAll('dt');
  for (const dt of dts) {
    if (dt.textContent?.includes(labelText)) {
      const dl = dt.closest('dl');
      if (dl) {
        const dd = dl.querySelector('dd');
        if (dd) return getTextContent(dd);
      }
      const nextSibling = dt.nextElementSibling;
      if (nextSibling?.tagName === 'DD') {
        return getTextContent(nextSibling);
      }
    }
  }
  return '';
}
```

If the dottable lookup fails, it falls back to CSS class-based selectors. This two-tier approach has proven resilient to minor SUUMO layout changes.

For the rental version, the challenge is slightly different. Rental listings use a building-to-room hierarchy: each `.cassetteitem` (building card) contains multiple `.js-cassette_link` rows (individual room listings). The parser needs to extract building-level data (name, address, station) from the parent card and room-level data (rent, area, floor) from each row, then merge them:

```typescript
function findPropertyRows(): PropertyRowInfo[] {
  const results: PropertyRowInfo[] = [];
  const buildings = document.querySelectorAll('.cassetteitem');

  buildings.forEach((building) => {
    const rows = building.querySelectorAll('.js-cassette_link');
    if (rows.length > 0) {
      rows.forEach((row, index) => {
        results.push({ row, buildingElement: building, rowIndex: index });
      });
    } else {
      results.push({ row: building, buildingElement: building, rowIndex: 0 });
    }
  });
  return results;
}
```

## Japanese Price Parsing: More Complex Than You'd Expect

Japanese real estate prices use a counting system that doesn't map cleanly to Western number formatting. Prices are expressed in units of "man" (10,000) and "oku" (100,000,000). A condo might be listed as "3,980 man-en" (39,800,000 yen) or "1-oku 2,000 man-en" (120,000,000 yen). The parser needs to handle both:

```typescript
export function parsePrice(priceText: string): number {
  const cleaned = priceText.replace(/\s/g, '');

  // Handle "oku" (hundred millions)
  const okuMatch = cleaned.match(/(\d+(?:,\d+)?)億(?:(\d+(?:,\d+)?)万)?/);
  if (okuMatch) {
    const oku = parseInt(okuMatch[1].replace(/,/g, ''), 10) * 100000000;
    const man = okuMatch[2]
      ? parseInt(okuMatch[2].replace(/,/g, ''), 10) * 10000
      : 0;
    return oku + man;
  }

  // Handle "man" (ten thousands)
  const manMatch = cleaned.match(/(\d+(?:,\d+)?)万/);
  if (manMatch) {
    return parseInt(manMatch[1].replace(/,/g, ''), 10) * 10000;
  }

  return 0;
}
```

For purchases, the derived metric is "tsubo-tanka" (price per tsubo), which is the standard unit Japanese real estate agents use to compare property values:

```typescript
export function calculateTsuboPrice(price: number, areaSqm: number): number {
  if (areaSqm <= 0) return 0;
  const areaTsubo = areaSqm * 0.3025; // 1 sqm = 0.3025 tsubo
  return Math.round(price / areaTsubo / 10000); // result in man-en/tsubo
}
```

For rentals, the key calculation is total move-in cost, which in Japan is substantially higher than in most countries:

```typescript
static calcInitialCost(
  rent: number,
  managementFee: number,
  depositMonths: number,
  keyMoneyMonths: number,
): number {
  const deposit = rent * depositMonths;
  const keyMoney = rent * keyMoneyMonths;       // non-refundable "gift" to landlord
  const firstMonthRent = rent + managementFee;
  const brokerage = rent * 1.1;                  // agent fee (1 month + tax)
  const guarantee = rent * 0.5;                  // guarantor company fee
  const keyChange = 15000;                       // lock replacement
  const insurance = 15000;                       // fire insurance
  return deposit + keyMoney + firstMonthRent + brokerage
         + guarantee + keyChange + insurance;
}
```

That "key money" line deserves explanation for international readers. In Japan, many landlords expect a non-refundable payment of 1-2 months' rent simply for the privilege of signing the lease. It's called "reikin" (literally "gratitude money"). Combined with deposits, brokerage fees, and various administrative charges, moving into a new apartment in Tokyo can easily cost 4-6 months' rent upfront. The extension calculates this automatically so users can compare the true cost of different listings at a glance.

## Scoring: Rule-Based Market Analysis

Both extensions include an AI-style scoring system that assesses whether a property's price is reasonable for its area, age, and location. Despite the name, the current implementation is rule-based rather than neural-network-based (the TensorFlow.js integration exists as a hook for future model deployment, with a fallback to the rule engine).

The rental version maintains a lookup table of base price-per-sqm rates for every ward in Tokyo's 23 special wards, plus surrounding cities:

```typescript
const AREA_BASE_PRICE: Record<string, number> = {
  '港区': 5500,    // Minato: Tokyo's most expensive ward
  '渋谷区': 5200,  // Shibuya
  '千代田区': 5000, // Chiyoda
  // ... all 23 wards ranked by market rate
  '足立区': 2500,  // Adachi: more affordable
  '横浜市': 2800,  // Yokohama
  'default': 2500,
};
```

The scoring applies correction factors for building age, station distance, and layout type:

```typescript
function getAgeFactor(age: number): number {
  if (age <= 0) return 1.15;  // brand new: 15% premium
  if (age <= 5) return 1.05;
  if (age <= 10) return 1.00; // baseline
  if (age <= 20) return 0.90;
  if (age <= 30) return 0.85;
  return 0.80;                // 30+ years: 20% discount
}

function getWalkFactor(walkMinutes: number): number {
  if (walkMinutes <= 3) return 1.12;
  if (walkMinutes <= 5) return 1.08;
  if (walkMinutes <= 10) return 1.00; // baseline
  if (walkMinutes <= 15) return 0.95;
  return 0.85;
}
```

The final verdict compares the actual rent against the predicted rent. If the actual price is more than 10% below prediction, it's flagged as a good deal. More than 10% above? Overpriced. The result is injected as a colored badge directly into the listing card.

The purchase version uses a similar approach but with different coefficients -- a base tsubo price of 300 man-en for central Tokyo, with depreciation of roughly 1% per year of building age and 1% per minute of walking distance to the nearest station.

## Handling Dynamic Content and SPA Navigation

SUUMO isn't a full SPA, but it does lazy-load content and occasionally updates the DOM without a full page navigation. The extensions handle this with a `MutationObserver` that watches for new property cards:

```typescript
function observeDOM(): void {
  const observer = new MutationObserver(() => {
    if (isProcessing) return;

    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      const newCards = document.querySelectorAll(
        '.cassetteitem:not([data-scouter-processed])'
      );
      if (newCards.length > 0) processPage();
    }, 2000);
  });

  observer.observe(document.body, {
    childList: true,
    subtree: false,
  });
}
```

A critical detail: the observer must ignore its own DOM mutations. Without this guard, injecting a React component triggers the observer, which re-processes the page, which injects another component, creating an infinite loop. The purchase version solves this by checking if mutations originate from `.bukken-scouter-container` elements:

```typescript
const isOurMutation = mutations.every(mutation => {
  for (const node of mutation.addedNodes) {
    if (node instanceof HTMLElement) {
      if (node.classList.contains('bukken-scouter-container')) {
        return true;
      }
    }
  }
  return false;
});
if (isOurMutation) return; // ignore our own injections
```

The rental version takes a simpler approach: it marks processed rows with a `data-scouter-processed` attribute and only processes unprocessed cards.

## React Injection into Third-Party DOM

Both extensions use React for the injected UI components, but they can't use a standard React app mount point. Instead, they create isolated container elements and mount React roots into them:

```typescript
const container = document.createElement('div');
container.className = 'bukken-scouter-container';
container.setAttribute('data-property-id', property.id);

targetElement.appendChild(container);

const root = createRoot(container);
root.render(
  <PropertyInfo
    property={property}
    showPricePerSqm={true}
    compact={true}
  />
);
```

Each property card gets its own React root. This isolation is intentional -- it prevents SUUMO's CSS from breaking the injected components and vice versa, and it means individual cards can be unmounted cleanly without affecting others.

The purchase version renders a panel with tsubo price, building age (color-coded), price history, a favorites button, and a link to Japan's official hazard map portal (useful for earthquake/flood risk assessment). The rental version shows price-per-sqm, initial cost estimate, and the AI deal score.

## Additional Features Worth Mentioning

**Price tracking**: The purchase version monitors favorited properties for price changes over time using `chrome.storage`. Each time a favorited property's page is visited, the current price is compared against stored history. Price drops trigger notifications via the `chrome.alarms` and `chrome.notifications` APIs.

**Side panel**: Both versions use Chrome's Side Panel API to provide a persistent comparison view. Users can favorite properties from listing pages, then open the side panel to see all saved properties in a sortable, comparable format.

**Hazard map integration**: The purchase version includes a button that opens Japan's government-operated hazard map portal (disaportal.gsi.go.jp) for the property's location. In a country with frequent earthquakes, typhoons, and flood risks, this is genuinely useful context for a purchase decision.

**Export**: Both versions support exporting property data, useful for sharing analysis with family members or real estate agents.

## What I Learned Building This

**Scraping is maintenance.** SUUMO's DOM structure has changed at least twice since I started this project. The multi-selector fallback approach has saved me from emergency hotfixes, but it's still a fragile foundation. If SUUMO ever switches to a React-based SPA with obfuscated class names, this approach will need a fundamental rethink.

**Japanese number formatting is deceptively tricky.** The man/oku system, combined with comma separators and occasional full-width characters, means your price parser needs to handle more edge cases than you'd expect from a "just parse a number" function.

**Domain-specific knowledge matters more than clever code.** The scoring algorithm is technically simple -- it's just multiplication of correction factors. But the correction factors themselves encode real estate market knowledge: that brand-new buildings in Tokyo command a 15% premium, that station proximity drops off non-linearly, that 1R (studio) apartments have higher per-sqm rates than family-sized units. Getting these coefficients right required actual research into the Tokyo rental market, not just programming skill.

**Content script isolation is underrated.** Using individual React roots per injected component, rather than one big app, turned out to be the right call. It makes cleanup reliable, prevents cascade failures, and keeps memory usage predictable even on pages with 50+ property cards.

## Try It Out

Both extensions are free and available on the Chrome Web Store. Even if you're not apartment hunting in Japan, the codebase is a practical example of building a content-script-heavy Chrome extension that does real-time DOM analysis and data enrichment on a third-party site.

{% embed https://dev-tools-hub.xyz/extensions/bukken-scouter-rental %}

{% embed https://dev-tools-hub.xyz/extensions/bukken-scouter-purchase %}

---

*Other tools I've built:*

{% embed https://chromewebstore.google.com/detail/epoehadeccangbpjldlbkapnakndbpkf %}

{% embed https://dev-tools-hub.xyz/extensions/arbitra %}
