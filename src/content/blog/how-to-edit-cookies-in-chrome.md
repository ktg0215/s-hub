---
title: "How to Edit Cookies in Chrome (EditThisCookie Alternative for Manifest V3)"
description: "EditThisCookie stopped working after Chrome's Manifest V3 change. Here's how to view, edit, and delete cookies in Chrome today — the built-in way, and a faster MV3-ready extension."
date: 2026-07-07
tags: ["cookie-editor", "chrome", "how-to", "cookiejar", "editthiscookie-alternative"]
draft: false
---

# How to Edit Cookies in Chrome (EditThisCookie Alternative for Manifest V3)

**Time to read: 3 minutes**

If you used to edit cookies with **EditThisCookie** and it suddenly stopped working, you're not alone. Chrome's move to **Manifest V3 (MV3)** retired a lot of older extensions, and cookie editors were hit hard. This guide shows you how to edit cookies in Chrome today — first with the built-in DevTools method, then with a faster MV3-ready extension that picks up where EditThisCookie left off.

---

## Why EditThisCookie Stopped Working

Chrome deprecated **Manifest V2** extensions in favor of Manifest V3, which changed how extensions run in the background and how they access browser APIs. Extensions that weren't rebuilt for MV3 stopped receiving updates and, for many users, stopped loading altogether. If your old cookie editor shows an error or simply disappeared, this is almost always why.

You have two options: use Chrome's built-in tools, or install a cookie editor that was built for MV3 from the ground up.

---

## What Are Browser Cookies (and When Do You Need to Edit Them)?

Browser cookies are small files websites store to remember your state — whether you're logged in, what's in your cart, your language preference. Common reasons to edit or delete them:

- **Debugging a web app**: Testing how a page behaves for new vs. returning users
- **Testing authentication**: Simulating different login states without creating new accounts
- **Fixing login loops**: Stale session cookies often cause infinite redirect loops
- **Removing tracking cookies**: Cleaning up ad-network cookies without logging out of everything
- **Testing cookie flags**: Checking that Secure / HttpOnly / SameSite attributes are set correctly

---

## Method 1: Chrome DevTools (the Built-In Way)

Chrome has a built-in cookie viewer inside Developer Tools:

1. Open Chrome and navigate to any page
2. Right-click anywhere on the page → click **Inspect**
3. In the DevTools panel, click **Application** at the top
4. In the left sidebar, expand **Storage** → **Cookies**
5. Click the domain to see all its cookies
6. Double-click any row to edit the name, value, domain, expiry, or flags

This works, but it's slow for regular use:
- No search across cookies
- No filtering by type (tracking vs. login vs. analytics)
- No one-click export or category-based delete
- Every edit requires several clicks in a small panel

If you edit cookies once in a blue moon, DevTools is fine. If you do it regularly — or you just want your EditThisCookie workflow back — there's a faster way.

---

## Method 2: CookieJar — a Manifest V3 Cookie Editor

[CookieJar](https://dev-tools-hub.xyz/extensions/cookiejar/?utm_source=hpblog&utm_campaign=edit-cookies-chrome) is a free Chrome extension built on Manifest V3, so it keeps working under Chrome's current security model. It's designed as a direct, modern alternative to EditThisCookie.

**How to edit cookies in Chrome with CookieJar:**

1. **Install CookieJar** from the Chrome Web Store (free — takes 30 seconds)
2. Navigate to any page
3. Click the **CookieJar icon** in your Chrome toolbar
4. All cookies for that page appear in a clean list, sorted by domain
5. Click any cookie → edit the name, value, expiry, or flags directly
6. Your change takes effect immediately — no page reload required

**What CookieJar does (free):**

- **Edit, create, and delete** cookies on any page
- **Search** any cookie by name, domain, or value
- **Export & import** cookies as JSON or Netscape (cookies.txt) format
- **Privacy score**: see how many tracking cookies a site sets, scored by category
- **Auto-labeling**: every cookie is automatically tagged as Login / Tracking / Analytics / Functional

---

## Coming from EditThisCookie? What Maps Over

| EditThisCookie habit | In CookieJar |
|---|---|
| Open the popup to see all cookies | Same — click the toolbar icon |
| Edit a cookie value inline | Same — click a cookie, edit directly |
| Export cookies to a file | Export as JSON or Netscape (cookies.txt) |
| Import cookies from a file | Import supported |
| Delete a single cookie | One click |
| Built for the current Chrome (MV3) | ✅ Yes — no MV2 deprecation issues |

---

## DevTools vs. CookieJar: Side-by-Side

| Task | Chrome DevTools | CookieJar |
|---|---|---|
| Edit a cookie value | 5+ clicks | 2 clicks |
| Search cookies | ❌ | ✅ |
| Filter by cookie type | ❌ | ✅ |
| Export cookies as JSON | ❌ | ✅ |
| Import cookies from file | ❌ | ✅ |
| Privacy score per site | ❌ | ✅ |
| Works without opening DevTools | ❌ | ✅ |
| Free | ✅ | ✅ |

---

## Common Use Cases

### Web Developers
Session-token manipulation, auth-flow testing, and cookie-flag verification are daily tasks. CookieJar cuts each of these from 10+ clicks in DevTools to 2–3 clicks.

### QA Engineers
Testing the "new user" vs. "returning user" path requires clearing specific cookies while keeping others. CookieJar's category labels make it easy to see exactly what you're removing.

### Privacy-Conscious Users
Want to see who's tracking you on a site? CookieJar's privacy score and auto-categorization show which cookies are tracking cookies — so you can delete them without touching your login session.

---

## Install CookieJar Free

CookieJar is free to install with no account required. Your cookie data stays on your device — CookieJar never sends your browsing data anywhere. CookieJar Pro ($4.99/month, or $29.99 one-time) adds automatic cookie-cleanup rules, saved cookie profiles, and a storage manager.

**[→ Add CookieJar to Chrome (Free)](https://dev-tools-hub.xyz/extensions/cookiejar/?utm_source=hpblog&utm_campaign=edit-cookies-chrome)**

Chrome Web Store listing: `https://chromewebstore.google.com/detail/cookiejar/lhngfkchfepfjjdfhimconagoejemofg`

---

## FAQ

**Is CookieJar a good EditThisCookie replacement?**
Yes — it covers the core EditThisCookie workflow (view, edit, create, delete, import, and export cookies) and is built on Manifest V3, so it keeps working under current Chrome. It also adds search, privacy scoring, and automatic cookie categorization.

**Can I edit cookies on any website?**
Yes. CookieJar shows all cookies for the active page in Chrome. You can edit, delete, or export any cookie the browser can read. Note: `HttpOnly` cookies (set by the server) can be seen and deleted, but not edited — this is a browser security restriction, not a CookieJar limitation.

**Will editing cookies break the page?**
Modifying a session token incorrectly can log you out or cause errors. For safety, use CookieJar's **export** feature first (JSON format) — that way you can restore the original cookies if something goes wrong.

**Is CookieJar safe to install?**
CookieJar is built on Manifest V3 (Chrome's current extension security model) and stores all data locally. It never sends your cookies or browsing data to external servers. You can verify this in the Privacy Practices section of the Chrome Web Store listing.

---

*Published by [S-Hub](https://dev-tools-hub.xyz) — minimal Chrome extensions for productivity and privacy.*
