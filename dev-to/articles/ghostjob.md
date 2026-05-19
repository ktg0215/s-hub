---
title: "Ghost Jobs Are Wasting Your Time — I Built a Chrome Extension to Detect Them"
description: "How I detect fake job listings using posting age, description vagueness, and duplicate signals in a Chrome MV3 extension. No API keys needed."
tags: ["chromeextension","javascript","career","buildinpublic"]
published: true
publish_date: "2026-05-19"
canonical_url: ""
devto_id: "3550213"
---

A ghost job is a job listing that exists but isn't actively hiring. The company posted it months ago, probably isn't reviewing applications, and might not even have a live opening. Estimates put ghost job listings at anywhere from 20% to 40% of what you see on LinkedIn and Indeed on any given day.

The problem is that they look identical to real listings. You can't tell from the title, the company name, or the description. You only figure it out after sending a tailored resume into a void.

I built GhostJob to surface the signal that's already in the listing — you just have to look.

---

## What actually signals a ghost job

Before writing a single line of detection logic, I spent time thinking about what distinguishes a ghost job from a real one given only the information visible on the listing card.

Three signals turned out to be the most reliable:

**1. Posting age.** This is the strongest signal. A job posted 90+ days ago that hasn't been taken down is almost certainly either abandoned or evergreen (always hiring, always up). Both are forms of ghost job from the applicant's perspective. Real, time-sensitive openings get filled or closed.

**2. Description vagueness.** Ghost jobs are often templated or copied from old postings. They tend to be short, generic, and missing specific technical requirements. "Strong communication skills and attention to detail" isn't describing a real open role — it's describing every job posting from 2012.

**3. Duplicate postings.** Some companies maintain permanent listings for roles they hire for occasionally or not at all. If a company has five "Senior Product Manager" postings across different locations that all use identical copy, none of them may be real.

---

## The scoring model

I implemented a simple additive score from 0 to 100:

```typescript
function daysScore(daysSincePosted: number): number {
  if (daysSincePosted >= 90) return 60;
  if (daysSincePosted >= 60) return 40;
  if (daysSincePosted >= 30) return 20;
  if (daysSincePosted >= 14) return 10;
  return 0;
}

function vaguenessScore(descriptionLength: number, hasSpecificRequirements: boolean): number {
  let score = 0;
  if (descriptionLength < 200) score += 15;
  else if (descriptionLength < 400) score += 8;
  if (!hasSpecificRequirements) score += 10;
  return score;
}
```

"Specific requirements" means the description mentions a concrete technology, skill level, or credential — React, Python, "3+ years of experience", a certification. Generic descriptions add points; specific ones don't.

The output maps to three tiers: 0–30 is **Likely Real**, 31–60 is **Caution**, 61+ is **Likely Ghost**. I deliberately avoid calling anything definitively a ghost job — the user is making the final call, and false positives have a real cost.

---

## Parsing dates from three different sites

LinkedIn, Indeed, and Glassdoor each have their own date formats and DOM structures. The content script handles each site separately, but they all route through the same date parser:

```typescript
export function parseDaysAgo(dateText: string): number {
  const text = dateText.toLowerCase().trim();
  if (/today|just posted|now/.test(text)) return 0;
  const dayMatch = text.match(/(\d+)\s*day/);
  if (dayMatch) return parseInt(dayMatch[1], 10);
  const weekMatch = text.match(/(\d+)\s*week/);
  if (weekMatch) return parseInt(weekMatch[1], 10) * 7;
  const monthMatch = text.match(/(\d+)\s*month/);
  if (monthMatch) return parseInt(monthMatch[1], 10) * 30;
  if (/30\+/.test(text)) return 35;
  return 0;
}
```

Indeed shows "30+ days ago" — a deliberately vague label that hides just how old a listing is. The `30+` match handles that case specifically, mapping it to 35 days.

---

## The SPA problem

LinkedIn and Indeed are single-page applications. They load job cards dynamically as you scroll or filter results. A content script that only runs on `document.ready` would miss everything loaded after the initial render.

The fix is a `MutationObserver` that re-runs the scan whenever the DOM changes:

```typescript
activeObserver = new MutationObserver(() => {
  scanAndInject();
});
activeObserver.observe(document.body, { childList: true, subtree: true });

// Clean up on SPA navigation
window.addEventListener('pagehide', () => activeObserver?.disconnect(), { once: true });
```

A `processing` flag prevents concurrent scans from piling up. Each scored card gets `data-ghostjob-scored="true"` so re-scans skip already-processed cards efficiently.

---

## Injecting badges without breaking the page

The score badge injects as a plain `div` using `insertAdjacentElement('afterend', target)` right after the job title. Inline styles instead of injected CSS to avoid specificity battles with each site's stylesheet:

```typescript
badge.style.cssText = `
  display: inline-flex; align-items: center; gap: 5px;
  padding: 3px 8px; border-radius: 4px;
  background: ${bg}; border: 1px solid ${color}40;
  font-size: 11px; font-weight: 600; color: ${color};
`;
badge.innerHTML = `👻 <span>${label}</span><span style="opacity:0.6"> · ${score}</span>`;
badge.title = `GhostJob Score: ${score}/100`;
```

The three-tier color system (green/amber/red) makes the signal legible at a glance without requiring the user to read a number.

---

## What the extension is

GhostJob adds a score badge to every job listing on LinkedIn, Indeed, and Glassdoor. Free plan: 20 checks per day. Pro removes the limit and adds a history view.

Available on the Chrome Web Store: https://chromewebstore.google.com/detail/mdjchaohgneaiflafheajamfomeccach

If you're actively job searching, install it and tell me which signals you think are missing from the scoring model — the current weights are a starting point, not a final answer.

---

*More Chrome extension builds at [dev-tools-hub.xyz](https://dev-tools-hub.xyz).*
