---
title: "I Launched on Product Hunt, Got Zero Votes, and Did It Again Seven Weeks Later"
description: "What actually changes when you turn a 0-vote PH launch into a proper do-over: onboarding, i18n, stability, and why I didn't change the price."
tags: ["indiehacking","producthunt","chromeextension","buildinpublic"]
published: false
publish_date: "2026-04-29"
canonical_url: ""
devto_id: "3550219"
---

I launched Procshot on Product Hunt on a Friday. March 6th. It got zero votes.

Not "a few votes and then stalled." Zero. The product sat on the new submissions page for about three hours and then disappeared. No comments except the one I left as the maker. I closed my laptop and went for a walk.

I took it personally for about a day. Then I treated it as data.

---

## What I didn't do

I didn't change the price. I didn't run a rebrand. I didn't move on to the next idea.

Procshot is a Chrome extension that records your browser workflow and auto-generates a step-by-step guide — screenshots, descriptions, export to PDF/Markdown/HTML. The core idea was sound. The execution in March was not.

The 0-vote result was telling me something specific: the product was rough in ways that would have made anyone who clicked "install" bounce off within two minutes. That's fixable. So I fixed it.

---

## What actually changed in seven weeks

**1. Onboarding rebuilt from scratch.**

The original Procshot dropped you into an empty popup. No guidance, no example, no indication of what to do first. I shipped a first-run walkthrough, a sample "your first guide" template, and contextual hints on every button. "Where do I start?" is no longer a question anyone has to ask.

**2. Eight languages.**

EN, JA, KO, ES, FR, DE, ZH, PT-BR. Scribe and Tango — the main alternatives — are English-first with uneven localization elsewhere. I wanted every step description Procshot generates to read naturally in the language of the person using it, not just the person who installed it. The PDF export has embedded CJK fonts, so Japanese guides don't render as □□□.

**3. Two months of stability work.**

I added GA4 error instrumentation on every layer — service worker crashes, UI errors, failed fetches. Then I watched what broke for 100+ real users and fixed it, version after version. v0.3.x is stable in a way v0.1.x was not.

**4. 100% local, and that actually matters.**

This was true from day one, but I undersold it in March. Procshot captures everything on-device. Nothing gets uploaded. No account required. Scribe and Tango both require sending your workflow to their servers — which is a real problem when you're documenting internal tools, admin dashboards, or anything with sensitive data. That's most things worth documenting.

I didn't change the price because I didn't need to. $9/month is fair for what the tool does now. I just needed the tool to actually do it well.

---

## Today is attempt #2

Procshot is live on Product Hunt again today. Same maker. Better product.

I'm not going to ask for upvotes. I tried that approach in March; it felt bad and didn't work. If Procshot solves a problem you have, that's the only reason to vote or install. If it doesn't, honest feedback is more useful than a sympathy click.

What I'm genuinely asking for: try it. If something breaks, or if the onboarding is still confusing, or if there's a site where the recording doesn't work — tell me. That feedback is what turned a 0-vote launch into something worth relaunching.

---

🔗 **Product Hunt**: [Procshot on PH today](https://www.producthunt.com/products/procshot-2?launch=procshot-2)

🔗 **Chrome Web Store**: [Install Procshot](https://chromewebstore.google.com/detail/ieblehdloggcpmkncplccjofeoakhkll)

Free tier: 5 guides/month, HTML + Markdown export. Pro ($9/mo): unlimited guides, PDF export, screenshot annotations.
