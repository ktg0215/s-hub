---
title: "EditThisCookie Got Removed — So I Built a Modern Cookie Editor for Chrome"
published: false
tags: ["chromeextension", "webdev", "privacy", "testing"]
series: null
canonical_url: null
publish_date: "2026-03-31"
devto_id: null
---

If you've ever worked with cookies during web development, you probably used EditThisCookie. It was the go-to Chrome extension for inspecting, editing, and deleting cookies. Over 3 million users relied on it daily.

Then one day, it vanished from the Chrome Web Store.

Google pulled it because it was still running on Manifest V2 — the old extension platform that Chrome has been phasing out since 2023. The situation got worse when copycat extensions appeared, some of which turned out to contain malware. The developer community was left scrambling for a trustworthy replacement.

I was one of those developers who depended on EditThisCookie for everyday work. After trying several alternatives and finding them lacking, I decided to build my own. The result is **CookieJar** — a Manifest V3 cookie manager designed from the ground up for how developers actually work with cookies in 2026.

This article walks through five real-world use cases where CookieJar saves time, and explains how its privacy scoring feature helps with compliance audits.

## The Problem with DevTools Alone

Chrome DevTools has a built-in cookie viewer under the Application tab. It works, but it was never designed as a productivity tool. Want to switch between two sets of cookies? Copy each value by hand. Want to export cookies for a teammate? No built-in option. Want to know which cookies are tracking you? You'll need to look up each domain yourself.

For one-off inspections, DevTools is fine. But when cookie manipulation is part of your daily workflow — testing auth flows, managing environments, auditing third-party trackers — you need something purpose-built.

## Use Case 1: Switching Between Login Sessions Instantly

**The scenario:** You're building a web app with role-based access. You need to verify that the admin dashboard shows different UI elements than the regular user view, and that unauthenticated visitors see the correct landing page.

**The old way:**
1. Log in as admin, verify the dashboard
2. Log out
3. Log in as a regular user, check restricted pages
4. Log out
5. Open an incognito window for the unauthenticated view
6. Repeat every time the UI changes

This cycle can eat 5-10 minutes per round, and you're limited to two simultaneous sessions (regular + incognito).

**With CookieJar profiles:**

CookieJar's profile feature lets you snapshot an entire set of cookies and restore them with one click. Here's the workflow:

1. Log in as admin. Open CookieJar and save the current cookies as an "Admin" profile.
2. Log out, log in as a regular user, and save that as "Regular User."
3. Save the logged-out state as "Anonymous."

From that point on, switching roles means clicking a profile name. CookieJar uses `chrome.cookies.set` to restore every cookie in the profile — session tokens, CSRF tokens, feature flags, all of it. No more logging in and out.

This is especially valuable for QA engineers who test multi-role applications. Instead of maintaining a spreadsheet of test credentials and going through login flows repeatedly, they can set up profiles once and switch instantly.

## Use Case 2: Managing Cookies Across Staging and Production

**The scenario:** You're debugging a feature that behaves differently on staging and production. Each environment has its own session cookies, feature flags, and debug settings. Every time you switch environments, you lose your cookie state and have to set everything up again.

**With CookieJar profiles:**

Create an environment profile for each context:

- **"Staging"** — session cookie, debug mode flag, feature flags for the staging environment
- **"Production"** — production session, standard feature flags
- **"Staging + Debug"** — staging session plus verbose logging cookies

Switching between environments is a single click. But the real productivity gain comes from sharing: CookieJar supports JSON and Netscape format export/import. When a new team member joins, you can hand them a JSON file and say "import this to access staging." No more writing setup documentation that goes stale.

The Netscape format is the same one used by curl's `-b` flag, so exported cookies work directly with command-line testing:

```bash
curl -b cookies.txt https://staging.example.com/api/user/me
```

This eliminates the awkward dance of copying cookies from DevTools into curl commands character by character.

## Use Case 3: Forcing A/B Test Variations

**The scenario:** Your team is running an A/B test. The product manager wants to see variation B, but they keep getting assigned to variation A. The engineer responsible for the test is in a different timezone.

**With CookieJar:**

Most A/B testing frameworks store the variant assignment in a cookie. The challenge is finding the right cookie among dozens or hundreds on a page.

CookieJar automatically classifies every cookie into six categories: Essential, Functional, Analytics, Advertising, Social, and Unknown. A/B test cookies typically fall under Functional or Analytics, which immediately narrows the search.

The workflow:

1. Open CookieJar's popup and use the search bar to filter by keywords like `experiment`, `variant`, `ab_test`, or your framework's naming convention (e.g., `optimizely`, `vwo`, `split`)
2. Find the variant cookie — it's visually tagged with a category badge
3. Click to edit, change the value (e.g., from `control` to `variation_b`)
4. Reload the page

What used to require digging through DevTools' flat cookie list becomes a quick search-and-edit operation. The category badges provide visual context that makes the right cookie easier to spot.

## Use Case 4: GDPR and Privacy Cookie Audits

**The scenario:** Your company needs to update its privacy policy and cookie consent banner. Legal wants a complete inventory of all cookies your site sets, categorized by purpose, with details about which ones are third-party trackers.

This is one of those tasks that nobody wants to do manually. A typical e-commerce site might set 40-80 cookies, and classifying each one means looking up domain ownership, checking known tracker lists, and documenting the results.

**With CookieJar's Privacy Score:**

CookieJar includes a privacy scoring system that gives you an immediate read on any site's cookie hygiene. When you open the popup, a circular gauge in the header shows a 0-100 score for the current site.

The score is calculated from three factors:

- **Tracking cookie ratio** — the proportion of cookies classified as tracking-related (this has the highest weight)
- **Third-party cookie ratio** — cookies set by domains other than the one you're visiting
- **Security attribute coverage** — how many cookies have `Secure` and `HttpOnly` flags set

The score maps to a color scale: green (80+, Good), yellow (60-79, Fair), orange (40-59, Poor), and red (below 40, Bad).

**A practical audit workflow:**

1. Navigate to your site and check the Privacy Score for a quick overview
2. Use the category filter to isolate "Advertising" cookies — these are the ones most relevant to GDPR consent
3. Review each cookie's domain to identify third-party trackers
4. Export the full cookie list as CSV for documentation

CookieJar's classification engine combines the Disconnect.me tracking domain list with pattern matching on common cookie names. Cookies named `_ga` or `_fbp` are classified as Analytics/Advertising; `session` or `csrf` land in Essential. Everything runs locally — no data is sent to any external server.

A word of caution: automated classification is a starting point, not a final answer. Always verify the actual purpose of each cookie against your codebase and third-party documentation before including it in a legal document.

## Use Case 5: Exporting Cookies for E2E Test Automation

**The scenario:** Your Playwright or Puppeteer test suite starts every test run by going through the login flow. This adds 5-15 seconds per test and occasionally fails due to rate limiting or slow authentication services. You want tests to start from an authenticated state.

**With CookieJar's export formats:**

CookieJar supports five export formats, each designed for a specific workflow:

| Format | Use Case | Availability |
|--------|----------|-------------|
| JSON | Import/export between CookieJar instances | Free |
| Netscape | curl commands (`curl -b cookies.txt`) | Free |
| cURL | Ready-to-run curl command with cookie header | Pro |
| Puppeteer/Playwright | `await context.addCookies(...)` code snippet | Pro |
| CSV | Spreadsheet audits and documentation | Pro |

The Puppeteer/Playwright export is particularly useful. Log in to your app in the browser, open CookieJar, and export. You get a JavaScript snippet that you can drop directly into your test setup:

```javascript
// Generated by CookieJar export
await context.addCookies([
  {
    name: 'session_id',
    value: 'abc123...',
    domain: '.example.com',
    path: '/',
    httpOnly: true,
    secure: true,
    sameSite: 'Lax'
  },
  // ... other cookies
]);
```

Paste this into your `beforeEach` or global setup, and your tests start authenticated. No login flow, no flaky waits, no rate limit issues.

The Netscape format pairs well with backend testing. When you need to hit an authenticated API endpoint from the command line:

```bash
curl -b exported-cookies.txt https://api.example.com/v1/protected-resource
```

No more manually copying cookie values from the browser.

## Under the Hood: Why Manifest V3 Matters

If you're wondering why the Manifest V2/V3 distinction matters for a cookie editor, here's the short version: MV3 extensions run in a sandboxed service worker instead of a persistent background page. This means better security, lower memory usage, and alignment with Chrome's long-term extension platform.

Extensions that were built on MV2 and never migrated — like the original EditThisCookie — stopped working when Chrome enforced the transition. Some hastily ported alternatives cut corners, leading to the malware incidents that made headlines.

CookieJar was designed for MV3 from day one. The background service worker handles cookie classification, change monitoring, and profile management. The popup and side panel are separate React-based UIs that communicate with the service worker through Chrome's messaging API. There's no persistent background page consuming resources.

## What CookieJar Does Not Do

Transparency matters, so here's what CookieJar intentionally avoids:

- **No data leaves your machine.** All classification, scoring, and storage happens locally using Chrome's storage API. There are no analytics calls, no telemetry, and no external API requests for cookie classification.
- **No network requests for functionality.** The Disconnect.me tracker list and name patterns are bundled with the extension, not fetched at runtime.
- **No hidden permissions.** The extension requests `cookies`, `storage`, `activeTab`, and `tabs` — the minimum needed for its features.

## Getting Started

CookieJar is free for core features (viewing, editing, deleting, searching, filtering, privacy score, JSON/Netscape export). Pro features (profiles, auto-cleanup, Puppeteer/Playwright export, CSV export) are available through a one-time payment.

The extension supports 8 languages: English, Japanese, Spanish, Portuguese (BR), Korean, German, French, and Italian.

If you're migrating from EditThisCookie, the transition is straightforward — CookieJar reads the same Chrome cookies API, so all your existing cookies are visible immediately after installation. There's nothing to import or configure.

**Install CookieJar from the Chrome Web Store:**
{% embed https://chromewebstore.google.com/detail/cookiejar/hcbehagiigcdjgphhdnmmfdgnbaolhpc %}

---

*If you found this useful, I'd appreciate a like or a bookmark. Questions or feature requests? Drop a comment below or open an issue on the extension's support page.*
