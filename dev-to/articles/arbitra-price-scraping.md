---
title: "Scraping Prices Without an API: Chrome Content Script Patterns for Japanese E-Commerce"
published: true
tags: ["chrome","javascript","webdev","indiehacker"]
series: null
canonical_url: null
publish_date: "2026-06-24"
devto_id: "3960033"
---

Japanese e-commerce is fragmented. The same product — a vintage camera, a game console, a brand bag — can vary by ¥5,000–¥30,000 between Amazon.co.jp, Rakuten, Mercari, and Yahoo! Auctions. Finding the delta requires opening four tabs and cross-referencing manually.

I built [Arbitra](https://chromewebstore.google.com/detail/arbitra/bincnlodgkpmmihbdoknndbncjfghpcj) to automate this. Here's the technical side: how to extract pricing data from multiple sites without official APIs, and the patterns that actually hold up across site redesigns.

---

## The Core Problem with DOM Scraping

API-based price tracking is clean: call an endpoint, parse JSON, done. But Japanese e-commerce platforms don't offer public APIs for real-time pricing. Amazon's Product Advertising API requires active affiliate status, Mercari has no public API, and Rakuten's API lags behind displayed prices.

The alternative: content scripts reading the DOM directly.

The obvious weakness is fragility — sites change their markup and your selectors break. But a few patterns make this survivable.

## Selector Strategy: Multiple Candidates with Fallback

Don't bet on a single CSS selector. Use an ordered list of candidates, falling through to the next if the previous returns null:

```javascript
const PRICE_SELECTORS = {
  amazon: [
    '#corePrice_feature_div .a-price-whole',   // primary product page
    '#priceblock_ourprice',                      // older layout
    '#priceblock_saleprice',
    '.a-price.a-text-price .a-offscreen',       // price in search results
    '#price',
  ],
  mercari: [
    '[data-testid="price"]',                     // React-rendered
    '.item-price',                               // older layout
    'h3.item-price',
    'div[class*="price"] span',
  ],
};

function extractPrice(site) {
  const selectors = PRICE_SELECTORS[site] ?? [];
  for (const selector of selectors) {
    const el = document.querySelector(selector);
    if (el?.textContent?.trim()) {
      return parseJPPrice(el.textContent);
    }
  }
  return null;
}
```

When Amazon or Mercari redesigns a page section, at least some selectors in the list usually survive.

## Parsing Japanese Price Strings

Japanese prices use `¥` or `円`, sometimes with commas, sometimes without:

```javascript
function parseJPPrice(text) {
  // Remove ¥, 円, commas, and whitespace; parse as int
  const cleaned = text.replace(/[¥円,\s]/g, '').trim();
  const num = parseInt(cleaned, 10);
  return isNaN(num) ? null : num;
}
```

Edge cases to handle:
- `¥12,800` → 12800
- `12,800円(税込)` → 12800 (strip non-numeric suffix)
- `¥1,280 (¥160/個)` → 1280 (take the first number)
- `¥–` (out of stock marker) → null

## Cross-Tab Communication

Content scripts can't directly call each other across tabs. The pattern for "extract price from tab A and send it to tab B":

**Content script (producer tab):**
```javascript
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'EXTRACT_PRICE') {
    const price = extractPrice(request.site);
    sendResponse({ price, url: location.href });
  }
  return true; // async response
});
```

**Service worker (coordinator):**
```javascript
async function getPriceFromTab(tabId, site) {
  return chrome.tabs.sendMessage(tabId, {
    type: 'EXTRACT_PRICE',
    site,
  });
}

// Example: get prices from both open tabs
async function comparePrices(amazonTabId, mercariTabId) {
  const [amazonResult, mercariResult] = await Promise.all([
    getPriceFromTab(amazonTabId, 'amazon'),
    getPriceFromTab(mercariTabId, 'mercari'),
  ]);

  return {
    amazon: amazonResult.price,
    mercari: mercariResult.price,
    delta: (amazonResult.price ?? 0) - (mercariResult.price ?? 0),
  };
}
```

In MV3, the service worker can be killed and won't be available to process responses. Keep `sendMessage` round trips short and don't hold open connections.

## The Same-Product Problem

Price comparison only matters when you're looking at the same product. Identifying "same product" across Amazon and Mercari is harder than it sounds:

- Amazon has ASINs, Mercari has item IDs — no shared identifier
- Product names differ: "Sony WH-1000XM5 ヘッドフォン ブラック" vs "ソニー ヘッドホン WH1000XM5 黒"
- Condition varies: new on Amazon, used on Mercari

Arbitra takes the pragmatic route: it identifies the product on the current page and searches for it on the comparison site. Product name extraction from Amazon:

```javascript
function getAmazonProductTitle() {
  const el =
    document.querySelector('#productTitle') ??
    document.querySelector('.product-title-word-break');
  if (!el) return null;

  // Clean manufacturer suffix — "...ヘッドフォン【国内正規品】" → "...ヘッドフォン"
  return el.textContent.trim().split('【')[0].trim();
}
```

Then query Mercari search results for that cleaned title and extract the price range from results.

## Handling React-Rendered Content

Mercari is a React SPA. Product prices don't exist in the initial HTML — they're injected after hydration. A simple `document.ready` content script fires too early.

Two options:

**Option 1: Retry loop**
```javascript
async function waitForPrice(site, maxWaitMs = 5000) {
  const start = Date.now();
  while (Date.now() - start < maxWaitMs) {
    const price = extractPrice(site);
    if (price !== null) return price;
    await new Promise(r => setTimeout(r, 200));
  }
  return null;
}
```

Simple but wastes cycles. Fine for a one-shot extraction.

**Option 2: MutationObserver**
```javascript
function waitForPriceElement(site) {
  return new Promise((resolve) => {
    const selectors = PRICE_SELECTORS[site] ?? [];
    
    // Check if already present
    for (const s of selectors) {
      const el = document.querySelector(s);
      if (el?.textContent?.trim()) {
        resolve(parseJPPrice(el.textContent));
        return;
      }
    }

    const observer = new MutationObserver(() => {
      for (const s of selectors) {
        const el = document.querySelector(s);
        if (el?.textContent?.trim()) {
          observer.disconnect();
          resolve(parseJPPrice(el.textContent));
          return;
        }
      }
    });

    observer.observe(document.body, { childList: true, subtree: true });

    // Timeout fallback
    setTimeout(() => {
      observer.disconnect();
      resolve(null);
    }, 5000);
  });
}
```

More efficient but adds complexity. Worth it for high-frequency extraction.

## Site Redesigns and Maintenance

The main maintenance burden: Amazon.co.jp and Mercari both redesign frequently. A few approaches that reduce breakage:

**Test selectors against the live site regularly.** I run a lightweight scraper check once a week that hits each site and verifies the price selector returns a parseable value.

**Use data attributes over class names.** Classes like `.a-price-whole` are more stable than React-generated class names like `.sc-abc123`. `[data-testid="price"]` is explicitly placed by developers and tends to survive refactors.

**Log extraction failures.** When a content script returns `null` after trying all selectors, send an error event to GA4:

```javascript
if (price === null) {
  sendGA4Event('price_extraction_failed', {
    site,
    url: location.href.substring(0, 100), // truncate for privacy
  });
}
```

This gives real user failure data rather than relying on manual testing.

---

The full extension — cross-referencing prices across Amazon.co.jp, Rakuten Ichiba, Yahoo! Shopping, and Mercari — is available free on the Chrome Web Store:

**[→ Try Arbitra on Chrome Web Store](https://chromewebstore.google.com/detail/bincnlodgkpmmihbdoknndbncjfghpcj)**

What's the most frustrating part of DOM scraping you've dealt with? For me it's infinite scroll on Yahoo! Auctions — the price data is there but pagination makes clean extraction a mess.
