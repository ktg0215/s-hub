---
title: "Building an AI Flashcard Generator for YouTube Lectures"
published: false
publish_date: "2026-05-20"
tags: ["chrome","javascript","ai","webdev"]
devto_id: "3527734"
---

Watching a 2-hour lecture at 1.5x is fine. Retaining it isn't. Most students re-watch the same 20 minutes three times instead of reviewing structured notes. I built [LectureLoop](https://chromewebstore.google.com/detail/dkfjdnchkngbkeocblinimimiddfnkbg) to extract key points from YouTube lectures and turn them into flashcards — exportable to Anki.

## Architecture Overview

The extension has three main parts:
1. A **content script** that injects a button onto YouTube video pages
2. A **side panel** that displays the generated summary and flashcards
3. A **background service worker** that handles the LLM API call via a Vercel proxy

The LLM call routes through a Vercel serverless function so the API key never appears in the extension bundle.

## Getting the Transcript

YouTube provides auto-generated transcripts for most videos. The content script fetches the transcript via YouTube's internal timedtext API:

```typescript
async function fetchTranscript(videoId: string): Promise<TranscriptLine[]> {
  const infoUrl = `https://www.youtube.com/watch?v=${videoId}`;
  const resp = await fetch(infoUrl);
  const html = await resp.text();

  // Extract the captionTracks JSON from the ytInitialPlayerResponse
  const match = html.match(/"captionTracks":\s*(\[.*?\])/);
  if (!match) throw new Error('No captions available');

  const tracks: CaptionTrack[] = JSON.parse(match[1]);
  const enTrack = tracks.find(t => t.languageCode === 'en') ?? tracks[0];

  const xmlResp = await fetch(enTrack.baseUrl);
  const xml = await xmlResp.text();
  return parseTranscriptXml(xml);
}
```

The transcript XML contains `<text start="..." dur="...">` elements. The extension parses these into timestamped lines and passes them to the summarizer.

## Summarization via Claude

The Vercel proxy receives the transcript and calls the Anthropic API:

```typescript
// api/summarize.ts (Vercel)
export default async function handler(req: Request) {
  const { transcript, videoTitle } = await req.json();

  const prompt = `
You are a study assistant. Given the following transcript from a YouTube lecture titled "${videoTitle}", extract:
1. A 3–5 sentence summary
2. 8–12 key concepts as flashcard Q&A pairs
3. 5 important timestamps with what happens at each

Transcript:
${transcript.slice(0, 12000)} // Truncate to fit context window

Respond in JSON format: { summary, flashcards: [{front, back}], timestamps: [{sec, label}] }
  `;

  const response = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 1024,
    messages: [{ role: 'user', content: prompt }],
  });

  return Response.json(JSON.parse(response.content[0].text));
}
```

Using `claude-haiku-4-5-20251001` keeps latency and cost low for this use case — the summaries don't need deep reasoning, just reliable extraction.

## Timestamp Navigation

The side panel displays the extracted timestamps as clickable links. Clicking a timestamp sends a message to the content script, which sets `video.currentTime`:

```typescript
// content.ts
chrome.runtime.onMessage.addListener((msg) => {
  if (msg.type === 'JUMP_TO_TIMESTAMP' && typeof msg.sec === 'number') {
    const video = document.querySelector('video');
    if (video) video.currentTime = msg.sec;
  }
});

// sidepanel/App.tsx
const jumpToTimestamp = (sec: number) => {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    const tabId = tabs[0]?.id;
    if (tabId) chrome.tabs.sendMessage(tabId, { type: 'JUMP_TO_TIMESTAMP', sec });
  });
};
```

Note: this avoids `chrome.scripting.executeScript`, which requires the `scripting` permission. Messaging the content script instead only needs `tabs`, which the extension already uses to read the current video URL.

## Anki Export

Anki's import format is straightforward — a tab-separated text file with Front and Back columns:

```typescript
function exportToAnki(flashcards: Flashcard[]): void {
  const lines = flashcards.map(fc =>
    `${fc.front.replace(/\t/g, ' ')}\t${fc.back.replace(/\t/g, ' ')}`
  );
  const blob = new Blob([lines.join('\n')], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);

  chrome.downloads.download({
    url,
    filename: `lectureloop-export-${Date.now()}.txt`,
  });
}
```

The user imports this file into Anki via File → Import. The extension doesn't need Anki installed or any Anki API access.

## Freemium Limits

Free tier: 3 videos per month. Pro: unlimited. The limit is enforced client-side via `chrome.storage.local` with a monthly reset counter — the Vercel proxy also enforces it via the ExtPay token attached to each request.

[Install LectureLoop from Chrome Web Store →](https://chromewebstore.google.com/detail/dkfjdnchkngbkeocblinimimiddfnkbg)
