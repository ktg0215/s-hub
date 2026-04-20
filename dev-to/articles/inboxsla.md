---
title: "I Built a Chrome Extension That Tracks Email Response SLAs So You Never Miss a Client Deadline — InboxSLA"
published: false
publish_date: "2026-05-21"
devto_id: ""
tags: ["chrome", "javascript", "webdev", "productivity"]
---

Freelancers and small agencies live and die by response time. A client expects a reply within 24 hours. Another one within 4. You agreed to these terms — but nothing in Gmail actually enforces them.

CRMs are overkill for solo operators. Reminder apps require manual setup for every thread. What I wanted was something that sits inside Gmail and silently watches for me.

So I built **InboxSLA**.

## What It Does

InboxSLA is a Chrome extension that monitors your Gmail inbox for reply deadlines. You register clients by domain (e.g., `acme.com`) and set an SLA window in hours. The extension then:

- **Detects incoming threads** from registered domains via a content script
- **Tracks elapsed time** since the last message you received
- **Flags threads as Approaching (orange) or Overdue (red)** in real time
- **Shows a dashboard** in the popup and side panel with all active threads and their status

No manual logging. No third-party data sync. Everything runs locally in your browser.

## Architecture

```
InboxSLA/
├── content.ts          # Gmail thread detection via MutationObserver
├── background.ts       # 5-minute alarm loop for SLA checks
├── popup/              # Client list + thread status dashboard
├── sidepanel/          # Expanded thread view while Gmail is open
└── lib/
    ├── storage.ts      # Client + TrackedThread persistence
    └── constants.ts    # FREE_LIMITS, SLA_APPROACHING_THRESHOLD_MS
```

**The content script** detects new emails by observing Gmail's DOM:

```typescript
const msg: TrackedThread = {
  id: threadId,
  from: senderEmail,
  subject: subjectText,
  receivedAt: Date.now(),
};
chrome.runtime.sendMessage({ type: 'THREAD_DETECTED', thread: msg });
```

**The background Service Worker** runs on a 5-minute alarm and checks every tracked thread against its client's SLA:

```typescript
function getSlaStatus(thread: TrackedThread, client: Client): 'overdue' | 'approaching' | 'ok' {
  const slaMs = client.slaHours * 60 * 60 * 1000;
  const remaining = slaMs - (Date.now() - thread.receivedAt);
  if (remaining <= 0) return 'overdue';
  if (remaining <= SLA_APPROACHING_THRESHOLD_MS) return 'approaching'; // 2 hours
  return 'ok';
}
```

The 2-hour approaching threshold gives you a heads-up before the actual deadline — so you can reply before the timer hits zero, not after.

**Domain-based client matching** keeps things simple: if the email domain matches a registered client, it's tracked. This handles the common case where one client sends from multiple addresses (`billing@acme.com`, `john@acme.com`) without requiring per-address setup.

## The Side Panel Integration

MV3's `chrome.sidePanel` API lets the extension display a persistent panel alongside Gmail. Since content scripts can't directly control the side panel, I routed everything through the background script as a message bus:

```
content.ts → background.ts → sidepanel
```

It adds a layer of indirection, but each component stays focused on a single responsibility. The side panel subscribes to storage changes and re-renders without needing to poll.

## Free vs. Pro Tiers

| Feature | Free | Pro ($6/mo) |
|---------|------|-------------|
| Clients | 3 | Unlimited |
| Alerts / month | 10 | Unlimited |
| Thread export | — | ✓ (CSV) |

Three clients is enough to validate whether the extension is useful for your workflow. Power users — agencies managing ten or more accounts — are the upgrade target.

Limits are defined in a single constants file:

```typescript
export const FREE_LIMITS = {
  maxClients: 3,
  maxAlertsPerMonth: 10,
} as const;
```

Importing from this constant everywhere means changing the free tier is a one-file edit.

## What I'd Do Differently

Gmail's DOM is brittle. Any update Google ships can break content script selectors. I've already had to patch selectors once. In v2, I'm planning to use Gmail's official Add-ons API for thread detection — more stable, but requires OAuth scope approval.

---

**Chrome Web Store:** https://chromewebstore.google.com/detail/fooenikjagbabhodgpohljldfbpggagi

If you manage client email and have ever missed a reply window, this is for you.
