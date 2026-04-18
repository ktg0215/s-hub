---
title: "I Built a Scroll Position Memory Extension That Actually Works on SPAs"
published: false
publish_date: "2026-04-22"
devto_id: "3519761"
tags: ["chrome","javascript","webdev","productivity"]
---

Every browser has a native scroll restoration feature. It's called `scroll-restoration` in the History API, it's enabled by default, and it mostly doesn't work on modern web apps.

The reason is Single Page Applications. When React Router or Next.js handles navigation client-side, the browser never gets a full page load event to trigger its scroll restoration logic. You go back to a long article you were halfway through and land at the top. Every time.

I built **ReadMark** to fix this reliably, and it turned out to be a more interesting engineering problem than I expected.

## Basic Approach: URL-Keyed Position Storage

The obvious solution: save `window.scrollY` for the current URL before the user leaves, restore it when they return.

```typescript
// Save position on scroll (debounced)
const savePosition = debounce(async (url: string) => {
  const result = await chrome.storage.local.get('positions');
  const positions = result.positions ?? {};

  positions[url] = {
    position: window.scrollY,
    savedAt: Date.now(),
  };

  await chrome.storage.local.set({ positions });
}, 500);

window.addEventListener('scroll', () => savePosition(window.location.href));
```

On page load, check if there's a saved position:

```typescript
async function restorePosition(): Promise<void> {
  const url = window.location.href;
  const result = await chrome.storage.local.get('positions');
  const saved = result.positions?.[url];

  if (!saved) return;

  const expiryTime = POSITION_EXPIRY_DAYS * 24 * 60 * 60 * 1000;
  if (Date.now() - saved.savedAt > expiryTime) return; // Expired

  if (saved.position > 100) { // Skip near-top restores
    window.scrollTo({ top: saved.position, behavior: 'instant' });
    showToast('📖 Resumed from where you left off');
  }
}
```

This works fine for traditional server-rendered sites. The content is in the DOM when the page loads, the scroll works. Done.

## The SPA Problem

SPAs break this in two ways:

**Problem 1: URL changes without full page reload.** When you navigate within a React app, the URL updates via `history.pushState`, but no real navigation happens. The extension's `document_idle` injection point fires once at initial load, not on each client-side route change.

**Problem 2: Content isn't ready when you try to scroll.** Even if you detect the URL change, the page content might still be loading. Scrolling to position 2000px does nothing if there's only 800px of content in the DOM.

## Detecting Client-Side Navigation

The History API lets you intercept `pushState` and `replaceState`:

```typescript
function patchHistoryAPI(): void {
  const originalPushState = history.pushState.bind(history);
  const originalReplaceState = history.replaceState.bind(history);

  history.pushState = function (state, title, url) {
    const prevUrl = window.location.href;
    originalPushState(state, title, url);
    handleNavigation(prevUrl, window.location.href);
  };

  history.replaceState = function (state, title, url) {
    const prevUrl = window.location.href;
    originalReplaceState(state, title, url);
    // replaceState often updates hash/query without intent to navigate
    // Only handle if pathname changed
    if (new URL(prevUrl).pathname !== new URL(window.location.href).pathname) {
      handleNavigation(prevUrl, window.location.href);
    }
  };

  // Handle browser back/forward
  window.addEventListener('popstate', () => {
    handleNavigation(null, window.location.href);
  });
}
```

The `replaceState` case needs care — many SPAs call `replaceState` to update query parameters without actual navigation intent. Checking if the pathname changed avoids spurious position resets.

## Waiting for Content to Be Ready

When a navigation fires, the new content isn't rendered yet. I need to wait until the DOM has enough content at the target scroll depth:

```typescript
async function waitForScrollable(targetPosition: number): Promise<void> {
  const maxWait = 3000;
  const interval = 100;
  let elapsed = 0;

  return new Promise((resolve) => {
    const check = () => {
      const documentHeight = document.documentElement.scrollHeight;
      if (documentHeight >= targetPosition + window.innerHeight) {
        resolve();
        return;
      }

      elapsed += interval;
      if (elapsed >= maxWait) {
        resolve(); // Give up and try anyway
        return;
      }

      setTimeout(check, interval);
    };
    check();
  });
}
```

Wait until the document is tall enough to contain the target scroll position, with a 3-second timeout. If the page never gets there, attempt the scroll anyway — better than doing nothing.

## Position Expiry and Storage Management

Storing every visited URL forever would bloat `chrome.storage.local`. I expire positions after a configurable number of days and run cleanup periodically:

```typescript
async function cleanupExpiredPositions(): Promise<void> {
  const result = await chrome.storage.local.get('positions');
  const positions: Record<string, SavedPosition> = result.positions ?? {};
  const expiryMs = POSITION_EXPIRY_DAYS * 24 * 60 * 60 * 1000;
  const now = Date.now();

  const cleaned = Object.fromEntries(
    Object.entries(positions).filter(
      ([, pos]) => now - pos.savedAt < expiryMs
    )
  );

  await chrome.storage.local.set({ positions: cleaned });
}
```

The cleanup runs in the service worker on a daily alarm. `chrome.storage.local` has a 10MB quota — with typical URL lengths and position data, you'd need to visit ~50,000 pages before hitting it, but cleanup keeps things tidy.

## The Context Invalidation Edge Case

Chrome extensions get their service worker terminated when idle. If the user navigates while the service worker is waking up, `chrome.runtime.id` can be undefined briefly, causing any Chrome API call to throw:

```typescript
function isContextValid(): boolean {
  try {
    return !!chrome.runtime?.id;
  } catch {
    return false;
  }
}

// In content script, guard all chrome.* calls
if (!isContextValid()) return;
```

This null-guard is easy to overlook and causes silent failures. The extension appears broken with no error in the console — the call just throws, the try-catch swallows it, and the scroll never happens.

## What's Live

ReadMark v1.1 is on the Chrome Web Store. The SPA support works on Next.js, React Router, Vue Router, and Nuxt. Frameworks that use hash-based routing (`/#/path`) work out of the box since those trigger `hashchange` events which are caught separately.

---

*Built with TypeScript + Vite. No frameworks — the content script is vanilla TS for minimal overhead.*
