---
title: "Detecting YouTube SPA Navigation in a Chrome Extension Content Script"
description: "How to reliably run code on every new YouTube video — not just on the first page load — using MutationObserver and a URL change guard."
tags: ["chrome","javascript","webdev","tutorial"]
published: true
publish_date: "2026-05-14"
canonical_url: ""
devto_id: "3550214"
---

YouTube is a single-page application. The page never fully reloads when you click a video. The URL changes, the DOM updates, but `DOMContentLoaded` fires exactly once — when Chrome first loads the tab.

This breaks the most natural assumption in Chrome extension development: that your content script runs once per page. For YouTube, "once per page load" means once for the entire session.

I hit this while building [LectureLoop](https://chromewebstore.google.com/detail/dkfjdnchkngbkeocblinimimiddfnkbg) — an extension that injects a side panel and loop replay controls onto YouTube lecture videos. When a user navigates from one video to another, the extension needs to reset, re-detect the video element, and reinitialize its state. Without handling SPA navigation, it just… stops working after the first video.

## The Problem with `window.location`

The naive fix is to watch `window.location.href` for changes. Chrome content scripts can read `window.location` freely. The issue is timing: YouTube uses the History API (`history.pushState`) to update the URL. There's no event you can listen to directly — `popstate` only fires on back/forward navigation, not on `pushState` calls.

You could poll with `setInterval`, but polling is inaccurate by definition and wastes CPU even when nothing is happening.

## MutationObserver on `document.body`

The approach that actually works is watching `document.body` for DOM subtree changes and comparing the URL on each mutation:

```typescript
let lastUrl = location.href;

const navObserver = new MutationObserver(() => {
  if (location.href !== lastUrl) {
    lastUrl = location.href;
    setTimeout(init, 1500);
  }
});

navObserver.observe(document.body, { childList: true, subtree: true });

window.addEventListener('pagehide', () => navObserver.disconnect(), { once: true });
```

The `setTimeout(init, 1500)` gives YouTube's React app time to finish rendering the new video element before `init()` tries to query it. Without the delay, `document.querySelector('video')` returns `null` — YouTube has updated the URL but hasn't yet replaced the DOM.

The `pagehide` cleanup matters: if the tab is closed or navigated away from, you want to disconnect the observer rather than leaving it running against an unmounted document.

## The Loop Replay Implementation

Once the content script reliably re-runs on navigation, implementing loop replay is straightforward. The side panel sends a message to the content script to jump to a specific timestamp:

```typescript
chrome.runtime.onMessage.addListener((msg) => {
  if (msg.type === 'JUMP_TO_TIMESTAMP' && typeof msg.sec === 'number') {
    const video = document.querySelector('video');
    if (video) video.currentTime = msg.sec;
  }
});
```

The side panel tracks the loop start and end points. When the video's `timeupdate` event fires and the current time exceeds the loop end, it sends `JUMP_TO_TIMESTAMP` with the loop start time. This gives users a way to replay a specific section of a lecture repeatedly without scrubbing the timeline by hand.

## Why Not `scripting.executeScript`?

An alternative is to use `chrome.scripting.executeScript` from the background service worker instead of keeping long-lived listeners in a content script. The tradeoff: `executeScript` requires the `scripting` permission, which triggers a warning in the Chrome Web Store review process about "reading browsing history." Using a content script with `matches: ["https://www.youtube.com/*"]` avoids this — it's a declared, static permission that reviewers understand at a glance.

It's a minor point, but CWS reviewers look at permissions carefully. Keeping the injection in the content script declaration rather than calling `executeScript` from background kept the permission list clean.

## Lessons

Three things I'd do differently on the next extension that needs SPA navigation handling:

1. **Set the URL guard at the start of `init()`**, not just in the observer. If `init()` is async and runs while the user clicks to a third video, you can end up with two concurrent initializations racing each other.

2. **Use a cancellation token**. Start each `init()` with an incrementing ID, and bail out of the async steps if a newer ID has been issued.

3. **Log every navigation event in development**. YouTube's SPA navigation is fast and the delay is imprecise — having a visible indicator that the observer fired makes the timing problem much easier to debug.

---

🔗 **LectureLoop on Chrome Web Store**: [Install](https://chromewebstore.google.com/detail/dkfjdnchkngbkeocblinimimiddfnkbg)
