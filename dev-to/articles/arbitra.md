---
title: "I Built a Cross-Platform Price Comparison Tool for Retail Arbitrage"
published: false
tags: ["chromeextension","ecommerce","productivity","javascript"]
series: null
canonical_url: null
publish_date: "2026-04-08"
devto_id: "3392093"
---

Retail arbitrage is conceptually simple: buy a product on one platform where it's cheap, sell it on another where it's expensive, and pocket the difference. In practice, it's death by browser tabs.

You're looking at a product on Amazon Japan. Is it cheaper on Mercari? What about Yahoo Auctions? You open three more tabs, type the product name into each search bar, scroll through results, mentally calculate fees, and try to remember the original price while comparing. By the time you finish, you've spent ten minutes on a single product and your browser has 47 tabs open.

I went through this cycle hundreds of times before I decided to automate it. The result is **Arbitra** -- a Chrome extension that sits in the browser's side panel and compares prices across Amazon, Mercari, and Yahoo Auctions in real time. When you visit a product page on any of these platforms, Arbitra scrapes the product data, searches the other two platforms, and shows you a profit score telling you whether the arbitrage opportunity is worth pursuing.

This article covers the technical architecture, the scraping challenges I ran into, and the scoring algorithm that makes buy/pass decisions.

{% embed https://dev-tools-hub.xyz/extensions/arbitra %}

## The Architecture: Content Scripts, Background Worker, and a Side Panel

Chrome extensions built on Manifest V3 have a specific communication model. You can't just have one monolithic script that does everything. Instead, you get three execution contexts that need to talk to each other:

1. **Content scripts** -- injected into web pages, with access to the DOM but limited Chrome API access
2. **Service worker** -- runs in the background, handles Chrome APIs and cross-origin requests
3. **UI surfaces** -- popup, side panel, or options page, each its own React application

Here's how data flows through Arbitra:

```
[Amazon page] --> Content Script extracts product data
                     |
                     v
              Background Service Worker
              - Receives product data via chrome.runtime.sendMessage
              - Builds search queries
              - Fetches Mercari + Yahoo Auctions in parallel
              - Calculates relevance scores
              - Stores results in memory
                     |
                     v
              Side Panel (React + Zustand)
              - Receives results via chrome.runtime.onMessage
              - Displays price comparison cards
              - Calculates profit score
              - Shows BUY / CONSIDER / PASS verdict
```

I chose the side panel over a popup because arbitrage workflows need persistence. A popup closes the moment you click away from it. The side panel stays open while you browse, which means you can navigate between product pages and see the comparison update automatically.

## Scraping Product Data from Three Different Platforms

The first real challenge was extracting product information from three platforms that have nothing in common in their HTML structure.

### Amazon: The Selector Graveyard

Amazon changes their product page DOM constantly. A selector that works today might break next month. My approach was to build a priority list of selectors and fall through them until one works:

```typescript
function extractPrice(): number {
  const selectors = [
    '#corePrice_feature_div .a-price .a-offscreen',
    '#corePriceDisplay_desktop_feature_div .a-price .a-offscreen',
    '.priceToPay .a-offscreen',
    '.apexPriceToPay .a-offscreen',
    '#priceblock_ourprice',
    // ... 10+ more selectors
    '.a-price .a-offscreen', // final fallback
  ];

  for (const selector of selectors) {
    const el = document.querySelector(selector);
    if (el?.textContent) {
      const cleaned = el.textContent.replace(/[currency symbols]/g, '');
      const price = parseInt(cleaned, 10);
      if (price > 0) return price;
    }
  }
  return 0;
}
```

Beyond the price, Arbitra also extracts the ASIN (Amazon's unique product identifier), brand name, model number, and product image. The ASIN comes from the URL, an input element, or a data attribute -- whichever is available. The brand name hides behind selectors that differ between product categories. Model numbers get pulled from the product details table or parsed out of the product title with regex.

Each piece of extracted metadata improves search accuracy on the other platforms. A search for "Sony WH-1000XM5" finds better matches than a search for the full 200-character Amazon product title.

### Mercari: SPAs and API Endpoints

Mercari is a single-page application built with Next.js, which means the DOM is rendered client-side and changes frequently. For individual product pages, I use a similar multi-selector approach as Amazon.

But the interesting part is searching for products on Mercari from the background service worker. Since content scripts are sandboxed to their page and can't make cross-origin requests, all search queries run from the background worker. Mercari exposes a search API endpoint that accepts JSON POST requests. When the direct API call succeeds, results come back as structured data with item IDs, names, prices, and thumbnails -- no HTML parsing needed.

When the API approach fails (and it does sometimes -- rate limiting, format changes, authentication requirements), the extension falls back to fetching the HTML search page and parsing it. This involves multiple strategies:

1. Extracting the `__NEXT_DATA__` script tag, which contains the server-side rendered search results as JSON
2. Searching for item cell patterns in the HTML using regex
3. Recursively exploring state objects embedded in script tags

I also built what I call a "Hybrid Approach" for Mercari. When you're already on a Mercari search page, a floating button appears that says "Compare with Arbitra." Clicking it triggers the content script to extract search results directly from the rendered DOM -- no need for the background worker to re-fetch the page. Those results get sent to the background worker and merged with data from other platforms.

### Yahoo Auctions: Auction-Specific Challenges

Yahoo Auctions adds complexity because items have both a current bid price and an optional buy-now price. The extension tries multiple URL formats (Yahoo has changed their search URL structure over time) and parses HTML to extract auction IDs, prices, and product names.

The parsing logic looks for auction IDs in the HTML using several regex patterns, then searches the surrounding HTML block for price and name information. It's not elegant, but it handles the reality of scraping a platform that wasn't designed for programmatic access.

## Building Intelligent Search Queries

The naive approach to cross-platform search is to take the full product name from one platform and paste it into the search box of another. This fails badly. Amazon product titles are stuffed with SEO keywords, size specifications, and marketing language that no human would type into a search box.

Arbitra's query builder uses a priority system:

1. **Brand + model number** -- the most precise match. If the content script extracted both, use them.
2. **Brand + cleaned keywords** -- extract meaningful words from the product title, strip out noise.
3. **Model number alone** -- if the brand wasn't found.
4. **Cleaned product name** -- last resort, take the first 3 meaningful words.

The keyword extraction function strips out Japanese e-commerce noise words (shipping info, condition labels, promotional language), removes bracketed content, and filters out size/weight specifications:

```typescript
function extractKeywords(productName: string): string {
  let cleaned = productName;

  // Remove bracketed content
  cleaned = cleaned.replace(/[brackets with content]/g, ' ');

  // Remove stop words (Japanese e-commerce terms)
  // "free shipping", "in stock", "genuine", "sale", etc.
  stopWords.forEach(word => {
    cleaned = cleaned.replace(new RegExp(word, 'gi'), ' ');
  });

  // Remove measurement specifications
  cleaned = cleaned.replace(/\d+(\.\d+)?\s*(mm|cm|kg|g|ml)/gi, ' ');

  // Take first 3 meaningful words
  const words = cleaned.split(/[\s separators]+/)
    .filter(w => w.length >= 2 && w.length <= 20)
    .slice(0, 3);

  return words.join(' ');
}
```

## Relevance Scoring: Finding the Right Product in Search Results

Cross-platform search results are noisy. Search for "Sony WH-1000XM5" on Mercari and you'll get the headphones, but you'll also get cases, replacement ear pads, cables, and "I'm selling everything in this photo" bundle listings.

Each search result gets a relevance score based on several factors:

- **Model number match** (+100 points) -- if the model number appears in the candidate product name. If the source product has a model number but the candidate doesn't contain it, that's a -30 penalty.
- **Brand match** (+50 points) -- the brand name appears in the candidate.
- **Word overlap** (+5 points per word) -- meaningful words from the source product name that appear in the candidate.
- **Negative patterns** (up to -40 per pattern) -- accessory keywords (case, cover, film), compatibility phrases, bundle terms, and junk condition labels trigger penalties.

The negative pattern check is context-aware. If the source product itself is an accessory (say, a phone case), the penalty doesn't apply. This prevents the system from filtering out the exact type of product being searched for.

Results are sorted by relevance score, and the side panel displays the best match for each platform.

## The Profit Scoring Algorithm

Once Arbitra has prices from multiple platforms, it calculates a profit score on a 0-100 scale with three verdicts: BUY (70+), CONSIDER (40-69), and PASS (below 40).

The score combines four components:

| Factor | Max Points | Logic |
|--------|-----------|-------|
| Profit margin | 40 | 30%+ margin = 40pts, 20%+ = 30pts, 10%+ = 20pts |
| ROI | 30 | 50%+ ROI = 30pts, 30%+ = 20pts, 15%+ = 10pts |
| Price difference | 20 | 3000+ yen gap = 20pts, 1000+ = 15pts, 500+ = 10pts |
| Competition | 10 | Reserved for future implementation |

The calculation accounts for platform-specific fees. Amazon charges a referral fee (typically 8-15% depending on category) plus FBA fulfillment fees. Mercari takes a flat 10% cut. Yahoo Auctions charges 8.8% for premium members and 10% for regular members.

The side panel presents this as a color-coded card: green for BUY with a checkmark and the calculated profit amount, yellow for CONSIDER, red for PASS. Below that, a comparison table shows the numbers for both FBA (Fulfillment by Amazon) and self-shipping scenarios, so you can see which fulfillment method gives better margins.

## The Watchlist: Tracking Prices Over Time

Arbitrage opportunities are time-sensitive. A price gap that exists today might close tomorrow, or it might widen. Arbitra's watchlist feature lets you track products over time.

When you find a product worth monitoring, you add it to the watchlist. The extension stores the product data -- ASIN, title, image, search query, and current prices across all three platforms -- in Chrome's local storage.

A background alarm fires every 60 minutes and re-checks prices for all active watchlist items. It runs searches against Mercari, Yahoo Auctions, and Amazon using the same search infrastructure, calculates price statistics (min, max, median, average), and stores daily price history entries.

The watchlist panel in the side panel displays each tracked product with its current prices and a price history chart built with Chart.js. If a price changes by more than 10%, the extension sends a Chrome notification. You can also set a target price -- when the average Mercari price drops below your target, you get notified immediately.

Price history is retained for 90 days, which is usually enough to spot seasonal patterns and identify the best timing for purchases.

## State Management with Zustand

The side panel is a React application, and I chose Zustand for state management. It's a fraction of the size of Redux, has no boilerplate, and works well with Chrome extension messaging patterns.

The store holds prices, loading states, usage data, subscription status, and user settings. Zustand's selector pattern lets components subscribe to exactly the slice of state they need:

```typescript
const useAppStore = create<AppState>((set) => ({
  prices: [],
  isLoading: false,
  subscription: { isPro: false },
  settings: {
    defaultCategory: 'default',
    isYahooPremium: false,
    defaultShippingCost: 200,
  },
  setPrices: (prices) => set({ prices }),
  setLoading: (isLoading) => set({ isLoading }),
  // ...
}));
```

The side panel listens for `SEARCH_RESULTS_UPDATED` messages from the background worker and updates the store. This triggers re-renders only in components that depend on the changed data. The profit score calculation runs as a callback when results change, comparing the lowest price across platforms against the highest to find the optimal buy-sell pair.

## What I Learned About Scraping at Scale

Building Arbitra taught me a few hard lessons about web scraping in a browser extension context:

**Rate limiting is real.** Each search triggers at least two HTTP requests from the background worker. If a user clicks "analyze" rapidly on multiple products, the extension can get temporarily blocked by Mercari or Yahoo Auctions. I added a 3-second delay between watchlist price checks to avoid triggering rate limits during background updates.

**HTML parsing is fragile.** I have five different fallback strategies for parsing Mercari search results. The first one (API call) is the most reliable but doesn't always work. Each subsequent fallback handles a different scenario -- NEXT_DATA present, NEXT_DATA absent, different state management patterns, raw HTML with item links. This approach is ugly but resilient.

**Content scripts and background workers have different capabilities.** Content scripts can access the DOM but can't make cross-origin requests. The background worker can fetch from any domain but can't touch the DOM. The Hybrid Approach for Mercari search pages bridges this gap by having the content script extract DOM data and the background worker handle the aggregation.

**SPA navigation breaks content scripts.** Amazon, Mercari, and Yahoo Auctions all use client-side navigation in varying degrees. A `MutationObserver` watching for URL changes handles re-initialization when the user navigates to a different product page without a full page load.

## The Tech Stack

For anyone curious about the full setup:

- **Build**: Vite + CRXJS (Chrome extension Vite plugin)
- **Language**: TypeScript throughout
- **UI**: React 19 + Tailwind CSS 4
- **State**: Zustand
- **Charts**: Chart.js for price history visualization
- **Backend**: Supabase (free tier) for price history persistence and user settings sync
- **Analytics**: GA4 Measurement Protocol for install/update tracking
- **Payments**: ExtensionPay for the Pro subscription

CRXJS deserves a mention. It lets you develop a Chrome extension with Vite's hot module replacement, which makes the development loop almost as fast as working on a regular web app. You write your manifest as a JSON import, and the plugin handles all the Chrome extension build gymnastics.

## Usage Limits and the Freemium Model

The free tier allows 5 searches per day. Each search checks all three platforms in parallel, so it's 5 complete comparisons. The Pro tier removes this limit and adds price change notifications on the watchlist.

The daily limit is tracked in Chrome's local storage with a simple date-count structure. If the current date doesn't match the stored date, the count resets. Pro status is managed through ExtensionPay, which handles payment processing and license verification through a lightweight API.

## Try It Out

If you do retail arbitrage between Japanese marketplaces, or if you're just curious about price differences across Amazon, Mercari, and Yahoo Auctions, give Arbitra a try. The free tier is enough to evaluate whether it fits your workflow.

{% embed https://dev-tools-hub.xyz/extensions/arbitra %}

The extension is also available on [Microsoft Edge Add-ons](https://microsoftedge.microsoft.com/addons/detail/arbitra-%E3%81%9B%E3%81%A9%E3%82%8A%E4%BE%A1%E6%A0%BC%E6%AF%94%E8%BC%83%E3%83%84%E3%83%BC%E3%83%AB/lajjanfkakbjmfhklflgdmnbdmdnkiok) for Edge users.

---

*If this was useful, I'd appreciate a like or a bookmark. Got questions about building Chrome extensions or scraping product pages? Drop a comment below.*
