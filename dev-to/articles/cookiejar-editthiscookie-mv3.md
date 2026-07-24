---
title: "How to Edit Cookies in Chrome After EditThisCookie Broke (MV3 Guide)"
published: true
tags: ["chrome","webdev","productivity","devtools"]
series: null
canonical_url: "https://dev-tools-hub.xyz/blog/how-to-edit-cookies-in-chrome"
description: "Edit cookies in Chrome after EditThisCookie broke - DevTools, a faster MV3 option, and the partitioned cookies (CHIPS) most tools hide."
publish_date: "2026-07-08"
main_image: "https://raw.githubusercontent.com/ktg0215/s-hub/main/marketing-assets/covers/cookiejar-cover-b-en.png"
devto_id: "4098711"
---
If you're a web developer or QA engineer, you probably had **EditThisCookie** pinned to your toolbar for years. And then one day it stopped updating — or stopped loading entirely. The reason is **Manifest V3 (MV3)**: Chrome retired the old Manifest V2 extension platform, and cookie editors that weren't rebuilt for MV3 got left behind.

Here's how to keep editing cookies in Chrome today — the built-in way, a faster MV3-native option, and one thing even current tools still get wrong.

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

## The part even current tools still miss: Partitioned cookies (CHIPS)

Here's the thing that tripped me up, and it's not in most cookie editors — or in the DevTools list at a glance.

Modern Chrome **partitions** many third-party cookies by the top-level site you're on. This is **CHIPS** — the `Partitioned` attribute. A cookie set by `embed.example.com` while you're on `site-a.com` is a *different stored cookie* from the one the same embed sets on `site-b.com`. They're isolated on purpose.

Most cookie tools were written before CHIPS existed, so they show an **incomplete list** — the partitioned cookies are simply absent, and you end up debugging against a picture that's missing rows. If you've ever cleared "all" cookies for a site and a tracker somehow survived, a partitioned cookie is often why.

CookieJar lists cookies **across partitions** and groups them by their partition (top-level site), so you can **see, delete, and export** partitioned cookies too — not just the unpartitioned ones. For anyone testing cross-site embeds, ad/analytics behavior, or `Partitioned` cookie setups, seeing the *full* set is the difference between a real repro and a confusing one.

### Why this matters for testing

- **Auth flows**: flip session state without creating throwaway accounts
- **New vs. returning user**: clear specific cookies while keeping the rest
- **Login loops**: nuke a stale session cookie in two clicks
- **Cross-site embeds**: finally see the partitioned cookies legacy tools hide
- **Flag verification**: confirm `Secure` / `HttpOnly` / `SameSite` at a glance

`HttpOnly` cookies can be viewed and deleted but not edited — a browser security rule, not a tool limitation. Same as EditThisCookie.

## Install

CookieJar is free and needs no account. Your cookie data never leaves your device — cookies are read and edited locally in your browser, and their contents are never uploaded, sold, or shared.

→ **Install free:** https://dev-tools-hub.xyz/extensions/cookiejar/?utm_source=devto&utm_campaign=edit-cookies-chrome

Chrome Web Store: https://chromewebstore.google.com/detail/mv3-cookie-editor-manager/lhngfkchfepfjjdfhimconagoejemofg

What do you use to edit cookies now that EditThisCookie is gone — DevTools, or something else? And had you noticed the partitioned-cookie gap?

*Built by [S-Hub](https://dev-tools-hub.xyz) — minimal, MV3-native Chrome extensions.*
