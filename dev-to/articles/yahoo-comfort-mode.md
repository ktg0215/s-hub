---
title: "I Built a Chrome Extension to Filter Low-Quality News on Yahoo Japan"
published: false
tags: ["chromeextension", "japan", "productivity", "ux"]
series: null
canonical_url: null
publish_date: "2026-04-11"
devto_id: null
---

If you live in Japan or read Japanese news online, you probably use Yahoo! JAPAN. It is the most visited website in the country, and its news portal aggregates stories from hundreds of sources. The problem is that a large percentage of those stories are what Japanese internet culture calls "kotatsu articles" -- low-effort content written without any original reporting, usually assembled by rewriting social media posts or celebrity gossip into clickbait headlines.

The term comes from the image of a journalist who never leaves their kotatsu (a heated table common in Japanese homes) to do actual reporting. They just sit there, scroll Twitter, and churn out articles with titles like "Fans react with shock!" or "This went viral on social media!" These articles are everywhere on Yahoo News, and they crowd out the actual journalism from NHK, Asahi Shimbun, Reuters, and other legitimate outlets.

I got tired of scrolling past them. So I built **Yahoo Comfort Mode** (Yahoo快適モード), a Chrome extension that filters out low-quality articles, removes ads, and gives you a cleaner browsing experience on Yahoo! JAPAN.

## The Architecture: Content Script with Multiple Filter Layers

The extension is built with TypeScript, React, Vite, and the CRXJS Vite plugin for Chrome extension development. The core logic lives in a content script that runs on Yahoo! JAPAN pages and applies multiple filtering layers to each article it finds in the DOM.

Here is the main class that orchestrates everything:

```typescript
class YahooKaitekiMode {
  private keywordFilter: KeywordFilter;
  private sourceFilter: SourceFilter;
  private kotatsuDetector: KotatsuDetector;
  private cleanMode: CleanMode;
  private isEnabled: boolean = true;
  private settings: Settings | null = null;

  async init(): Promise<void> {
    this.settings = await getSettings();
    this.isEnabled = this.settings.enabled;

    if (!this.isEnabled) return;

    this.configureFilters(this.settings);

    onDomReady(() => {
      this.filterPage();
      initDomObserver(() => this.filterPage());

      if (this.settings?.cleanModeEnabled) {
        this.cleanMode.setEnabled(true);
      }
    });

    this.unsubscribeSettings = onSettingsChange(
      (newSettings, oldSettings) => {
        this.handleSettingsChange(newSettings, oldSettings);
      }
    );
  }
}
```

The design uses four independent filter classes that each evaluate articles against different criteria. When a page loads, the content script collects all article elements, parses them, and runs each one through the filter chain.

## Page-Specific DOM Selectors

Yahoo! JAPAN is not a single-page app. It is a collection of different properties -- the main portal at `www.yahoo.co.jp`, the news section at `news.yahoo.co.jp`, and the sports section at `sports.yahoo.co.jp`. Each has a different DOM structure for displaying articles.

The extension detects which Yahoo property the user is on and applies the appropriate selectors:

```typescript
private getArticleElements(): HTMLElement[] {
  const hostname = window.location.hostname;

  if (hostname.includes('news.yahoo.co.jp')) {
    return getYahooNewsArticles();
  } else if (hostname === 'www.yahoo.co.jp') {
    return getYahooTopArticles();
  } else if (hostname.includes('sports.yahoo.co.jp')) {
    return getYahooSportsArticles();
  }

  return Array.from(
    document.querySelectorAll(
      'article, [class*="article"], [class*="news"]'
    )
  ) as HTMLElement[];
}
```

Each selector module knows how to find article containers, extract titles, source names, and content snippets from the specific DOM structure of that Yahoo property. The fallback at the end catches edge cases where Yahoo rolls out new page layouts.

## The Kotatsu Detector: Scoring Low-Quality Articles

This is the part I am most proud of. Rather than relying on simple keyword matching, the kotatsu detector uses a multi-factor scoring system to evaluate whether an article is likely low-quality content.

Each article gets a score based on several signals:

```typescript
calculateScore(
  title: string, content: string, source: string
): number {
  let score = 0;

  if (this.isKotatsuSource(source)) {
    score += this.config.sourceScore;
  }
  if (this.isGossipSource(source)) {
    score += this.config.gossipScore;
  }

  const titleMatches = this.countPatternMatches(
    title, KOTATSU_PATTERNS.titlePatterns
  );
  score += titleMatches * this.config.titlePatternScore;

  const contentMatches = this.countPatternMatches(
    content, KOTATSU_PATTERNS.contentPatterns
  );
  score += contentMatches * this.config.contentPatternScore;

  if (this.hasSocialEmbed(content)) {
    score += this.config.socialEmbedScore;
  }

  score += this.checkAdditionalPatterns(title, content);
  return score;
}
```

The scoring factors include:

- **Source reputation**: Known kotatsu sources (like content aggregators that rewrite social media posts) and gossip tabloids get high base scores.
- **Title patterns**: Regex patterns that match common clickbait formulas in Japanese, such as sensationalist brackets, viral claims, and shock-value phrases.
- **Content patterns**: Phrases commonly found in low-effort articles, like the infamous "How was it?" (いかがでしたか) closing line that plagues Japanese web content.
- **Social media embeds**: Articles that are mostly embedded tweets or Instagram posts with a thin wrapper of text score higher.
- **Clickbait indicators**: Multiple exclamation marks, bracket-enclosed labels, sensationalist vocabulary.

The detector has three strength levels (low, medium, high) with different thresholds and score weights. On the "low" setting, only articles scoring 70 or above get filtered. On "high," the threshold drops to 30, catching more borderline content.

Importantly, trusted sources like NHK, major national newspapers, and international wire services are whitelisted -- they never get filtered regardless of their score.

## Keyword and Source Filtering

Beyond the kotatsu detector, users can set up their own filters:

**Keyword filtering** uses a combination of simple string matching and TinySegmenter, a lightweight Japanese text segmentation library. Japanese text does not use spaces between words, so naive substring matching produces false positives. TinySegmenter breaks Japanese text into word-level tokens before matching, which significantly reduces incorrect matches:

```typescript
shouldBlock(text: string): FilterResult {
  if (!text || this.normalizedKeywords.length === 0) {
    return { shouldFilter: false };
  }

  const normalizedText = text.toLowerCase();

  for (let i = 0; i < this.normalizedKeywords.length; i++) {
    const keyword = this.normalizedKeywords[i];

    if (normalizedText.includes(keyword)) {
      return {
        shouldFilter: true,
        reason: 'keyword',
        matchedValue: this.keywords[i],
      };
    }

    if (containsKeyword(text, this.keywords[i])) {
      return {
        shouldFilter: true,
        reason: 'keyword',
        matchedValue: this.keywords[i],
      };
    }
  }

  return { shouldFilter: false };
}
```

**Source filtering** lets users block specific news sources by name. The extension also ships with preset filter groups -- gossip magazines, inflammatory media outlets, and content aggregators -- that users can toggle on with a single click. The presets are curated lists of sources known for producing low-quality content.

## Clean Mode: Ad Removal via CSS Injection

The clean mode feature removes advertisements from Yahoo! JAPAN pages using CSS injection. Rather than using an aggressive approach that might break page layout, I opted for targeted selectors that only match known ad containers:

```typescript
private injectStyles(): void {
  this.styleElement = document.createElement('style');
  this.styleElement.id = 'yahoo-kaiteki-clean-mode';
  this.styleElement.textContent = `
    .yjAd,
    .yads,
    iframe[src*="yads.yjtag.yahoo.co.jp"],
    iframe[src*="doubleclick.net"],
    iframe[src*="googlesyndication"] {
      display: none !important;
    }

    .yahoo-kaiteki-ad-hidden {
      display: none !important;
    }
  `;

  document.head.appendChild(this.styleElement);
}
```

The selectors target Yahoo's own ad classes (`yjAd`, `yads`) and common third-party ad iframes. Each Yahoo property also has its own ad selector function that handles property-specific ad containers. The extension marks hidden elements with a data attribute so they can be restored if the user disables clean mode.

## Handling Dynamic Content with MutationObserver

Yahoo! JAPAN loads content dynamically as users scroll. New articles appear in the feed without a full page reload. To catch these, the extension uses a MutationObserver that triggers the filter pipeline whenever the DOM changes:

```typescript
onDomReady(() => {
  this.filterPage();
  initDomObserver(() => this.filterPage());
});
```

The observer watches for added nodes in the main content area. When it detects new elements, it calls `filterPage()` again, but the function skips elements that have already been processed by checking for a data attribute marker.

## Real-Time Settings with chrome.storage

All settings are persisted using `chrome.storage.sync` so they follow the user across devices. The extension listens for storage changes and reacts in real time -- if a user adds a new keyword in the options page, the content script picks it up immediately and re-filters the page:

```typescript
private handleSettingsChange(
  newSettings: Settings, oldSettings: Settings
): void {
  if (newSettings.enabled !== oldSettings.enabled) {
    this.isEnabled = newSettings.enabled;
    if (this.isEnabled) {
      this.configureFilters(newSettings);
      this.filterPage();
      initDomObserver(() => this.filterPage());
    } else {
      this.showAllArticles();
      stopDomObserver();
    }
    return;
  }

  this.showAllArticles();
  this.filterPage();
}
```

When settings change, the extension first restores all previously hidden articles, then re-runs the filter pipeline with the updated criteria. This ensures that loosening a filter immediately reveals previously hidden content.

## Statistics Tracking

The extension tracks filtering statistics -- how many articles were filtered today, this week, this month, and all time, broken down by source and keyword. This data is stored locally and displayed in the popup UI using Recharts for visualization.

Users can see which sources produce the most filtered content and which keywords catch the most articles. This feedback loop helps users refine their filtering setup over time.

## The Type System

The TypeScript type system ties everything together. The `FilterResult` type is returned by every filter and contains the verdict plus metadata about what triggered it:

```typescript
interface FilterResult {
  shouldFilter: boolean;
  reason?: 'keyword' | 'source' | 'kotatsu' | 'preset';
  matchedValue?: string;
}
```

The `Settings` type captures the full configuration surface:

```typescript
interface Settings {
  enabled: boolean;
  keywords: string[];
  blockedSources: string[];
  cleanModeEnabled: boolean;
  kotatsuEnabled: boolean;
  filterStrength: 'low' | 'medium' | 'high';
  presets: {
    gossip: boolean;
    inflammatory: boolean;
    aggregator: boolean;
  };
}
```

This strict typing caught several bugs during development, especially around the message-passing protocol between the content script, background script, and popup.

## Freemium Model

The extension uses a freemium model powered by ExtensionPay (which wraps Stripe). The free tier includes basic filtering with limits on the number of blocked sources and keywords. Premium unlocks unlimited filters, the kotatsu detector, detailed statistics, regex-based filters, and data export/import.

## What I Learned

Building this extension taught me a few things about working with content scripts on large, complex websites:

1. **DOM structures change.** Yahoo! JAPAN has updated their page layout several times since I started. Having page-specific selector modules makes it easy to update selectors without touching the core filtering logic.

2. **Japanese text processing is hard.** You cannot just split on spaces. TinySegmenter is a lightweight solution, but it is not perfect. For a Chrome extension where bundle size matters, it is a practical compromise.

3. **Scoring beats binary classification.** A simple blocklist would be too aggressive or too lenient. The multi-factor scoring approach lets users tune the sensitivity to match their tolerance for borderline content.

4. **MutationObserver is essential for modern web pages.** Without it, the extension would only filter content visible on the initial page load and miss everything that loads dynamically.

5. **Settings reactivity matters.** Users expect changes to take effect immediately. The combination of `chrome.storage.onChanged` and a handler that restores then re-filters the page creates a seamless experience.

If you use Yahoo! JAPAN and want a cleaner news experience, give it a try.

{% embed https://chromewebstore.google.com/detail/oeinpjbbingpakilcejimbibfcbbfkkg %}
