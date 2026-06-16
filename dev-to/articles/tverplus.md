---
title: "TVer Has No Playback Speed Control. I Fixed It With a Chrome Extension."
published: true
publish_date: "2026-04-24"
devto_id: "3519763"
tags: ["chrome","japan","buildinpublic","indiehacker"]
---

TVer is Japan's official free streaming platform — catch-up TV for every major broadcaster. It's the legal, ad-supported way to watch NHK, TBS, Fuji TV, and others without a cable subscription.

It's missing two features I use on every other video platform: playback speed control and Picture-in-Picture.

So I built **TVer Plus** to add them.

## Why These Two Features?

**Playback speed** is the feature I miss most. I watch a lot of documentary and news content on TVer where 1.5x is comfortable and 2x is fine for anything I'm half-watching. The native player doesn't expose this. Most modern video platforms do. The HTML5 `<video>` element supports it natively — there's no technical reason TVer can't have it.

**Picture-in-Picture** is the API that lets a video float over other windows. Chrome has had native PiP support since 2018 via `HTMLVideoElement.requestPictureInPicture()`. Again: technically trivial, just not exposed in TVer's UI.

## The Technical Approach

TVer uses a custom video player on top of a standard `<video>` element. The player controls are in a separate DOM layer. I inject a small floating control panel via content script that interacts directly with the underlying `<video>` element.

### Finding the Video Element

TVer's player wraps the video in several layers of divs:

```typescript
function findVideoElement(): HTMLVideoElement | null {
  // Try direct query first
  const video = document.querySelector<HTMLVideoElement>('video');
  if (video && video.src) return video;

  // TVer sometimes uses a video inside a shadow DOM or iframe
  // Check iframes
  for (const iframe of document.querySelectorAll('iframe')) {
    try {
      const iframeVideo = iframe.contentDocument?.querySelector<HTMLVideoElement>('video');
      if (iframeVideo && iframeVideo.src) return iframeVideo;
    } catch {
      // Cross-origin iframe — skip
    }
  }

  return null;
}
```

TVer's player structure sometimes embeds the video in an iframe for ad isolation. The try-catch handles the cross-origin case (ad iframes from third-party domains).

### Playback Speed Control

Setting playback rate is one line:

```typescript
function setPlaybackRate(video: HTMLVideoElement, rate: number): void {
  video.playbackRate = rate;
  // Persist to storage so it survives page navigation
  chrome.storage.local.set({ preferredRate: rate });
}
```

The interesting part is persistence. TVer is a SPA — navigating to a new episode triggers `pushState` without a full reload. The video element gets replaced with a new one. A MutationObserver on the player container re-applies the saved rate to new video elements:

```typescript
function observePlayerContainer(): void {
  const observer = new MutationObserver(() => {
    const video = findVideoElement();
    if (!video) return;

    chrome.storage.local.get('preferredRate', ({ preferredRate }) => {
      if (preferredRate && preferredRate !== 1) {
        // New video — wait for metadata then apply rate
        video.addEventListener('loadedmetadata', () => {
          video.playbackRate = preferredRate;
        }, { once: true });
      }
    });
  });

  const container = document.querySelector('.player-container, [class*="Player"]');
  if (container) {
    observer.observe(container, { childList: true, subtree: true });
  }
}
```

The `{ once: true }` on the event listener prevents memory leaks — it auto-removes after firing once.

### Picture-in-Picture

```typescript
async function togglePictureInPicture(video: HTMLVideoElement): Promise<void> {
  if (document.pictureInPictureElement) {
    await document.exitPictureInPicture();
    return;
  }

  if (!document.pictureInPictureEnabled) {
    showToast('Picture-in-Picture is not supported in this browser');
    return;
  }

  try {
    await video.requestPictureInPicture();
  } catch (err) {
    // User gesture required — this should always be called from a click handler
    console.error('PiP failed:', err);
  }
}
```

The `requestPictureInPicture()` call must happen in response to a user gesture (click). Trying to call it programmatically throws a `NotAllowedError`. The button in my UI is a direct click handler, which satisfies the gesture requirement.

### Ad Handling

TVer plays ads before content. Setting `playbackRate = 2` on an ad is technically possible but feels wrong (and might violate terms). I check if an ad is playing before applying speed:

```typescript
function isAdPlaying(): boolean {
  // TVer marks ad periods with specific class names or data attributes
  return (
    document.querySelector('[class*="ad-overlay"]') !== null ||
    document.querySelector('[data-ad-playing="true"]') !== null
  );
}

function setPlaybackRate(video: HTMLVideoElement, rate: number): void {
  if (isAdPlaying()) return; // Don't speed up ads
  video.playbackRate = rate;
  chrome.storage.local.set({ preferredRate: rate });
}
```

## The Floating UI

The control panel is injected into the page DOM as a fixed-position element:

```
[0.75x] [1x] [1.25x] [1.5x] [2x]    [PiP]
```

It's designed to be minimal — no branding, no settings pane, just the controls. The position is saved per-session so it stays where the user drags it.

## What TVer Plus Does Not Do

I want to be clear about what this extension doesn't do: it does not remove ads, bypass DRM, download content, or do anything that would affect TVer's revenue. The whole point of TVer is that it's ad-supported free TV. The extension just adds quality-of-life playback controls that most streaming services already provide.

The extension is available on the Chrome Web Store: https://chromewebstore.google.com/detail/ddhjonpmonmjgohicdipicodpmndnjll

---

*Built with TypeScript. Content script injection into tver.jp pages. No external dependencies.*
