---
title: "I Built a Chrome Extension That Automatically Silences Distractions During Focus Hours — Quiethours"
published: false
publish_date: "2026-05-15"
devto_id: ""
tags: ["chrome", "javascript", "webdev", "productivity"]
---

Deep work is expensive to enter and cheap to destroy. One notification sound at the wrong moment can cost you 20 minutes of recovery time.

I already use Google Calendar to block focus time on my schedule — but Chrome keeps firing alerts from Slack, Gmail, and news sites regardless. The fix should be automatic: if I'm in a "Focus" block, silence everything.

So I built **Quiethours**.

## What It Does

Quiethours is a Chrome extension that syncs with your Google Calendar focus events and automatically:

- **Blocks distracting sites** during your focus windows
- **Mutes browser notifications** for the duration of your scheduled blocks
- **Shows the active focus rule** in the popup so you always know your current status

You register rules once (day of week, start/end time, which sites to block), and the extension handles the rest. No manual toggling.

## Technical Implementation

Built with **WXT + React + TypeScript** — WXT is a Chrome Extension build framework with first-class MV3 support, TypeScript out of the box, and HMR during development.

**Rule evaluation runs in the Service Worker** via `chrome.alarms`, checking every minute:

```typescript
export function getActiveRule(rules: FocusRule[]): FocusRule | null {
  const now = new Date();
  const day = now.getDay();
  const hhmm = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  return rules.find(r =>
    r.enabled &&
    r.dayOfWeek.includes(day) &&
    hhmm >= r.startTime &&
    hhmm < r.endTime
  ) ?? null;
}
```

String comparison on `HH:MM` avoids timezone edge cases that often trip up time-range logic.

**The permissions footprint is minimal:**

```json
"permissions": ["storage", "alarms", "notifications"],
"host_permissions": ["https://calendar.google.com/*"]
```

No broad `<all_urls>` permission — the extension only touches your Calendar page and the sites you explicitly add to the block list.

**Theme and language are persisted in `chrome.storage.local`** and applied immediately on popup mount:

```typescript
const [r, s, user] = await Promise.all([
  getRules(),
  getSettings(),
  extpay.getUser().catch(() => ({ paid: false })),
]);
applyTheme(s.theme ?? 'dark', document.documentElement);
setLang(detectLang());
```

## Free vs. Pro Tiers

| Feature | Free | Pro ($5/mo) |
|---------|------|-------------|
| Focus rules | 1 | Unlimited |
| Blocked sites | 10 | Unlimited |
| Weekly focus stats | — | ✓ |

Monetization is handled by **ExtensionPay** — a payment layer built for Chrome Extensions that lets users pay without leaving the browser. Checking paid status is a single async call:

```typescript
const user = await extpay.getUser();
const isPro = user.paid ?? false;
```

## What I Learned

The hardest part wasn't the technical implementation — it was deciding the Free tier limit. Too restrictive and users don't get value. Too generous and no one upgrades.

One rule + ten blocked sites turned out to be the right balance: it's genuinely useful for someone with a single daily focus block, but clearly limiting for anyone doing structured deep work across multiple projects.

---

**Chrome Web Store:** https://chromewebstore.google.com/detail/okdmecodmihlgbkeacmebdikolofccfa

If you spend any part of your day trying to do focused work, give it a try — and let me know what features you'd want next.
