---
title: "Maintaining State Across Separate Screenshots: How Procshot Sequences Steps Automatically"
published: false
tags: ["chrome","javascript","mv3","buildinpublic"]
series: null
canonical_url: null
publish_date: "2026-06-29"
devto_id: "3960056"
---

[Procshot](https://chromewebstore.google.com/detail/procshot/ieblehdloggcpmkncplccjofeoakhkll) generates numbered step-by-step guides from browser screenshots. The core mechanic: each screenshot gets a sequence number automatically, so screenshot 1, screenshot 2, screenshot 3 come out labeled without any manual numbering.

The implementation challenge: Chrome screenshots are stateless. Each call to `chrome.tabs.captureVisibleTab()` is independent. There's no built-in "sequence number" — you have to maintain it yourself across arbitrarily many captures that might happen minutes or hours apart.

Here's how I handle it.

---

## Why Service Worker State Is Not Enough

The obvious approach: keep a `let sequenceNumber = 0` in the service worker and increment it on each capture.

```javascript
// DON'T DO THIS
let sequenceNumber = 0;

chrome.runtime.onMessage.addListener((msg) => {
  if (msg.type === 'CAPTURE') {
    sequenceNumber++;
    captureAndAnnotate(sequenceNumber);
  }
});
```

MV3 service workers are killed when idle — after 30 seconds with no activity, or when Chrome is under memory pressure. If a user captures screenshot 3, tabs away for two minutes to read something, then comes back for screenshot 4: the service worker has restarted. `sequenceNumber` is back to 0. Screenshot 4 gets labeled "1".

This was a real bug in early versions. Users capturing a 10-step guide would come back after a break to find the sequence reset mid-guide.

## Persisting Sequence State to Storage

The fix: treat `sequenceNumber` as persisted state, not in-memory state.

```javascript
async function getNextSequenceNumber(sessionId) {
  const key = `seq_${sessionId}`;
  const result = await chrome.storage.session.get(key);
  const current = result[key] ?? 0;
  const next = current + 1;
  await chrome.storage.session.set({ [key]: next });
  return next;
}
```

`chrome.storage.session` persists for the lifetime of the browser session — it survives service worker restarts but clears when Chrome closes. That matches the expected use case: you're capturing a guide in one sitting, not across days.

For cross-session continuity (if someone closes Chrome mid-guide and wants to continue later), swap to `chrome.storage.local` with explicit session management.

## Sessions: When Does Numbering Reset?

Sequence numbering needs to reset when the user starts a new guide. Options:

1. **Timer-based**: Reset if more than N minutes have passed since the last capture
2. **Explicit reset**: User clicks "New Guide" button
3. **Tab-based**: Treat each root URL as a separate guide

Procshot uses option 1 (timer) + option 2 (explicit) together. The timer threshold is configurable (default: 30 minutes). If you're capturing a guide about a 3-page checkout flow, you'll naturally move quickly. If you abandon a capture session for hours, the next capture starts fresh.

```javascript
const SESSION_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes default

async function getSessionId() {
  const result = await chrome.storage.session.get(['sessionId', 'lastCaptureAt']);
  const { sessionId, lastCaptureAt } = result;
  const now = Date.now();

  if (!sessionId || !lastCaptureAt || now - lastCaptureAt > SESSION_TIMEOUT_MS) {
    // New session
    const newId = crypto.randomUUID();
    await chrome.storage.session.set({ sessionId: newId, lastCaptureAt: now });
    return newId;
  }

  await chrome.storage.session.set({ lastCaptureAt: now });
  return sessionId;
}
```

`crypto.randomUUID()` is available in MV3 service workers without any polyfill.

## Annotation: Drawing on Screenshots

`captureVisibleTab()` returns a PNG as a data URL. To add a step number badge, you need to decode the PNG, draw on it, and re-encode.

This can't be done in the service worker directly — the Canvas API isn't available in service workers (it's a DOM API). The options:

**Option A: Offscreen document (MV3 way)**

```javascript
// In service worker
const contexts = await chrome.runtime.getContexts({
  contextTypes: ['OFFSCREEN_DOCUMENT'],
});

if (!contexts.length) {
  await chrome.offscreen.createDocument({
    url: 'offscreen.html',
    reasons: ['CANVAS'],
    justification: 'Annotate screenshot with step number',
  });
}

const result = await chrome.runtime.sendMessage({
  type: 'ANNOTATE',
  screenshotDataUrl,
  stepNumber,
});
```

The offscreen document is an invisible background page that can use DOM APIs including Canvas. It was added in Chrome 109 specifically for cases like this.

**The offscreen annotation logic:**

```javascript
// offscreen.js
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type !== 'ANNOTATE') return;

  const img = new Image();
  img.onload = () => {
    const canvas = document.createElement('canvas');
    canvas.width = img.width;
    canvas.height = img.height;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0);
    drawStepBadge(ctx, msg.stepNumber, img.width);
    sendResponse({ annotated: canvas.toDataURL('image/png') });
  };
  img.src = msg.screenshotDataUrl;
  return true; // async
});

function drawStepBadge(ctx, stepNumber, imgWidth) {
  const BADGE_SIZE = 40;
  const MARGIN = 20;
  const x = MARGIN;
  const y = MARGIN;

  // Circle
  ctx.beginPath();
  ctx.arc(x + BADGE_SIZE / 2, y + BADGE_SIZE / 2, BADGE_SIZE / 2, 0, Math.PI * 2);
  ctx.fillStyle = '#f59e0b'; // amber
  ctx.fill();

  // Number
  ctx.fillStyle = '#ffffff';
  ctx.font = `bold ${BADGE_SIZE * 0.5}px sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(String(stepNumber), x + BADGE_SIZE / 2, y + BADGE_SIZE / 2);
}
```

**Option B: Content script injection**

Inject a content script that creates a canvas overlay on the page, renders the annotation client-side, and sends it back. More complex but works without an offscreen document.

The offscreen document approach is cleaner and is the MV3-idiomatic way.

## Download or Export

Once annotated, the screenshots need to reach the user. For a single screenshot: `chrome.downloads.download()` with a generated filename.

For multi-step export (all screenshots as a ZIP or a generated HTML page), the offscreen document can use the File API to create a Blob, and the service worker can trigger a download of that Blob.

```javascript
// In service worker, after all steps are captured
async function exportGuide(steps) {
  // steps: [{ stepNumber, annotatedDataUrl, url, timestamp }]
  await chrome.offscreen.createDocument({...});
  const result = await chrome.runtime.sendMessage({
    type: 'EXPORT_HTML',
    steps,
    title: 'My Guide',
  });
  // result.htmlBlob is a data URL of the generated HTML
  chrome.downloads.download({
    url: result.htmlBlob,
    filename: 'guide.html',
  });
}
```

---

The full implementation is in [Procshot](https://chromewebstore.google.com/detail/procshot/ieblehdloggcpmkncplccjofeoakhkll). It handles session management, annotation, and one-click HTML export — free for up to 5 screenshots per guide, unlimited with Pro.

What's the trickiest part of your screenshot tooling? For me it was the MV3 offscreen document API — the timing between creating the document and sending the first message has some edge cases that took a few iterations to get right.
