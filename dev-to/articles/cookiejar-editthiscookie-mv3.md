---
title: "How to Edit Cookies in Chrome After EditThisCookie Broke (MV3 Guide)"
published: false
tags: ["chrome","webdev","productivity","devtools"]
series: null
canonical_url: "https://dev-tools-hub.xyz/blog/how-to-edit-cookies-in-chrome"
description: "Edit cookies in Chrome after EditThisCookie broke on Manifest V3 — the built-in DevTools way and a faster MV3-native option."
publish_date: "2026-07-08"
devto_id: null
---

If you're a web developer or QA engineer, you probably had **EditThisCookie** pinned to your toolbar for years. And then one day it stopped updating — or stopped loading entirely. The reason is **Manifest V3 (MV3)**: Chrome retired the old Manifest V2 extension platform, and cookie editors that weren't rebuilt for MV3 got left behind.

Here's how to keep editing cookies in Chrome today — the built-in way, and a faster MV3-native option.

## Why MV3 killed a lot of cookie editors

Manifest V3 changed how extensions run in the background (persistent background pages → service workers) and tightened several APIs. Extensions that weren't migrated stopped receiving updates and, for many users, stopped working. Cookie editors were especially affected because they lean on background scripts and the `chrome.cookies` API.

If your old editor throws an error or vanished from your toolbar, MV3 is almost always the cause.

## Option 1: Chrome DevTools (no install)

DevTools has a built-in cookie editor:

1. Right-click the page → **Inspect**
2. Open the **Application** tab
3. Sidebar → **Storage → Cookies**
4. Select the domain
5. Double-click a row to edit name, value, domain, expiry, or flags

It works, but it's slow for repeated use: no search, no filtering by cookie type, no one-click export, and every edit is several clicks deep in a small panel.

## Option 2: CookieJar (MV3-native)

[CookieJar](https://dev-tools-hub.xyz/extensions/cookiejar/?utm_source=devto&utm_campaign=edit-cookies-chrome) is a free, Manifest V3 cookie editor built as a direct alternative to EditThisCookie.

The core workflow:

1. Click the toolbar icon
2. See every cookie for the active page, sorted by domain and auto-labeled (Login / Tracking / Analytics / Functional)
3. Click a cookie to edit its value, expiry, or flags — takes effect immediately
4. Export or import as JSON or Netscape (`cookies.txt`)

### Coming from EditThisCookie

| EditThisCookie habit | CookieJar |
|---|---|
| Popup with all cookies | Click the toolbar icon |
| Inline edit a value | Click a cookie, edit directly |
| Export to file | JSON or Netscape (cookies.txt) |
| Import from file | Supported |
| Delete a single cookie | One click |
| Built for current Chrome | ✅ MV3-native |

Everything above is free. CookieJar Pro ($4.99/month, or $29.99 one-time) adds automatic cookie-cleanup rules, saved cookie profiles, and a storage manager.

### Why this matters for testing

- **Auth flows**: flip session state without creating throwaway accounts
- **New vs. returning user**: clear specific cookies while keeping the rest
- **Login loops**: nuke a stale session cookie in two clicks
- **Flag verification**: confirm `Secure` / `HttpOnly` / `SameSite` at a glance

`HttpOnly` cookies can be viewed and deleted but not edited — a browser security rule, not a tool limitation. Same as EditThisCookie.

## Install

CookieJar is free and needs no account. Your cookies and saved profiles stay in your browser — CookieJar has no server of its own and never uploads your cookie data.

→ **Install free:** https://dev-tools-hub.xyz/extensions/cookiejar/?utm_source=devto&utm_campaign=edit-cookies-chrome

Chrome Web Store: https://chromewebstore.google.com/detail/cookiejar/lhngfkchfepfjjdfhimconagoejemofg

What do you use to edit cookies now that EditThisCookie is gone — DevTools, or something else?

*Built by [S-Hub](https://dev-tools-hub.xyz) — minimal, MV3-native Chrome extensions.*
