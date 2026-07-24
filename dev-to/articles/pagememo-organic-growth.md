---
title: "A Chrome extension I never marketed grew 2.7x in two weeks — then I lost half of it"
published: true
tags: ["chromeextension","webdev","buildinpublic","seo"]
series: null
canonical_url: "https://dev-tools-hub.xyz/extensions/pagememo"
description: "PageMemo installs jumped 2.7x with zero marketing - then I lost half. What actually moved it, and why retention was the real bottleneck."
publish_date: "2026-07-23"
main_image: "https://dev-tools-hub.xyz/images/og-pagememo.png"
devto_id: "4216395"
---
I have a bad habit of judging an extension by how loud its launch was. PageMemo broke that habit. It's a small sticky-notes tool — you drop a note on any web page and it comes back when you return. I never ran ads for it, never posted about it, never did a launch. And over two weeks in April it grew 2.7x on installs anyway.

Then it gave most of that back. That second part turned out to be the more useful lesson, so I'll get to it.

## The spike was real, not a bot

First thing I checked, because I'd been burned before: was this a bot wave? On another extension I'd seen installs balloon ~6,000 that were almost entirely fake — they never fired a single usage event.

PageMemo was the opposite. In the same window (April 13–27, peaking April 20–25), monthly active users went up ~4.5x and popup opens ~10x. Installs and actual usage moved together. When people install for real, they open the thing. When a bot "installs," it never does. So this was real demand, not noise.

## What actually moved it (the honest version)

Here's where I have to be careful, because it's easy to invent a clean story after the fact.

I don't yet have the Chrome Web Store search-term data that would prove *which query* drove the installs — that export is still pending. What I do have is the timeline, and it lines up with exactly one thing.

On April 18, right before the spike started, I shipped a boring maintenance batch to PageMemo:

- New Chrome Web Store screenshots
- An ASO pass on the title and description
- Two new locales (Korean and Spanish) added to the listing

No launch. No thread. Just the listing itself getting less bad.

My working hypothesis — and I'm calling it a hypothesis, not a fact — is that the localization did most of the work. When you add locales, the Store re-indexes your listing under those languages, and you become discoverable to people who were never searching in English. That's the kind of growth that shows up as "organic" because there's no campaign attached to it. The screenshots and copy probably helped conversion once people landed, but discovery is what changes install *volume*, and localization is the lever that touches discovery.

If you take one thing from this: **your Store listing is a growth surface, not a formality.** An afternoon of screenshots and two locales outperformed every "launch" I've done.

## The part nobody frames as a win: I lost them

Now the uncomfortable number. By May, PageMemo's monthly actives fell from 161 back to 62.

I got the traffic and I didn't keep it.

That's a different problem from discovery, and it's the one I'd been ignoring. Sticky notes are a habit product — they only matter if you come back to the page and your note is still there, doing something for you. If the first session doesn't create a reason to return, a great listing just fills the top of a leaky bucket faster.

So the ASO win exposed the real gap. Acquisition was never the bottleneck once the listing was fixed. **Retention was.** And I'd spent months assuming it was the other way around.

## What I'm changing

- Treat the listing as a recurring lever, not a one-time setup. Localization especially — it's the cheapest discovery I've found.
- Wait for the Store search-term export before I write the "we grew because of keyword X" story. Timeline correlation is a hypothesis; the export is the proof. I'd rather say "I don't know yet" than make it up.
- Actually work on the first session. A note that reappears is only valuable if the first note felt worth taking. That's the retention fix, and it's next.

For the record, PageMemo is here if you want to poke at it: https://chromewebstore.google.com/detail/jmpmfbheoclfmceceihjpcjlabakkdde

If you've shipped something that grew from a listing change alone — did the users stick, or did you watch the same decay I did? I'm curious whether this is a sticky-notes problem or a me problem.
