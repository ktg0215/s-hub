---
title: "I Built a Chrome Extension That Scores Job Listings for Ghost Job Risk — GhostJob"
published: false
publish_date: "2026-05-24"
devto_id: "3532588"
tags: ["chrome","javascript","webdev","career"]
---

Ghost jobs are real, and they're wasting job seekers' time at scale.

A ghost job is a listing that's been posted — and left up — with no real intention of hiring. Companies do this to maintain a talent pipeline, gauge market salaries, or simply because nobody removed the expired listing. Estimates suggest 20–40% of job postings at any given time have low or zero active hiring intent.

You apply anyway because you have no way to tell. Until now.

## What GhostJob Does

**GhostJob** is a Chrome extension that analyzes job listings on Indeed, LinkedIn, and Glassdoor and assigns each posting a **ghost score from 0 to 100**. The higher the score, the more likely the listing is stale or inactive.

The score appears directly on each job card as an overlay — green for likely real, yellow for caution, red for probable ghost — so you can triage listings at a glance before deciding whether to apply.

## The Scoring Model

Ghost score is calculated from observable signals in the listing DOM:

```typescript
interface GhostSignals {
  daysPosted: number;
  applicantCount: number;
  hasClosingDate: boolean;
  hasRecruiterActivity: boolean;
  repostCount: number;
}

export function calcGhostScore(signals: GhostSignals): number {
  let score = 0;
  if (signals.daysPosted > 30)  score += 20;
  if (signals.daysPosted > 90)  score += 20;
  if (signals.applicantCount > 100) score += 15;
  if (signals.applicantCount > 300) score += 10;
  if (!signals.hasClosingDate)  score += 10;
  if (!signals.hasRecruiterActivity) score += 15;
  score += Math.min(signals.repostCount * 5, 10);
  return Math.min(score, 100);
}
```

The thresholds are based on empirical patterns: a 90-day-old listing with 300+ applicants and no recruiter activity is a very different beast than a fresh listing with a clear closing date.

**Score display in the UI:**

```typescript
function ghostLevel(score: number) {
  if (score <= 30) return { label: 'Likely real',       color: '#16a34a', dot: '🟢' };
  if (score <= 60) return { label: 'Caution',           color: '#d97706', dot: '🟡' };
  return              { label: 'Likely ghost',          color: '#dc2626', dot: '🔴' };
}
```

A compact score bar below each job card gives an at-a-glance reading without cluttering the listing page.

## Cross-Platform Content Script

Indeed, LinkedIn Jobs, and Glassdoor all have different DOM structures and different SPA update patterns. The content script uses a selector map per platform:

```typescript
const SELECTORS: Record<Platform, PlatformSelectors> = {
  indeed: {
    jobCard: '.job_seen_beacon',
    title: '[data-testid="jobTitle"]',
    daysPosted: '.date',
    applicants: '.applicantCount',
  },
  linkedin: {
    jobCard: '.job-search-card',
    title: '.job-search-card__title',
    // ...
  },
  glassdoor: { /* ... */ },
};
```

A `MutationObserver` watches the job list container for new cards and processes each one asynchronously. On cleanup, `observer.disconnect()` is called to prevent memory leaks — this was a P0 bug in v1.0.0 that caused performance degradation on long browsing sessions.

**Job ID stability** was another challenge. LinkedIn's DOM attributes vary by login state, so the extension falls back to a hash of `company + title` when the URL-based `jobId` is unavailable.

## Free vs. Pro Tiers

| Feature | Free | Pro ($5/mo) |
|---------|------|-------------|
| Scans per day | 20 | Unlimited |
| Company hiring trend history | — | ✓ |
| Flagged job export (CSV) | — | ✓ |

20 free scans/day is enough for a casual job search session. Power users — people running systematic job searches across hundreds of listings — are the upgrade target.

## Internationalization

The extension ships with full i18n support (en/ja/ko/es). Ghost score labels, status badges, and all UI text route through a translation table. No hardcoded strings in components.

```typescript
const msg = t(); // returns locale-aware strings
const level = ghostLevel(score);
<span>{level.dot} {msg[level.label]}</span>
```

---

**Chrome Web Store:** https://chromewebstore.google.com/detail/mdjchaohgneaiflafheajamfomeccach

If you're actively job searching, install it and let me know which signals you think are missing from the scoring model.
