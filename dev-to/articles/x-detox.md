---
title: "I Built a Chrome Extension to Remove X/Twitter's Algorithmic Feed and Reclaim My Timeline"
published: false
tags: ["chromeextension","twitter","productivity","mentalhealth"]
series: null
canonical_url: null
publish_date: "2026-04-06"
devto_id: "3392106"
---

I used to open Twitter to check what the people I follow were saying. Somewhere along the way, that stopped being what Twitter showed me.

Instead of tweets from friends and accounts I deliberately chose to follow, my feed was full of rage-bait threads from strangers, promoted tweets disguised as organic content, trending topics I never asked about, and "Who to follow" suggestions based on whatever the algorithm decided would keep me scrolling longest.

I'd open the app to check one thing and surface 20 minutes later, irritated and wondering how I ended up reading a heated debate between two people I've never heard of. The "For You" tab had become the default, and every time I navigated away, X would silently switch me back.

So I built **X Detox** -- a Chrome extension that strips out X/Twitter's algorithmic recommendation layers and gives you back a chronological timeline of just the people you follow. No trends, no promoted tweets, no suggested users, no Grok AI buttons. Just the feed you curated.

## The Problem with Algorithmic Feeds

Algorithmic feeds are optimized for engagement, not for what's good for you. High-engagement content tends to be emotionally provocative -- outrage, fear, controversy. The more time you spend scrolling, the more ad impressions the platform generates. Your attention is the product being sold.

The "For You" tab on X surfaces content designed to maximize time on platform. It mixes in tweets from accounts you don't follow, trending topics, and promoted content. Even if you click the "Following" tab, X resets you back to "For You" on your next visit.

I wanted to break this cycle permanently, without leaving the platform entirely.

## The Technical Approach

X Detox takes a two-pronged approach: CSS injection to hide unwanted UI elements, and DOM manipulation with MutationObserver to force the timeline tab selection.

### CSS Injection: Hiding the Noise

The simplest and most performant way to hide elements on a web page is CSS. X Detox generates CSS rules dynamically based on user settings and injects them into the page via a `<style>` element.

Here's how the CSS generation works at a high level:

```typescript
const STYLE_ID = 'x-detox-styles';

function generateCSS(settings: Settings): string {
  const rules: string[] = [];

  if (settings.hideTrends) {
    rules.push(`
      [aria-label="Timeline: Trending now"],
      [aria-label*="Trending"],
      [data-testid="trend"],
      [data-testid="sidebarColumn"] section,
      [data-testid="sidebarColumn"] aside
      { display: none !important; }
    `);
  }

  if (settings.hidePromotedTweets) {
    rules.push(`
      article:has([data-testid="placementTracking"]),
      [data-testid="placementTracking"],
      [aria-label="Who to follow"],
      [data-testid="sidebarColumn"] [data-testid="UserCell"]
      { display: none !important; }
    `);
  }

  return rules.join('\n');
}

function injectStyles(settings: Settings): void {
  let styleEl = document.getElementById(STYLE_ID) as HTMLStyleElement | null;

  if (!styleEl) {
    styleEl = document.createElement('style');
    styleEl.id = STYLE_ID;
    styleEl.setAttribute('type', 'text/css');
    (document.head || document.documentElement).appendChild(styleEl);
  }

  styleEl.textContent = generateCSS(settings);
}
```

A few things worth calling out:

**Why CSS over DOM removal?** Removing elements from the DOM with JavaScript is fragile. If X re-renders a component (which React-based SPAs do constantly), the element comes right back and you have to remove it again. CSS `display: none !important` is permanent as long as the stylesheet is present. The browser's rendering engine handles it, and re-renders don't break anything.

**Why `!important`?** X uses inline styles and high-specificity selectors. Without `!important`, X's own styles would override our hiding rules.

**Why dynamic generation?** Each setting controls a group of CSS rules. When the user toggles a setting in the popup, the entire stylesheet is regenerated and replaced. This is cheaper than maintaining individual rules -- the browser only needs to reparse one `<style>` element.

### Selector Strategy: data-testid vs. aria-label

One of the trickiest parts of building a content-hiding extension for a platform like X is finding stable selectors. X uses React and generates dynamic class names that change on every build. You can't rely on `.r-1234abcd` staying the same next week.

Instead, I use two types of selectors:

1. **`data-testid` attributes**: X's engineering team uses these for their own testing infrastructure. They tend to be stable because internal test suites depend on them. `data-testid="placementTracking"` reliably identifies promoted tweets, `data-testid="trend"` marks trend items, and `data-testid="sidebarColumn"` is the right sidebar container.

2. **`aria-label` attributes**: These are accessibility labels, and they're part of the public contract X makes with screen readers. Changing them would break accessibility compliance. `aria-label="Timeline: Trending now"` and `aria-label="Who to follow"` have been stable across multiple X redesigns.

I avoid class-based selectors entirely. If you grep through the X DOM, you'll find classes like `css-175oi2r` and `r-1awozwy` -- these are generated by their build system and can change daily.

### Forcing the Following Tab: MutationObserver

Hiding sidebar elements with CSS is straightforward. Forcing the timeline to show the "Following" tab instead of "For You" is harder.

X defaults to the "For You" algorithmic tab every time you visit the home page. Even if you manually click "Following," it won't remember your preference across visits. This is clearly a deliberate product decision -- they want you on the algorithmic feed.

My approach uses two MutationObservers: one to watch for DOM changes on the page, and another to detect URL changes (since X is a single-page app and doesn't trigger traditional page loads).

```typescript
function findFollowingTab(): HTMLElement | null {
  const tabList = document.querySelector('[role="tablist"]');
  if (!tabList) return null;

  const tabs = tabList.querySelectorAll('[role="tab"]');
  for (const tab of tabs) {
    const text = tab.textContent?.toLowerCase() || '';
    if (text.includes('following') || text.includes('\u30d5\u30a9\u30ed\u30fc\u4e2d')) {
      return tab as HTMLElement;
    }
  }
  return null;
}

function isForYouSelected(): boolean {
  const tabList = document.querySelector('[role="tablist"]');
  if (!tabList) return false;

  const tabs = tabList.querySelectorAll('[role="tab"]');
  for (const tab of tabs) {
    const text = tab.textContent?.toLowerCase() || '';
    const isSelected = tab.getAttribute('aria-selected') === 'true';
    if ((text.includes('for you') || text.includes('\u304a\u3059\u3059\u3081')) && isSelected) {
      return true;
    }
  }
  return false;
}

function switchToFollowing(): void {
  if (!window.location.pathname.includes('/home') &&
      window.location.pathname !== '/') {
    return;
  }

  if (!isForYouSelected()) return;

  const followingTab = findFollowingTab();
  if (followingTab) {
    followingTab.click();
  }
}
```

The logic is simple: check if the "For You" tab is currently selected by reading its `aria-selected` attribute, find the "Following" tab by its text content, and click it programmatically.

But the timing is everything. X loads its UI progressively. When you navigate to the home page, the tab list might not exist yet. When X re-renders the page (which happens frequently in their React SPA), the "For You" tab might get selected again.

That's where the MutationObserver comes in:

```typescript
function setupTimelineObserver(): void {
  const observer = new MutationObserver(() => {
    switchToFollowing();
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true,
  });
}
```

This watches the entire DOM for changes. Every time X adds, removes, or modifies a node anywhere in the page, the observer fires and checks whether the tab needs switching. It's aggressive, but it needs to be -- X can switch the tab back at any point during its render cycle.

The second observer handles SPA navigation:

```typescript
function setupUrlObserver(): void {
  let lastUrl = location.href;

  const urlObserver = new MutationObserver(() => {
    if (location.href !== lastUrl) {
      lastUrl = location.href;
      setTimeout(switchToFollowing, 300);
    }
  });

  urlObserver.observe(document.body, {
    childList: true,
    subtree: true,
  });
}
```

Since X uses client-side routing, the URL changes without a page reload. There's no native browser event for SPA navigation (the `popstate` event only fires for back/forward, not for programmatic navigation). Watching for DOM mutations and comparing `location.href` is a reliable way to detect these transitions. The 300ms delay gives X time to render the new page before we try to switch tabs.

### Internationalization: Why Text Matching Needs Multiple Languages

X serves its UI in the user's browser language. In English, the tabs say "For you" and "Following." In Japanese, they say "\u304a\u3059\u3059\u3081" and "\u30d5\u30a9\u30ed\u30fc\u4e2d." The tab-switching logic needs to handle both (and more).

I could have checked only the English strings and called it done. But that would break the extension for anyone whose X interface is in a non-English language. So the text matching includes multiple languages:

```typescript
// English: "following", Japanese: "\u30d5\u30a9\u30ed\u30fc\u4e2d"
if (text.includes('following') || text.includes('\u30d5\u30a9\u30ed\u30fc\u4e2d')) {
  return tab as HTMLElement;
}
```

The extension's popup UI itself supports 7 languages: English, Japanese, Korean, German, French, Italian, and Spanish. Language is auto-detected from the browser locale and can be changed manually via a dropdown.

### The Timing Dance: document_start

The content script runs at `document_start`, meaning CSS is injected before X's own styles load. The user never sees trending or promoted content flash on screen -- it's invisible from the first paint.

But `document_start` means `document.body` doesn't exist yet. So initialization uses a three-stage approach:

1. **Immediate execution**: Inject styles right away (attaching to `document.documentElement` if `document.head` isn't ready)
2. **DOMContentLoaded**: Re-inject once the DOM is parsed
3. **window.load + 1s delay**: Re-inject to catch X's lazy-loaded components

```typescript
init(); // Run immediately

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    injectStyles(currentSettings);
  });
}

window.addEventListener('load', () => {
  setTimeout(() => injectStyles(currentSettings), 1000);
});
```

Is triple injection overkill? Maybe. But it prevents visual flicker, and injecting CSS is cheap.

## Settings and Real-Time Updates

All settings are stored in `chrome.storage.sync`, which means they sync across your Chrome instances if you're signed in. Change a setting on your laptop, and it applies on your desktop automatically.

The popup modifies settings, and the content script listens for changes in real time:

```typescript
function onSettingsChanged(callback: (settings: Settings) => void): () => void {
  const listener = (
    changes: { [key: string]: chrome.storage.StorageChange },
    areaName: string
  ) => {
    if (areaName === 'sync' && changes.settings) {
      callback({ ...DEFAULT_SETTINGS, ...changes.settings.newValue });
    }
  };
  chrome.storage.onChanged.addListener(listener);
  return () => chrome.storage.onChanged.removeListener(listener);
}
```

When the user toggles "Hide Trends" in the popup, the content script immediately regenerates and replaces the CSS. The trending sidebar vanishes (or reappears) without a page reload.

## What Gets Hidden (and What Doesn't)

The free version of X Detox hides three categories of algorithmic content:

**1. The "For You" tab.** The extension auto-switches to the "Following" tab and keeps you there. You never see algorithmically curated tweets from accounts you don't follow.

**2. Trends and the sidebar.** The entire trending section, "What's happening" widget, and sidebar recommendations are hidden. The search bar in the sidebar is preserved -- that's actually useful.

**3. Promoted tweets and "Who to follow."** Ads disguised as tweets and suggested user cards are both hidden. These are identified by their `data-testid="placementTracking"` and `data-testid="UserCell"` attributes respectively.

The Pro tier adds four more options: hiding view count analytics, removing Grok AI elements, blocking Premium/Blue subscription upsells, and filtering out retweets to show only original tweets.

I wanted the core detox experience -- removing the algorithmic feed, trends, and ads -- to be free. Those are the features that actually affect your information diet and mental well-being.

## The Cat-and-Mouse Game with X's DOM

Here's the uncomfortable truth about building extensions for major platforms: they change their DOM structure regularly. Sometimes it's part of a redesign. Sometimes it's specifically to break extensions.

X's codebase is React-based, and their class names are generated hashes that change frequently. But their `data-testid` attributes and `aria-label` values tend to be more stable, because changing them would break their own testing infrastructure and accessibility compliance.

That said, I've still had to update selectors. The sidebar structure has shifted from using direct child selectors to nested sections. The "Who to follow" section has changed its `aria-label` text. Promoted tweet markers have been reorganized.

My strategy for resilience is layered selectors. Rather than relying on a single selector per element, I use multiple overlapping selectors:

```css
/* Trends: multiple selectors for the same content */
[aria-label="Timeline: Trending now"],
[aria-label*="Trending"],
[data-testid="trend"],
[data-testid="sidebarColumn"] section,
[data-testid="sidebarColumn"] aside
{ display: none !important; }
```

If X changes one selector, the others still catch it. This redundancy makes the extension more resistant to DOM changes without requiring constant updates.

## Performance Considerations

Running MutationObservers on `document.body` with `subtree: true` sounds expensive -- every DOM mutation triggers the callback.

In practice, the impact is minimal. The callback functions are lightweight: `switchToFollowing()` does a few `querySelector` calls and a string comparison, returning immediately if conditions aren't met. And CSS-based hiding has zero runtime cost after injection -- the browser's layout engine handles `display: none` natively. The vast majority of the hiding is pure CSS with no JavaScript in the loop.

## Digital Well-Being: Why This Matters

Algorithmic feeds create filter bubbles, prioritize engagement over accuracy, and make it harder to have a calm, curated information diet. By switching to a chronological timeline, you're replacing an algorithm's choices with your own. That's a small but meaningful act of digital autonomy.

X Detox doesn't block X or limit your screen time. It removes the manipulative layer of algorithmic curation and gives you the feed you actually signed up for. You still see everything from the people you follow, in the order they posted it.

## The Tech Stack

For those who want the full picture:

| Component | Technology |
|-----------|-----------|
| Language | TypeScript |
| Build | Vite + tsc |
| Manifest | Chrome Extension Manifest V3 |
| Content Script | Injected CSS + MutationObserver |
| Settings Storage | chrome.storage.sync |
| Popup | Vanilla HTML/CSS/TypeScript |
| Payments | ExtPay (ExtensionPay) |
| i18n | Custom 7-language system |
| Analytics | GA4 Measurement Protocol |

The entire extension is lightweight by design. No React in the content script, no heavy frameworks, no external dependencies at runtime. The content script is a single TypeScript file compiled to plain JavaScript. CSS does the heavy lifting.

## What I Learned

**CSS is underrated for content modification.** My first instinct was to use JavaScript to find and remove elements. CSS `display: none` is simpler, faster, and more resilient to re-renders. Use JavaScript only for things CSS can't do (like clicking tabs).

**`data-testid` attributes are your best friend.** When building extensions for React-based SPAs, test IDs are the most stable selectors available. Class names are generated hashes, IDs are rare, but test attributes persist because the platform's own tests depend on them.

**MutationObserver is powerful but needs discipline.** Observing `document.body` with `subtree: true` fires on every DOM change. Keep your callbacks cheap and bail out early when conditions aren't met.

**Internationalization matters from day one.** If your extension relies on matching text content in the DOM, you need to handle multiple languages immediately. Adding i18n later means refactoring every text comparison.

**Users care about their attention.** A lot of people feel the same frustration with algorithmic feeds. They want to use the platform on their own terms. Building tools that give people control over their digital experience is genuinely valued.

---

If you're tired of X's algorithmic feed deciding what you see, give X Detox a try. It's free for the core features and works instantly -- no account linking, no configuration required. Install it, and your timeline becomes chronological.

{% embed https://chromewebstore.google.com/detail/x-detox-hide-for-you-tren/hlaankalmjmaefkcabjcfagnkfhlkpce %}

If you have questions about the implementation or want to share your own experience with algorithmic feed detox, drop a comment below.

---

*Other tools I've built:*

{% embed https://dev-tools-hub.xyz/extensions/yahoo-kaiteki-mode %}

{% embed https://chromewebstore.google.com/detail/zenread/adoiakplckmoahmiainobfpmdomnhomj %}
