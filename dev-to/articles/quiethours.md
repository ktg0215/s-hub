---
title: "Building a Local-Only Focus Time Protector for Google Calendar"
published: false
publish_date: "2026-05-16"
tags: ["chrome","javascript","webdev","productivity"]
devto_id: "3527737"
---

Clockwise shut down its free plan. Most focus-time tools for Google Calendar require OAuth access and sync your calendar to their servers. I wanted something simpler: define quiet hours locally, and have the extension visually mark those blocks on my calendar — no cloud, no account, no data leaving my browser.

That's [Quiethours](https://chromewebstore.google.com/detail/okdmecodmihlgbkeacmebdikolofccfa). Here's how it works technically.

## Architecture: Pure DOM Overlay

The extension doesn't use the Google Calendar API. It doesn't need OAuth. It just injects a content script on `calendar.google.com` and overlays colored blocks on the existing calendar grid.

The approach: find the time-slot cells in the calendar DOM, identify which ones fall within the user's quiet hours, and inject a semi-transparent overlay element.

```typescript
function injectQuietOverlays(rules: QuietRule[]) {
  const timeSlots = document.querySelectorAll('[data-time]');
  timeSlots.forEach(slot => {
    const timeAttr = slot.getAttribute('data-time'); // e.g. "10:00"
    if (!timeAttr) return;

    const [hours, minutes] = timeAttr.split(':').map(Number);
    const totalMinutes = hours * 60 + minutes;

    for (const rule of rules) {
      if (isWithinRule(totalMinutes, rule)) {
        applyOverlay(slot as HTMLElement, rule);
        break;
      }
    }
  });
}
```

## Rule Configuration

Each rule specifies the days and time range:

```typescript
interface QuietRule {
  id: string;
  label: string;       // e.g. "Deep Work"
  startTime: string;   // "09:00"
  endTime: string;     // "12:00"
  days: number[];      // [1,2,3,4,5] = Mon–Fri
  color: string;       // hex color for the overlay
}
```

Rules are stored in `chrome.storage.local`. The freemium limit is 1 rule for free.

## Reacting to Calendar View Changes

Google Calendar has multiple views: day, week, month, schedule. Each renders the time-slot grid differently. The extension uses a `MutationObserver` to detect when the main calendar content changes and re-runs the overlay injection:

```typescript
const calendarObserver = new MutationObserver(debounce(() => {
  clearOverlays();
  injectQuietOverlays(cachedRules);
}, 200));

calendarObserver.observe(
  document.querySelector('[data-view-id]') ?? document.body,
  { childList: true, subtree: true }
);
```

The `debounce` prevents thrashing — Calendar fires many DOM mutations during navigation animations.

## Notification Reminders via `chrome.alarms`

The extension uses `chrome.alarms` to fire a reminder notification 15 minutes before a quiet block starts. The Service Worker registers alarms when rules change:

```typescript
async function scheduleAlarms(rules: QuietRule[]) {
  await chrome.alarms.clearAll();

  const today = new Date().getDay(); // 0 = Sunday
  for (const rule of rules) {
    if (!rule.days.includes(today)) continue;

    const [h, m] = rule.startTime.split(':').map(Number);
    const alarmTime = new Date();
    alarmTime.setHours(h, m - 15, 0, 0);

    if (alarmTime > new Date()) {
      chrome.alarms.create(`quiethours_${rule.id}`, {
        when: alarmTime.getTime(),
      });
    }
  }
}
```

MV3 service workers don't stay alive, but `chrome.alarms` persists across SW restarts — the alarm fires the SW back into life when it's needed.

## Why No OAuth

The most common question I got during testing: "Why doesn't it sync with my actual calendar events?" The answer is intentional: the overlay approach means the extension works with whatever is displayed on screen, requires no permissions beyond `storage` and `alarms`, and doesn't need the `https://www.googleapis.com/auth/calendar` scope.

The tradeoff: if you have a real meeting during your quiet hours, the overlay appears over it. That's actually fine — you still know the block exists, and the meeting takes visual priority. The overlay is semi-transparent.

[Install Quiethours from Chrome Web Store →](https://chromewebstore.google.com/detail/okdmecodmihlgbkeacmebdikolofccfa)
