---
title: "I Built a Focus Extension with Breathing Exercises Instead of Hard Blocks"
published: true
publish_date: "2026-04-28"
devto_id: "3482018"
tags: ["chrome","javascript","webdev","productivity"]
---

Most site-blocker extensions work the same way: add a domain to a list, and visiting that domain shows a wall. A lock. Maybe a counter of how many minutes you've "wasted" today.

I've tried several of them. They work for about a week. Then I either whitelist everything out of frustration, or I just open a different browser.

The problem isn't the blocking — it's the abruptness. You're in a distracted state, you instinctively open Twitter, and you hit a wall. The wall creates friction, but it also creates resentment. You end up arguing with a piece of software about whether you're allowed to do something.

I built **FocusGuard** with a different approach: gentle intervention with a breathing exercise instead of a hard block.

## The Core Interaction

When you visit a site on your block list during a focus session, FocusGuard doesn't show a wall. Instead it shows a 30-second breathing exercise overlay — a slow animated circle guiding you through one breath cycle.

After the breathing exercise, you get a choice: Go back (return to what you were doing), or Continue to the site anyway (the block lifts for this visit).

The breathing exercise does a few things:

1. It interrupts the automatic behavior. Opening a distracting site is often reflexive — you do it before you've decided to. The pause creates a decision point.

2. It activates the parasympathetic nervous system. Box breathing (4-4-4-4 seconds) reduces cortisol and increases prefrontal cortex activity — the part of the brain that handles deliberate decision-making.

3. It doesn't create resentment. You can always choose to continue. The extension isn't judging you; it's just adding friction and giving you a moment.

In my own testing, I go back to work about 70% of the time after the exercise. The other 30% of the time I still visit the site, but intentionally rather than reflexively.

## Architecture

FocusGuard uses a content script to inject the overlay, a background service worker for session management, and a popup for configuration.

```
FocusGuard/
├── src/
│   ├── content/
│   │   ├── index.ts       # Intercepts navigation, injects overlay
│   │   └── overlay.tsx    # Breathing exercise React component
│   ├── background/
│   │   └── index.ts       # Session timer, blocklist management
│   └── popup/
│       └── App.tsx        # Settings UI
```

### The Overlay Injection

The content script checks the current URL against the block list when the page loads. If there's a match and a focus session is active:

```typescript
async function checkAndMaybeBlock(): Promise<void> {
  const settings = await loadSettings();
  const session = await getActiveSession();

  if (!session?.isActive) return;
  if (!isBlocked(window.location.href, settings.blocklist)) return;

  // Show breathing overlay — suspends page rendering
  document.documentElement.style.overflow = 'hidden';
  const root = document.createElement('div');
  root.id = 'focusguard-overlay';
  document.body.prepend(root);

  ReactDOM.createRoot(root).render(
    <BreathingOverlay
      onContinue={() => {
        root.remove();
        document.documentElement.style.overflow = '';
      }}
      onGoBack={() => history.back()}
    />
  );
}
```

The `document.documentElement.style.overflow = 'hidden'` prevents the page from being visible or interactive behind the overlay.

### The Breathing Animation

The breathing circle is a pure CSS animation driven by React state:

```typescript
type Phase = 'inhale' | 'hold-in' | 'exhale' | 'hold-out';

const CYCLE: { phase: Phase; duration: number; label: string }[] = [
  { phase: 'inhale',   duration: 4000, label: 'Breathe in'  },
  { phase: 'hold-in',  duration: 4000, label: 'Hold'        },
  { phase: 'exhale',   duration: 4000, label: 'Breathe out' },
  { phase: 'hold-out', duration: 4000, label: 'Hold'        },
];

function BreathingCircle({ phase }: { phase: Phase }) {
  return (
    <div
      className={`breathing-circle ${phase}`}
      style={{
        transition: `transform ${CYCLE.find(c => c.phase === phase)?.duration}ms ease-in-out`,
        transform: phase === 'inhale' || phase === 'hold-in'
          ? 'scale(1.5)'
          : 'scale(1)',
      }}
    />
  );
}
```

One full cycle is 16 seconds. After two cycles (32 seconds), the choice buttons appear.

### Focus Sessions

Sessions are managed in the background service worker with `chrome.alarms` for the timer:

```typescript
async function startSession(durationMinutes: number): Promise<void> {
  await chrome.storage.local.set({
    session: {
      isActive: true,
      startedAt: Date.now(),
      endsAt: Date.now() + durationMinutes * 60 * 1000,
    },
  });

  await chrome.alarms.create('session-end', {
    delayInMinutes: durationMinutes,
  });
}

chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === 'session-end') {
    await chrome.storage.local.set({
      session: { isActive: false, startedAt: null, endsAt: null },
    });
    // Notify user
    await chrome.notifications.create({
      type: 'basic',
      title: 'Focus session complete',
      message: 'Great work. Take a break.',
      iconUrl: 'icons/icon128.png',
    });
  }
});
```

`chrome.alarms` is the correct API for timers in service workers — `setTimeout` doesn't survive service worker suspension.

## What I Learned

The gentle intervention model is less satisfying to build than a hard blocker. Hard blockers feel powerful. Breathing exercises feel soft.

But the goal isn't to feel powerful. The goal is to actually work. The gentle approach survives long enough to become a habit, which is what matters.

FocusGuard is on the Chrome Web Store: https://chromewebstore.google.com/detail/flckiddekikkjfhgleabigdpjijpcaln

---

*Built with Vite + React + TypeScript. Content script injection with React overlay.*
