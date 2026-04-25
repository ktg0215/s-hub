---
title: "Auto-Replay Lecture Segments in Your Browser — Building a Chrome Extension for Focused Learning"
description: "How I built a Chrome extension that extracts key timestamps from YouTube lectures and lets you jump back to any moment, using YouTube's transcript API and the HTML5 video API."
tags: ["chromeextension","javascript","learning","productivity"]
published: false
publish_date: "2026-06-02"
canonical_url: ""
devto_id: "3550215"
---

The standard advice for watching long lecture videos is to take notes. The actual behavior is to watch at 1.5x, zone out for ten minutes, and then re-watch the same section three times. LectureLoop is my attempt to break that pattern.

The extension extracts key points and timestamps from YouTube lectures, displays them in a side panel, and lets you jump directly to any moment in the video. No scrubbing. No re-watching blind.

---

## Getting timestamps out of YouTube

YouTube doesn't expose a public transcript API. But almost every video has auto-generated captions, and the internal timedtext URL is embedded in the page source.

The background service worker fetches the YouTube page, extracts the `captionTracks` array from `ytInitialPlayerResponse`, and downloads the XML:

```typescript
export async function fetchTranscript(videoId: string): Promise<TranscriptSegment[]> {
  const res = await fetch(`https://www.youtube.com/watch?v=${videoId}`, {
    headers: { 'Accept-Language': 'en-US,en;q=0.9' },
  });
  const html = await res.text();

  const match = html.match(/"captionTracks":(\[.*?\])/);
  if (!match) return [];

  const tracks = JSON.parse(match[1]);
  const preferred = tracks.find(t => t.languageCode === 'en' && !t.kind)
    ?? tracks.find(t => t.languageCode === 'en')
    ?? tracks[0];

  const xmlRes = await fetch(preferred.baseUrl);
  const xml = await xmlRes.text();

  const segments: TranscriptSegment[] = [];
  const re = /<text start="([^"]+)" dur="([^"]+)"[^>]*>([\s\S]*?)<\/text>/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(xml)) !== null) {
    segments.push({
      start: parseFloat(m[1]),
      duration: parseFloat(m[2]),
      text: decodeHtmlEntities(m[3]),
    });
  }
  return segments;
}
```

The preference order — manual English first, then auto-generated, then first available — matters because auto-captions have worse accuracy for technical vocabulary.

---

## Jumping to a timestamp: the cross-context messaging problem

The side panel and the YouTube tab are different browsing contexts. The side panel can't directly call `video.currentTime = n` — it doesn't have access to the tab's DOM.

The solution is message passing. The content script registers a listener:

```typescript
chrome.runtime.onMessage.addListener((msg) => {
  if (msg.type === 'JUMP_TO_TIMESTAMP' && typeof msg.sec === 'number') {
    const video = document.querySelector('video');
    if (video) video.currentTime = msg.sec;
  }
});
```

The side panel sends the message:

```typescript
const jumpToTimestamp = (sec: number | null) => {
  if (sec === null) return;
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    const tabId = tabs[0]?.id;
    if (tabId) chrome.tabs.sendMessage(tabId, { type: 'JUMP_TO_TIMESTAMP', sec });
  });
};
```

This avoids `chrome.scripting.executeScript`, which requires a broader `scripting` permission. Messaging a pre-registered content script listener needs only `tabs` — something the extension already requires to read the current video URL.

There's a subtle edge case: content scripts in MV3 can become detached after a page refresh or navigation. If `sendMessage` fails, the side panel catches the error silently — the user just clicks again.

---

## Tracking navigation on a SPA

YouTube is a single-page app. The content script initializes once, but the user navigates between videos without a page reload.

The approach is a `MutationObserver` on `document.body` that detects URL changes:

```typescript
let lastUrl = location.href;
const navObserver = new MutationObserver(() => {
  if (location.href !== lastUrl) {
    lastUrl = location.href;
    setTimeout(init, 1500); // Wait for YouTube's DOM to settle
  }
});
navObserver.observe(document.body, { childList: true, subtree: true });
window.addEventListener('pagehide', () => navObserver.disconnect(), { once: true });
```

The 1500ms delay is necessary. YouTube's SPA transitions don't complete synchronously — if you try to inject the button immediately after the URL changes, the target DOM element (`#above-the-fold`) may not exist yet.

---

## Why chrome.sidePanel instead of a popup

The key learning feature is a list of key points with clickable timestamps. This requires a persistent, non-dismissible UI — something a popup can't provide (it closes when you click away).

Chrome's Side Panel API (`chrome.sidePanel`) is the right fit. It stays open while the user watches. One wrinkle: content scripts cannot call `chrome.sidePanel.open()` directly. The content script sends a message to the background service worker, which opens the panel:

```typescript
// content.ts
btn.addEventListener('click', () => {
  chrome.runtime.sendMessage({ type: 'OPEN_SIDEPANEL', videoId });
});

// background.ts
chrome.runtime.onMessage.addListener((msg, sender) => {
  if (msg.type === 'OPEN_SIDEPANEL' && sender.tab?.windowId) {
    chrome.sidePanel.open({ windowId: sender.tab.windowId });
  }
});
```

---

## What the extension does

LectureLoop processes YouTube lecture transcripts to extract key points and flashcards, each linked to a timestamp in the video. Clicking a key point jumps you directly to that moment. Flashcards export to Anki format.

Free: 3 videos per month. Pro: unlimited + CSV export.

Available on the Chrome Web Store: https://chromewebstore.google.com/detail/dkfjdnchkngbkeocblinimimiddfnkbg

---

*More Chrome extension builds at [dev-tools-hub.xyz](https://dev-tools-hub.xyz).*
