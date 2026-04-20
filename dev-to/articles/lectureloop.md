---
title: "I Built a Chrome Extension That Turns YouTube Lectures into AI Study Notes and Flashcards — LectureLoop"
published: false
publish_date: "2026-05-27"
devto_id: ""
tags: ["chrome", "javascript", "webdev", "ai"]
---

I watch a lot of educational content on YouTube — conference talks, university lectures, programming tutorials. The problem: I retain almost none of it.

Taking notes manually while watching breaks the flow. Copy-pasting captions into ChatGPT after the fact is tedious. What I wanted was something that works *while* I watch, in the same window.

So I built **LectureLoop**.

## What It Does

LectureLoop is a Chrome extension that opens a side panel next to YouTube, extracts the video's captions, and uses GPT-4o-mini to generate:

- **Key point summaries** — concise bullet points from the lecture
- **Flashcards** — Q&A pairs for active recall practice
- **Processed video history** — a log of everything you've summarized this month

The side panel appears in the browser chrome alongside YouTube, so you're not switching tabs or losing your place in the video.

## Architecture

```
LectureLoop/
├── content.ts       # YouTube caption extraction + video ID detection
├── background.ts    # AI proxy calls + storage management
├── popup/           # Usage stats + video history
├── sidepanel/       # Summary + flashcard display
└── lib/
    ├── constants.ts # FREE_LIMITS, VERCEL_PROXY_URL
    └── storage.ts   # Processed video persistence
```

### Caption Extraction

YouTube exposes captions via an internal timedtext API. The content script extracts the current video ID and fetches the caption track:

```typescript
// Detect video changes in YouTube's SPA
const videoId = new URLSearchParams(location.search).get('v');
if (videoId && videoId !== lastVideoId) {
  lastVideoId = videoId;
  chrome.runtime.sendMessage({ type: 'VIDEO_CHANGED', videoId });
}
```

For SPA navigation detection, I combine `MutationObserver` with `popstate` event listening — YouTube updates the URL without a full page reload, so you need both.

### The AI Proxy

API keys in browser extensions are a security anti-pattern — they're trivially extractable from the extension package. Instead, LectureLoop routes all AI calls through a Vercel serverless function that holds the key server-side:

```typescript
// lib/constants.ts
export const VERCEL_PROXY_URL =
  'https://s-hub-dashboard-beta.vercel.app/api/llm/chat';

// background.ts
const res = await fetch(VERCEL_PROXY_URL, {
  method: 'POST',
  body: JSON.stringify({
    model: 'gpt-4o-mini',
    messages: [
      { role: 'system', content: SUMMARIZE_SYSTEM_PROMPT },
      { role: 'user', content: transcript },
    ],
  }),
});
```

This also lets me add rate limiting and abuse prevention on the server side without shipping extension updates.

### Side Panel Communication

MV3's `chrome.sidePanel` API can't be controlled directly from content scripts. The solution is a message bus through the background Service Worker:

```
content.ts  →  background.ts  →  sidepanel
              (message router)
```

When the content script detects a new video, it messages `background.ts`. Background updates storage and the side panel subscribes to `chrome.storage.onChanged` to re-render. Clean separation, no direct cross-context calls.

## Free vs. Pro Tiers

| Feature | Free | Pro ($7/mo) |
|---------|------|-------------|
| Videos / month | 3 | Unlimited |
| Flashcard generation | Limited | Unlimited |
| Export to Markdown | — | ✓ |

Three free videos/month lets users verify the quality of summaries before committing. The real value driver is flashcard generation — once you've used spaced repetition to actually retain lecture content, the $7 price is an easy sell.

## Lessons from the Build

**The hardest bug** was the side panel not updating when the video changed. Root cause: the side panel's `chrome.storage.onChanged` listener wasn't firing because the panel had been opened before the extension was fully initialized. Fix: always call `getStorageData()` on panel mount to hydrate state, and treat storage events as incremental updates only.

**Caption availability is inconsistent.** Auto-generated captions exist for most English videos but are absent for many non-English lectures. I'm working on a fallback that uses the transcript from the video description when captions aren't available.

---

**Chrome Web Store:** https://chromewebstore.google.com/detail/dkfjdnchkngbkeocblinimimiddfnkbg

If you learn from YouTube videos and want better retention without changing your workflow, give LectureLoop a try.
