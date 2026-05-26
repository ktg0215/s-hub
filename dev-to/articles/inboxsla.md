---
title: "I Applied SLA Concepts to My Email Inbox — Here's What I Learned Building the Chrome Extension"
description: "Tracking response time deadlines for emails in Gmail using Chrome MV3, DOM mutation observers, and a color-coded urgency system."
tags: ["chromeextension","javascript","productivity","gmail"]
published: true
publish_date: "2026-05-26"
devto_id: "3532590"
---

I used to work in B2B SaaS customer support where every incoming email had an SLA timer attached. Green meant you had time, orange meant it was getting close, red meant someone was already frustrated. The system was brutally effective at preventing things from slipping through.

Then I switched jobs and suddenly all those SLA tools were gone. Just an inbox full of emails, no urgency signals, no way to tell at a glance which thread had been waiting the longest.

So I built **InboxSLA** — a Chrome extension that brings response-time deadlines to Gmail.

## The Core Idea

You define clients by email domain and assign each one an SLA in hours. InboxSLA scans your inbox and injects colored badges onto thread rows:

- 🟢 **Green**: thread is within SLA (hours remaining shown)
- 🟠 **Orange**: approaching the deadline (configurable threshold, default 2h)
- 🔴 **Red "OVERDUE"**: the clock has run out

The SLA values are fully per-client. A freelancer might set 48h for long-term retainers. An agency handling fast-turnaround support might use 4h.

## The Hard Part: Gmail Is a SPA

Gmail doesn't reload the page when you navigate between labels or open threads. The DOM updates in place, which means `DOMContentLoaded` won't catch anything after the initial load.

The fix is `MutationObserver`, watching for list changes:

```typescript
const observer = new MutationObserver(() => {
  scheduleRefresh(); // debounced to 300ms
});
observer.observe(document.body, { childList: true, subtree: true });
```

The debounce matters a lot. Gmail makes constant small DOM changes while you type in the search box, hover over items, or auto-save a draft. Without throttling, the observer fires hundreds of times per second. I debounce to 300ms and skip re-scans if the thread list container hash hasn't changed.

## Extracting Email Metadata From an Obfuscated DOM

Gmail's CSS class names are auto-generated and change between A/B test variants. Rather than trusting class selectors alone, I use a multi-strategy fallback for sender extraction:

```typescript
const senderEl =
  row.querySelector('[email]') ??
  row.querySelector('.yW span[email]') ??
  row.querySelector('.bA4 span[email]') ??
  row.querySelector('[data-hovercard-id]');
```

The `[email]` attribute selector is the most stable — Google uses it internally across many Gmail builds. CSS fallbacks handle variants.

For timestamps, the `title` attribute on the time element is the most reliable source:

```typescript
const timeEl =
  row.querySelector('.xW.xY span[title]') ??
  row.querySelector('td.xW span[title]');
const title = timeEl?.getAttribute('title') ?? '';
const parsed = new Date(title).getTime();
```

Gmail formats this as a full date string ("Mon, Apr 21, 2026, 9:34 AM") in most views. If parsing fails, I fall back to `Date.now()` — conservative, assumes the thread just arrived. Getting this right across inbox view, All Mail, and search results required handling six different string formats.

## Badge Injection Without Breaking Gmail

Two failure modes to guard against when injecting elements into a live SPA you don't own:

**Duplicate badges**: Gmail sometimes re-renders list items without fully removing them from the DOM. I tag each badge with `data-inboxsla-badge` and check before injecting:

```typescript
const BADGE_ATTR = 'data-inboxsla-badge';
let badge = row.querySelector(`[${BADGE_ATTR}]`) as HTMLElement | null;
if (!badge) {
  badge = document.createElement('span');
  badge.setAttribute(BADGE_ATTR, '1');
  row.appendChild(badge);
}
// Update in-place regardless
badge.style.background = bg;
badge.textContent = text;
```

**Stale state**: When you open a thread and return to the list, elapsed time has changed. I re-compute badge state on each observer cycle and update `style.background` and `textContent` in-place rather than removing and re-injecting — keeps Gmail's own event listeners intact.

## MV3: Content Script ↔ Background Service Worker

Client configuration (which domains, which SLA hours) lives in `chrome.storage.local`. The content script requests it from the background service worker on load and caches locally:

```typescript
// Content script
const clients = await chrome.runtime.sendMessage({ type: 'GET_CLIENTS' });

// Background SW
chrome.runtime.onMessage.addListener((msg, _sender, respond) => {
  if (msg.type === 'GET_CLIENTS') {
    chrome.storage.local.get('clients').then(({ clients }) => {
      respond(clients ?? []);
    });
    return true; // signal async response
  }
});
```

The content script re-fetches only after a 5-minute cooldown, not on every mutation. Avoids hammering the background SW with round-trips during heavy DOM activity.

## What I'd Do Differently

Gmail's DOM is the main operational risk. Any update Google ships can break selectors. I've already patched once. Long-term, the Gmail Add-ons API would be more stable for thread detection — but it requires OAuth scope approval and a server-side component, which felt like overkill for an MVP.

For now: integration tests against a saved snapshot of Gmail's HTML catch selector regressions before each release.

---

**Chrome Web Store:** https://chromewebstore.google.com/detail/inboxsla/fooenikjagbabhodgpohljldfbpggagi

If you manage client email and have ever let a thread sit longer than you meant to, this is for you.
