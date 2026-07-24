---
title: "I built a free, local step-by-step guide maker — the screenshots were the easy part"
published: true
tags: ["chromeextension","webdev","productivity","buildinpublic"]
series: null
canonical_url: "https://dev-tools-hub.xyz/extensions/procshot"
description: "A free, local Scribe/Tango alternative. The hard part was keeping the recording alive when MV3 killed my service worker."
publish_date: "2026-07-23"
main_image: "https://dev-tools-hub.xyz/screenshots/procshot/screenshot-01.png"
devto_id: "4216396"
---
Writing "how to do X in our app" docs by hand is miserable. You do the steps, screenshot each one, crop them, paste them into a doc, annotate, repeat. Tools like Scribe and Tango solved this years ago — you click through a process and they generate the guide. Tango alone has 400k+ installs, so clearly people want this.

I wanted the same thing but with two constraints those tools don't give me: the guide should be generated **locally** (screenshots of internal tools shouldn't get uploaded to someone's cloud), and it should export to a plain **PDF** I own. So I built Procshot.

The screenshot-and-caption part was straightforward. The part that ate a week was keeping a multi-step recording alive.

## MV3 service workers die in the middle of your recording

A guide recording is inherently stateful: step 1, step 2, step 3… each click appends to a list you're building over time. My first version kept that list in a variable in the background service worker:

```js
// don't do this
let steps = [];
chrome.action.onClicked.addListener(() => { steps = []; /* start recording */ });
```

This works right up until the user pauses to actually *think* about the next step. In Manifest V3 the service worker is terminated after ~30 seconds of inactivity, and when it does, `steps` is gone. So a 12-step guide would randomly come out as a 4-step guide, and I couldn't reproduce it on demand — it depended on how long the user hovered between clicks.

The fix is the MV3 rule everyone learns the hard way: **never hold recording state in memory.** Every captured step gets written to `chrome.storage.local` immediately, and listeners are registered at the top level so a woken-up worker re-attaches them:

```js
chrome.runtime.onMessage.addListener((msg) => {
  if (msg.type !== 'STEP_CAPTURED') return;
  // append synchronously, don't trust the SW to still be alive next click
  chrome.storage.local.get('steps', ({ steps = [] }) => {
    steps.push(msg.step);
    chrome.storage.local.set({ steps });
  });
});
```

Same idea for the "am I currently recording?" flag — that lives in storage too, not a boolean in the worker. Once state moved out of memory, the dropped-step bug disappeared completely.

## The screenshot timing gotcha

The other thing that bit me: capturing the screenshot *on click* often grabbed the page mid-transition — a half-rendered modal, a spinner. I ended up debouncing capture slightly after the interaction and waiting for the DOM to settle, which made the guides look like a human took them instead of a robot with a fast trigger finger.

## Where it landed

Procshot records clicks, auto-captures and captions each step, and exports the whole thing to PDF — locally, no account, nothing uploaded. It's free. It's not trying to be a full video-SOP platform like the bigger tools; it's the "I need a clean numbered guide in two minutes" tool.

If you want to try it: https://chromewebstore.google.com/detail/ieblehdloggcpmkncplccjofeoakhkll

If you've built anything that records a session across multiple steps in MV3 — how did you handle the service worker dying mid-flow? Curious if there's a cleaner pattern than "write everything to storage on every event."
