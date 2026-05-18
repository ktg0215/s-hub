---
title: "How to Avoid Chrome Web Store 'Red Nickel' Rejection: What I Found After Auditing 18 Extensions"
published: false
publish_date: "2026-05-18"
devto_id: null
tags: ["chrome","javascript","webdev","productivity"]
---

I got my Chrome extension rejected from the Chrome Web Store last week for a 4-letter word: "Free."

Not a permission issue. Not a CSP violation. Not a manifest field. Just the word "Free" sitting in a small badge on my listing image. The Chrome Web Store calls this a **Red Nickel** violation — their internal name for prohibited promotional language in extension listings.

I run 18 extensions on the store. After the rejection I ran an audit across all of them. **9 had image violations. 14 had description copy violations.** Combined, about 80% of my listings tripped at least one Red Nickel rule.

Here's the audit framework I built so this doesn't happen again, plus the categorization that came out of running it.

## What "Red Nickel" Actually Is

The public policy text from the Chrome Web Store Developer Program is short:

> Listings must not include promotional language or claims about your product, including but not limited to discount notifications, "free" promotions, ratings, awards, or rankings.

Words like "Free", "Best", "Top", "#1", "Award-winning" — even if they're factually true — are not allowed in listing copy, titles, or screenshot images.

"Red Nickel" itself appears to be the internal flag name reviewers use. It isn't in the public documentation. Most developers first hear about it when their extension gets rejected, which is exactly how I learned.

## The Two-Hour Audit

After the rejection I wanted to find every remaining violation before the next CWS submission deadline. The audit ran in two passes.

### Pass 1 — Image scanning (grep over HTML sources)

All my listing assets are rendered from HTML templates (`store-screenshots/html/*.html`) before being converted to PNG. That made it easy to grep:

```bash
grep -rniE '\b(free|best|top[ -]?rated|#\s*1|無料|最高)\b' \
  extensions/*/store-screenshots/html/
```

This caught 9 hits across small tiles (440×280) and marquee images (1400×560).

### Pass 2 — Description copy (CWS Webstore API)

Listing descriptions live on CWS, not in my repo, so I pulled them via the Chrome Web Store Webstore API for each item and ran the same regex.

14 hits, most of them a trailing "Free." or "Free forever." at the end of feature lists. Easy to miss when you write 18 of them at the same time.

## The Four Categories That Came Out of It

The hits clustered into four patterns. I'll walk through them in order of rejection risk.

### 1. Image badges (highest risk)

This is what got me rejected.

```html
<!-- The line that triggered the rejection -->
<span class="chip">Free</span>

<!-- What I replaced it with -->
<span class="chip">Instant preview</span>
```

Image text seems to be what reviewers (or automated scanners) check most aggressively. Promotional adjectives here are essentially auto-flagged. Replace them with a functional descriptor that says what the extension does, not how much it costs.

### 2. Description tail (the "Free." kiss of death)

```
NG: "Get SEO scores, find issues & export reports. Free forever."
OK: "Get SEO scores, find issues & export reports. Unlimited scans."
```

Lower review priority than images and currently still passing in many cases, but the policy is the policy. Fix on the next publish cycle so you don't get caught when CWS tightens enforcement.

### 3. UI mockup labels (gray zone)

If your screenshot mocks a real product UI (Google Flights, Gmail, etc.) and that UI happens to use the word "Best", you're playing a 60/40 game on whether the reviewer reads the context.

```html
<!-- Gray — the original Google Flights label -->
<div class="header">Best departing flights · JPN passport</div>

<!-- Safe side -->
<div class="header">Departing flights · JPN passport</div>
```

I went with the safe side everywhere. The fix takes 5 minutes; a surprise rejection costs 3-5 days of resubmission. Asymmetric trade — always take the cheap side.

### 4. Pricing tier names (these are OK)

```html
<div class="plan-name">Free</div>
<div class="plan-price">$0</div>
```

A pricing table where "Free" sits next to "$0" reads as a tier name, not a promotional claim. Freemium is explicitly allowed by CWS, and the convention is industry standard (Notion, Linear, dozens more). I left these alone, and they've continued to pass review.

## The Semantic Edge Case

One pattern I found that confused me: "distraction-free reading."

ZenRead and a few other reading-mode extensions in my portfolio use this. "Free" here is part of a compound adjective ("distraction-free" = "not interrupted by distractions"), not a price claim.

CWS has been letting these through. The judgment seems to be:

- If **"free" stands alone next to a product noun**, it's promotional → **NG**
- If **"free" is the second half of a compound that refers to a function or experience**, it's semantic → **OK**

I kept "distraction-free" intact in 2 listings. No issues so far.

## The Replacement Framework

The rule I distilled was simple: **replace price-attribute words with function-attribute words.**

| Promotional (NG) | Functional (OK) |
| --- | --- |
| Free / Free Forever | "No account" / "Instant" / "Local only" |
| Free to try / Free to use | "Start immediately" / "No sign-up" |
| Free Chrome Extension | "MV3 Chrome Extension" |
| Best / Top-rated | "Complete" / "Built-in" / drop entirely |

Functional descriptors are what CWS actively wants in listings. They're more specific (better for the user), they're more honest (better for trust), and they sidestep Red Nickel entirely. A genuine win/win.

## The Pre-Publish Gate

After the audit I built a small gate into my publishing workflow:

```typescript
const RED_NICKEL_PATTERNS: RegExp[] = [
  /\bfree\b/i,
  /\bbest\b/i,
  /\btop[\s-]?rated\b/i,
  /#\s*1\b/,
  /\b無料\b/,
  /\b最高\b/,
];

const SEMANTIC_ALLOWLIST = [
  /distraction-free/i,
  /hands-free/i,
  /lag-free/i,
];

export function scanRedNickel(text: string): RegExp[] {
  if (SEMANTIC_ALLOWLIST.some((p) => p.test(text))) return [];
  return RED_NICKEL_PATTERNS.filter((p) => p.test(text));
}
```

Before every CWS submission I run this over:

- the listing description
- the listing title
- alt text on each screenshot
- the HTML sources for screenshot templates
- locale `messages.json` files (multi-language listings)

If any pattern hits, and the context isn't a pricing tier name (`$0` adjacent) or a compound adjective, I fix it before the upload. Five minutes of automation that would have saved me a week of submission churn if I'd written it earlier.

## What's Your Trigger Word?

Curious what trips up other CWS publishers. **What words got your extension flagged?** Drop them in the comments — I'll add the ones I haven't seen to the gate above.

---

I've been documenting the marketing side of running 18 Chrome extensions at [dev-tools-hub.xyz](https://dev-tools-hub.xyz). The CWS SEO learnings have shipped more installs than any paid acquisition channel I've tried — and dodging Red Nickel is now lesson #1 in the pre-publish checklist.
