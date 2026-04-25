---
title: "I Built a Price History Tracker for Japan's 4 Major E-Commerce Sites (Amazon.co.jp, Rakuten, Yahoo!, Mercari)"
description: "How I scraped price data from 4 different site structures, built a local price history DB with IndexedDB, and created drop alerts — all in a Chrome MV3 extension."
tags: ["chromeextension","javascript","webdev","buildinpublic"]
published: false
publish_date: "2026-05-12"
canonical_url: ""
devto_id: "3550218"
---

Keepa tracks Amazon price history. It works well for Amazon.com. For Amazon.co.jp it has gaps — delayed updates, missing products, no Rakuten/Yahoo!/Mercari support at all.

If you shop regularly on Japanese e-commerce, you're working across four very different sites with no unified price history. I wanted to know: was this ¥9,800 laptop stand expensive last month, or is it always ¥9,800? Is this Mercari listing a fair price compared to last week?

I built PricePulse JP to answer that. The interesting engineering problem was getting consistent price data out of four sites that don't look anything alike.

---

## The four-site parsing problem

The naive approach to price extraction is: find the DOM element that shows the price, read `textContent`. That works until Amazon quietly renames its CSS classes (which it does, routinely), or you're on a Rakuten shop that a merchant themed themselves.

Each site needed a different strategy.

**Amazon.co.jp** mutates its DOM frequently enough that a single selector is a liability. I maintain a fallback chain of 8 selectors in priority order:

```typescript
const priceSelectors = [
  '#corePriceDisplay_desktop_feature_div .a-price .a-offscreen',
  '#corePrice_feature_div .a-price .a-offscreen',
  '#apex_desktop .a-price .a-offscreen',
  '#priceblock_ourprice',
  '#priceblock_dealprice',
  '#priceblock_saleprice',
  'span.a-price.apexPriceToPay .a-offscreen',
  '.a-price .a-offscreen',  // last resort
];
```

The first selector that returns a non-zero price wins. This survives most Amazon layout changes because at least one selector in the chain is usually current.

**Rakuten** is harder. Rakuten Ichiba lets merchants customize shop layouts, so DOM selectors vary wildly across shops. The saving grace: Rakuten enforces schema.org `Product` metadata platform-wide. Every item page has `<meta itemprop="price" content="...">`. Merchant themes can't change that. I parse metadata first and only fall back to DOM selectors if the metadata is absent.

**Yahoo! Shopping** has two URL patterns (store.shopping.yahoo.co.jp and shopping.yahoo.co.jp/products/) and also reliably exposes schema.org `meta[itemprop="price"]`. Same approach as Rakuten: metadata first.

**Mercari** also uses schema.org metadata — `meta[itemprop="price"]` and `meta[property="product:price:amount"]`. The Mercari-specific edge case is that sold items don't have a price. When an item sells, the price meta disappears. The parser returns `null` in this case instead of writing a zero, which preserves the last known price in the watchlist rather than recording a false "price dropped to 0."

---

## Why one parser runs in two contexts

There's a common architecture question with Chrome extensions: do you parse in the content script (runs in the page's tab) or in the background service worker (runs separately)?

Content scripts have direct DOM access. Service workers can use `fetch()` and `DOMParser` but don't have live DOM. For price tracking you want both: parse on page load (for immediate feedback) and re-check in the background on a schedule (for alerts when you're not browsing).

The solution is to write each parser as a pure function that takes a `Document` argument:

```typescript
export function parseAmazonDoc(doc: Document, sourceUrl: string): ParsedProduct | null
```

The content script passes `document`. The background refresh task passes the result of:

```typescript
const res = await fetch(url, { headers: { 'Accept': 'text/html' } });
const html = await res.text();
const doc = new DOMParser().parseFromString(html, 'text/html');
```

Same logic, two inputs. No code duplication.

---

## Storing price history without external dependencies

Price history needs a proper database — not `chrome.storage.local` (5 MB quota, slow on large reads) and not a remote server (I wanted this fully local).

IndexedDB fits. Two object stores:

- `watchlist`: keyed by product ID, indexed by site. Stores the product title, URL, current price.
- `history`: compound key `[watchId, timestamp]`, append-only. Each price check writes a new point.

```typescript
const DB_NAME = 'pricepulse';

// watchlist: { id, site, title, url, currentPrice, addedAt }
const watchlistStore = db.createObjectStore('watchlist', { keyPath: 'id' });
watchlistStore.createIndex('site', 'site', { unique: false });

// history: append-only price log per product
db.createObjectStore('history', { keyPath: ['watchId', 't'] });
```

I wrote this without the `idb` wrapper library to keep bundle size small. The raw IndexedDB API is verbose but the transaction pattern is manageable once you wrap it:

```typescript
function tx<T>(store: string, mode: IDBTransactionMode, run: (tx: IDBTransaction) => T): Promise<T>
```

---

## Price drop alerts

The background check runs on a `chrome.alarms` schedule. Alarms fire even when no tab is open. When the fetched price is lower than the stored `targetPrice` threshold, it triggers a desktop notification:

```typescript
chrome.alarms.create('priceCheck', { periodInMinutes: 60 });

chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name !== 'priceCheck') return;
  const watchlist = await db.getAllWatching();
  for (const item of watchlist) {
    const updated = await fetchPriceForWatch(item);
    if (updated && item.targetPrice && updated.price <= item.targetPrice) {
      chrome.notifications.create({ /* ... price drop alert ... */ });
    }
  }
});
```

---

## What it is

PricePulse JP tracks prices across Amazon.co.jp, Rakuten, Yahoo! Shopping, and Mercari. Add items to your watchlist, set a target price, and get a notification when they drop. Price history chart is visible in the popup. Free plan: 10 items. Pro removes the limit and adds CSV export.

Available on the Chrome Web Store: [PricePulse JP — coming soon]

---

*Part of my series on building Chrome extensions for the Japanese market. More at [dev-tools-hub.xyz](https://dev-tools-hub.xyz).*
