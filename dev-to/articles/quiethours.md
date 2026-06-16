---
title: "Auto-Block Focus Time in Google Calendar — Building a Schedule-Based Chrome Extension"
description: "Using chrome.alarms and MutationObserver to inject focus-time overlays on Google Calendar without OAuth or cloud sync."
tags: ["chromeextension","javascript","productivity","notifications"]
published: true
publish_date: "2026-06-16"
devto_id: "3527737"
---

Most focus-time tools for Google Calendar require OAuth access and sync your calendar data to their servers. Clockwise shut down its free tier. Reclaim is expensive. I wanted something simpler: define quiet hours locally, and have the extension visually block those times on my calendar — no cloud, no account, no data leaving my browser.

That's [Quiethours](https://chromewebstore.google.com/detail/okdmecodmihlgbkeacmebdikolofccfa). Here's how it works technically.

## Architecture: Pure DOM Overlay

Quiethours doesn't call the Google Calendar API. It injects a content script on `calendar.google.com` and paints colored overlay blocks directly onto the calendar grid.

Each focus rule stores:

```typescript
interface FocusRule {
  id: string;
  dayOfWeek: DayOfWeek[];  // [1,2,3,4,5] = Mon–Fri
  startTime: string;        // 'HH:MM' 24h
  endTime: string;
  label: string;
  color: string;            // hex overlay color
  enabled: boolean;
}
```

Rules live in `chrome.storage.local`. No server, no OAuth, no calendar scope.

## Injecting Overlays on the Calendar Grid

Google Calendar renders a time-slot grid for the day and week views. The content script queries the grid container and injects `<div>` overlay elements positioned to span the correct time range.

The tricky part is finding the right container across Google Calendar's different views (day, week, month, schedule). I poll for the container with `setInterval` until it appears — Google Calendar hydrates the DOM asynchronously after navigation:

```typescript
const waitForCalendar = setInterval(() => {
  const root =
    document.querySelector('[data-view-toggle]') ??
    document.querySelector('div[role="main"]');
  if (root) {
    clearInterval(waitForCalendar);
    observer.observe(root, { childList: true, subtree: false });
    injectOverlays();
  }
}, 500);
```

`subtree: false` here matters for performance — watching only the immediate children of the calendar root avoids triggering on every event card render inside the grid.

## Reacting to View Changes

Google Calendar is a SPA. When you navigate from week view to day view, the DOM swaps out without a page reload. The `MutationObserver` detects these changes and re-injects overlays:

```typescript
const observer = new MutationObserver(() => {
  removeOverlays();
  injectOverlays();
});
```

`removeOverlays()` clears all elements tagged with the extension's data attribute before re-injecting. This prevents duplicate overlays when the calendar re-renders existing time slots.

## `chrome.alarms` for Periodic Rule Checks

The background service worker runs a 1-minute recurring alarm to check whether a focus block is currently active:

```typescript
chrome.alarms.create(ALARM_NAME, { periodInMinutes: 1 });

chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name !== ALARM_NAME) return;
  const [rules, settings] = await Promise.all([getRules(), getSettings()]);
  const active = getActiveRule(rules);

  if (active && _prevActiveRuleId !== active.id) {
    // Focus block just started
    _prevActiveRuleId = active.id;
    if (settings.notificationsEnabled) {
      chrome.notifications.create({
        type: 'basic',
        iconUrl: chrome.runtime.getURL('icons/icon128.png'),
        title: `🌙 Focus time started`,
        message: `${active.label} — ${active.startTime} to ${active.endTime}`,
      });
    }
    await incrementUsageCount(); // for review-prompt threshold
  } else if (!active && _prevActiveRuleId) {
    // Focus block just ended
    _prevActiveRuleId = null;
  }
});
```

`_prevActiveRuleId` is an in-memory variable in the service worker. MV3 service workers can be killed and restarted at any time, so this variable resets on each SW startup. In practice this means the "just started" notification might re-fire after a SW restart if a focus block is already active — acceptable behavior for a 1-minute alarm loop.

## Why No OAuth

The most common question: "Why doesn't it read my real calendar events?"

The overlay approach means:
- Zero permissions beyond `storage` and `alarms`
- No `https://www.googleapis.com/auth/calendar` scope required
- Works with any Google Calendar layout without needing API access

The tradeoff: if you have a real meeting during a focus block, the overlay appears over it. That's intentional — the block is semi-transparent so the meeting is still visible underneath.

## The 1-Minute Alarm and MV3 Lifecycle

MV3 service workers are terminated when idle. `chrome.alarms` is one of the few APIs that reliably wakes the SW back up when needed. The 1-minute granularity is fine for this use case — if a focus block starts at 9:00, the notification fires at 9:00 or 9:01 depending on when the alarm last ticked.

For exact-minute precision you'd need the service worker to stay alive or use a content script polling approach. For focus-time reminders, ±1 minute is acceptable.

---

[Install Quiethours from Chrome Web Store →](https://chromewebstore.google.com/detail/okdmecodmihlgbkeacmebdikolofccfa)
