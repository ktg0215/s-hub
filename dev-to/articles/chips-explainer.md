---
title: "What are Partitioned cookies (CHIPS), and why can+t your cookie editor see them?"
published: true
tags: ["chrome","webdev","javascript","devtools"]
series: null
canonical_url: null
description: "Modern Chrome partitions third-party cookies by top-level site (CHIPS). Most tools hide them. Here is how to see and clear them."
publish_date: "2026-07-23"
main_image: "https://dev-tools-hub.xyz/screenshots/cookiejar/screenshot-01.png"
devto_id: "4216406"
---
I cleared "all cookies" for a site, reloaded, and a tracking cookie was still there. Not a caching issue — the cookie genuinely came back. That's what sent me down the CHIPS rabbit hole, and it turns out most cookie tools quietly hide a whole class of cookies from you.

Here's the short version of what's happening.

## Third-party cookies got partitioned

For years, a cookie set by `embed.example.com` was one cookie, shared everywhere that embed appeared. That's exactly the cross-site tracking browsers have been clamping down on.

Chrome's answer is **CHIPS** — Cookies Having Independent Partitioned State — exposed as the `Partitioned` attribute:

```http
Set-Cookie: session=abc; Secure; SameSite=None; Partitioned
```

With `Partitioned`, that cookie is **keyed by the top-level site** you're visiting. So the cookie `embed.example.com` sets while you're on `site-a.com` is a *different stored cookie* from the one it sets on `site-b.com`. Same domain, same name, two isolated jars. That isolation is the entire point — an embed can keep state without becoming a cross-site super-cookie.

## Why your cookie editor doesn't show them

This is the part that bites developers. In the extension API, `chrome.cookies.getAll()` treats the partition key as a filter:

```js
// unpartitioned cookies ONLY (what most old tools effectively ask for)
chrome.cookies.getAll({ url });

// a specific partition
chrome.cookies.getAll({ partitionKey: { topLevelSite: 'https://site-a.com' } });

// EVERYTHING — partitioned and unpartitioned
chrome.cookies.getAll({ partitionKey: {} });
```

If a tool was written before CHIPS, it calls the first form. It isn't lying on purpose — it's asking a question whose answer no longer includes the partitioned cookies. So the UI shows a confident, complete-looking list that's **missing rows**. You clear "all," the partitioned ones survive because they were never in the list, and you're left debugging against a wrong picture.

The partition key itself has two parts:

```js
partitionKey: {
  topLevelSite: 'https://site-a.com',
  hasCrossSiteAncestor: true   // Chrome 130+
}
```

`hasCrossSiteAncestor` (the "Ancestor Chain Bit") is the subtle one: it records whether the cookie's frame sits under a cross-site ancestor. Two cookies can share a `topLevelSite` and still be different entries because this bit differs. If a tool ignores it — or passes it without `topLevelSite`, which throws — deletes silently miss.

## How to actually see and clean them

Once you know partitioned cookies exist, you want three things: to **see** them grouped by partition, to **delete** the right one (matching its exact partition key), and to **export** the full set so a repro is reproducible.

That's the gap [CookieJar](https://dev-tools-hub.xyz/extensions/cookiejar) fills. It's a free MV3 cookie manager that lists cookies **across partitions**, **groups** them by their partition (top-level site), and lets you **delete and export** partitioned cookies correctly — not just the unpartitioned ones legacy tools show. For editing partitioned cookies specifically, that's still coming; the immediate win is finally *seeing and clearing* the ones that were invisible.

A couple of gotchas worth knowing if you're testing this yourself:

- Partitioned cookies require `Secure` and `SameSite=None`. You can't create one from a `chrome-extension://` page, so to generate test data you need a real HTTPS server setting the header, with a cross-site iframe.
- Minimum useful Chrome for the full API is **130** — earlier versions had a `getAll` regression around partitioned cookies.

Chrome Web Store: https://chromewebstore.google.com/detail/mv3-cookie-editor-manager/lhngfkchfepfjjdfhimconagoejemofg

If you've been fighting a cookie that "won't delete," check whether it's partitioned — I'd bet a good number of those bugs are CHIPS, not caching. Have you hit this one yet?
