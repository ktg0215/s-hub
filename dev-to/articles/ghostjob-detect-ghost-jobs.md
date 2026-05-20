---
title: "How to detect ghost jobs in 2026 — a developer's guide"
published: false
publish_date: "2026-05-20"
devto_id: null
tags: ["webdev","chrome","javascript","career"]
description: "Nearly 4 in 10 hiring managers admit posting jobs with no plan to fill them. Here are the four signals I use to detect ghost jobs from a Chrome extension — with code."
---

I got tired of applying to LinkedIn postings that had been "active 4 days ago" for three months straight. Turns out I wasn't paranoid — the data backs it up. So I built a Chrome extension to flag them, and along the way I worked out how to detect a "ghost job" from inside the browser without hitting any external API. Sharing the playbook here.

## The numbers (so you know this isn't rare)

- **Nearly 4 in 10** hiring managers admit their company has posted jobs with no real plan to fill — Resume Builder 2024 hiring-manager survey, widely reported by WSJ, NYT, and BBC throughout 2024–2025
- **18%** of recruiters say they're actively doing it right now (same survey)
- **40%** of job seekers cite ghost-job frustration as a top complaint (Indeed 2025 candidate sentiment data)
- Why it happens: market research, résumé pipeline collection, ATS auto-reposts of already-filled roles, recruiters who quit without removing their open reqs

If you apply to 50 jobs a week and ~40% are ghosts, you're spending around 20 cover letters worth of effort on postings that were never going to convert. At ~12 minutes per tailored application, that's about four hours of your week — every week — burned. Annualized, you're losing two-and-a-half working weeks per year to listings that don't exist.

This is a tractable problem from inside the browser. Here's how.

## What "ghost job" actually means

It's not just "a job that didn't reply to me." That's regular job-search reality. A ghost job specifically means one of these:

1. The role isn't open — posted to pipeline candidates, signal investors the company is growing, or placate an internal stakeholder
2. The role *was* open and is now filled, but the posting is still up
3. The role exists but the hiring manager isn't actively reviewing — auto-rejects only

A good detector doesn't try to read minds. It looks at *artifacts of these behaviors* that show up in the DOM.

## The four signals I use

### Signal 1: Posting age

Resume Builder's data puts the median real posting at ~30 days before it's either filled or pulled. Postings still active past 60 days are statistically much more likely to be ghosts.

LinkedIn obfuscates this — it'll show "Posted 4 days ago" even when the underlying post ID has been alive for months. The trick is to parse the `<time>` element's `datetime` attribute, not the relative human-readable text.

```javascript
function getPostingAgeDays(node) {
  const timeEl = node.querySelector('time[datetime]');
  if (!timeEl) return null;
  const posted = new Date(timeEl.getAttribute('datetime'));
  return Math.floor((Date.now() - posted.getTime()) / (1000 * 60 * 60 * 24));
}
```

If the relative text says "Posted today" but the `datetime` attribute reads four months ago, that's your first red flag. In my scoring, weight scales linearly past 30 days and hits 2x at 60.

### Signal 2: Repost frequency (Levenshtein distance)

Clever recruiters know about the age signal. So they delete a stale posting and re-create it with a new job ID — same description, slightly tweaked title. The relative timestamp resets, the listing looks fresh, and the candidate pool starts over.

You can't catch this with job IDs alone. You need content similarity.

```javascript
import levenshtein from 'fast-levenshtein';

function isLikelyRepost(currentDescription, historicalDescriptions) {
  for (const past of historicalDescriptions) {
    const distance = levenshtein.get(currentDescription, past);
    const ratio = distance / Math.max(currentDescription.length, past.length);
    if (ratio < 0.05) return true; // <5% character difference = same posting
  }
  return false;
}
```

Threshold matters. I went with `< 5%` after testing on ~30 known ghost reposts I'd manually catalogued. `<10%` gave too many false positives (postings that legitimately got minor edits). `<2%` missed reposts where the recruiter changed only the location header.

Storage strategy: I keep the last 90 days of descriptions per company in `chrome.storage.local` with an LRU cap at 1,000 entries. The 10MB quota is plenty for that.

### Signal 3: Hidden salary in disclosure-mandatory states

Since 2023, seven US states require salary-range disclosure for any role that could be performed in that state: **CA, CO, NY, NJ, WA, MD, RI**. (NYC has its own version, and it technically covers any job that could be performed remotely from NYC — which is most knowledge work.)

If a US-targeted posting has no salary range *and* the company has any operations in those states, that's a real signal. Either:

- They're non-compliant (rare for large companies that have legal teams)
- The role is targeted at non-covered states only (specific intent — worth checking)
- The posting predates the law (which loops back to signal 1)

```javascript
const DISCLOSURE_STATES = ['CA', 'CO', 'NY', 'NJ', 'WA', 'MD', 'RI'];

function flagMissingSalary(posting) {
  const hasSalary = /\$\d{2,3},?\d{3}/.test(posting.description);
  const inDisclosureState = DISCLOSURE_STATES.some(s =>
    posting.locationHeader.includes(s)
  );
  return inDisclosureState && !hasSalary;
}
```

### Signal 4: Company-level repost rate

If a company has posted 30 roles in the last 6 months and 18 of them have shown age + repost signals, your prior on the *next* role from that company should be high. This is just Bayesian sanity.

I track this per company in extension storage. After ~10 postings observed per company, the company-level ghost rate becomes a meaningful weight in the score. Below 10 observations, I don't use it — too few samples to be anything but noise.

## Putting it together

Final score is a weighted blend, capped at 100:

```javascript
function ghostScore(posting, history) {
  let score = 0;
  if (posting.ageDays > 60) score += 35;
  else if (posting.ageDays > 30) score += 15;

  if (isLikelyRepost(posting.description, history.descriptions)) score += 25;
  if (flagMissingSalary(posting)) score += 15;
  if (history.companyGhostRate > 0.5) score += 20;
  if (/easy apply/i.test(posting.applyType)) score += 5; // weak signal

  return Math.min(100, score);
}
```

Bucket the score:

- **0–30**: Likely Real (green)
- **31–60**: Caution (yellow)
- **61–100**: Likely Ghost (red)

These thresholds are arbitrary. I picked them by hand-labelling ~200 postings and tuning until precision on the red bucket sat around 80%. There's no ground truth here — only your tolerance for false positives.

## Architecture: MV3, no servers

I wanted this to be 100% client-side. No data leaves the browser, no backend to run, no privacy policy to defend.

```
content script  →  reads DOM on indeed.com / linkedin.com/jobs / glassdoor.com
       ↓
background SW   →  maintains posting history + company stats in chrome.storage.local
       ↓
popup           →  reads the current job's score and shows the breakdown
```

The trap I fell into: MV3 service workers go dormant after ~30s of idle. If you're keeping any state in module-level globals, it's gone next time the SW wakes up. Everything has to live in `chrome.storage.local`. I burned half a day on this — the symptom was scores resetting to "no history" between sessions even though I was clearly calling the store function.

The fix:

```javascript
// Bad — gone when SW goes dormant
const history = new Map();

// Good — survives dormancy
chrome.storage.local.get(['history'], ({ history = {} }) => {
  // mutate, then write back
  history[companyId] = updated;
  chrome.storage.local.set({ history });
});
```

Related gotcha: register your event listeners at the **top level synchronously**. The MV2 "register inside an init callback" pattern silently breaks on MV3 — your listener won't be re-bound when the SW wakes from dormancy, and you'll spend an afternoon wondering why the alarm fires once and never again.

## What I'd do differently

1. **Started with two job boards, not three.** Maintaining DOM parsers for Indeed, LinkedIn, and Glassdoor is brutal — they each change their layout every 6–8 weeks. If I were starting over I'd ship LinkedIn-only and let user demand drive the second board.

2. **Built the company-level signal first.** Per-posting heuristics get noisy. The company-level prior is the thing that actually moves the score meaningfully on repeat offenders — and it's also the signal that gets stronger the longer a user has the extension installed. That's the right kind of moat.

3. **Skipped Levenshtein initially.** Useful but expensive — I underestimated how often I'd hit `chrome.storage.local` on a single page render. For ~1,000-entry history it's fine; if you push past that you'll want a cheap hash-based similarity pre-filter (e.g., shingling) before paying for full Levenshtein.

## The product

I shipped this as **GhostJob** on the Chrome Web Store:

→ [https://chromewebstore.google.com/detail/ghostjob/mdjchaohgneaiflafheajamfomeccach](https://chromewebstore.google.com/detail/ghostjob/mdjchaohgneaiflafheajamfomeccach)

Free for 10 scans/day, with the full score breakdown and recent-checks history. Pro is $6/month or $59 lifetime — unlimited checks, salary insights backed by the public US Bureau of Labor Statistics API, and priority support. Currently scores Indeed, LinkedIn, and Glassdoor postings. English UI is shipping next week (5/29), and the Levenshtein repost-detection update lands the week after (6/5).

If you want to skip the read-and-build path and just use it, that link is the fastest way. If you'd rather take the four signals above and roll your own, that works too — that's why I wrote the post. The hard part of this problem isn't the algorithm. It's keeping the DOM parsers alive against three companies that each rev their job-search UI on a different cadence. If you're going to maintain that yourself, budget for it.

## Question for you

What signal am I missing? "Easy Apply" without a follow-up flow is on my list but I haven't tuned its weight enough to commit. Same with recruiter profile age and number of currently-open reqs per recruiter — both feel signal-bearing but I can't isolate them from the company-level signal cleanly yet.

If you've shipped anything in this space — or just have strong opinions about what makes a posting *feel* like a ghost — drop it in the comments.

What do you use to filter your job search?
