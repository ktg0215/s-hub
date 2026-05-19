---
title: "Building a Cookie Manager Chrome Extension: What I Learned From the MV3 Transition"
published: true
publish_date: "2026-05-08"
devto_id: "3519735"
tags: ["chrome","javascript","webdev","tutorial"]
---

Cookie management extensions are one of the oldest categories in the Chrome Web Store. EditThisCookie has been around since 2011 and still has millions of users. The category is established, the use cases are well-understood, and it's a good study in how to migrate a conceptually simple tool to Manifest V3.

I built **CookieJar** as an EditThisCookie alternative built natively on MV3. Here's what the development revealed.

## The `cookies` API in MV3

The Chrome `cookies` API is straightforward. To get all cookies for the current tab:

```typescript
async function getCookiesForTab(tabId: number): Promise<chrome.cookies.Cookie[]> {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.url) return [];

  return chrome.cookies.getAll({ url: tab.url });
}
```

The `url` parameter scopes the query to cookies accessible to that origin (matching domain and secure flag). Pass `{}` instead to get all cookies the extension can see.

**The MV3 change that matters**: In MV2, you could listen to `chrome.cookies.onChanged` from a persistent background page indefinitely. In MV3, the service worker is terminated after inactivity. Real-time cookie monitoring requires a different approach.

## Real-Time Cookie Monitoring Without a Persistent Background

If a user has the extension open and is modifying cookies on the page, I want the UI to update. But `chrome.cookies.onChanged` is only active while the service worker is running.

The solution: keep a port connection alive between the popup and the service worker. A port connection keeps the service worker active as long as the port is open:

```typescript
// In popup
const port = chrome.runtime.connect({ name: 'cookie-monitor' });

port.onMessage.addListener((msg) => {
  if (msg.type === 'COOKIE_CHANGED') {
    // Update UI
    refreshCookies();
  }
});

// Cleanup when popup closes
window.addEventListener('unload', () => port.disconnect());

// In service worker
chrome.runtime.onConnect.addListener((port) => {
  if (port.name !== 'cookie-monitor') return;

  const listener = (changeInfo: chrome.cookies.CookieChangeInfo) => {
    port.postMessage({ type: 'COOKIE_CHANGED', cookie: changeInfo.cookie });
  };

  chrome.cookies.onChanged.addListener(listener);

  port.onDisconnect.addListener(() => {
    chrome.cookies.onChanged.removeListener(listener);
  });
});
```

The port keeps the service worker alive while the popup is open. When the popup closes, the port disconnects, and the listener is removed cleanly.

## Cookie Editing: The Session/Persistent Distinction

There are two cookie types users care about: session cookies (no explicit expiry, deleted when browser closes) and persistent cookies (explicit `Max-Age` or `Expires` attribute).

The `chrome.cookies.set()` API mirrors the HTTP Set-Cookie header:

```typescript
async function updateCookie(
  original: chrome.cookies.Cookie,
  updates: Partial<CookieEditFields>
): Promise<chrome.cookies.Cookie | null> {
  const url = buildCookieUrl(original);

  const details: chrome.cookies.SetDetails = {
    url,
    name: updates.name ?? original.name,
    value: updates.value ?? original.value,
    domain: updates.domain ?? original.domain,
    path: updates.path ?? original.path,
    secure: updates.secure ?? original.secure,
    httpOnly: updates.httpOnly ?? original.httpOnly,
    sameSite: updates.sameSite ?? original.sameSite,
  };

  // Handle session vs persistent
  if (updates.expirationDate !== undefined) {
    if (updates.expirationDate === null) {
      // Make it a session cookie (no expirationDate in details)
    } else {
      details.expirationDate = updates.expirationDate;
    }
  } else if (original.session) {
    // Preserve session nature — don't add expirationDate
  } else {
    details.expirationDate = original.expirationDate;
  }

  return chrome.cookies.set(details);
}

function buildCookieUrl(cookie: chrome.cookies.Cookie): string {
  const scheme = cookie.secure ? 'https' : 'http';
  const domain = cookie.domain.startsWith('.') ? cookie.domain.slice(1) : cookie.domain;
  return `${scheme}://${domain}${cookie.path}`;
}
```

The `domain` handling is subtle: Chrome stores domain cookies with a leading `.` (indicating host-only = false), but `cookies.set()` wants the domain without the leading `.` when building the URL. Forgetting this causes silent failures where the set operation appears to succeed but the cookie isn't updated.

## The `httpOnly` Problem

`httpOnly` cookies cannot be set directly via JavaScript — that's the whole point. But the `chrome.cookies` API can read and set them because it bypasses the JavaScript restriction. This is one of the key reasons developers need a cookie manager extension rather than just using DevTools.

When editing an `httpOnly` cookie, CookieJar preserves the flag:

```typescript
// When displaying httpOnly cookies
{cookie.httpOnly && (
  <Badge variant="secondary" title="Cannot be accessed by JavaScript">
    httpOnly
  </Badge>
)}
```

The badge both informs the user and serves as a reminder that this cookie is protected from XSS-based theft.

## Search and Filter

With 50+ cookies on a complex page, the list gets unwieldy. I added filtering that handles the common patterns:

```typescript
function filterCookies(
  cookies: chrome.cookies.Cookie[],
  query: string
): chrome.cookies.Cookie[] {
  const q = query.toLowerCase().trim();
  if (!q) return cookies;

  return cookies.filter((c) => {
    return (
      c.name.toLowerCase().includes(q) ||
      c.value.toLowerCase().includes(q) ||
      c.domain.toLowerCase().includes(q)
    );
  });
}
```

I also added quick filters for common categories: session-only, httpOnly, secure, and by domain — the most common use cases I observed when I interviewed developers about their cookie management workflow.

## Import/Export

CookieJar supports exporting the current page's cookies as JSON and re-importing them. This is useful for sharing a session state, preserving cookies before clearing storage, or transferring a session between environments.

The export format is the Chrome `cookies.Cookie` type directly — no transformation needed. The import uses `chrome.cookies.set()` for each cookie, with error handling for cookies that can't be set (e.g., cookies for a domain you're not currently on):

```typescript
async function importCookies(
  cookies: chrome.cookies.Cookie[]
): Promise<{ success: number; failed: number }> {
  let success = 0;
  let failed = 0;

  for (const cookie of cookies) {
    try {
      await updateCookie(cookie, {});
      success++;
    } catch {
      failed++;
    }
  }

  return { success, failed };
}
```

## The MV3 Lesson

Cookie managers are a good test case for MV3 constraints because they need real-time DOM observation and background API access. The port-based keep-alive pattern for the service worker solves the real-time monitoring problem, but it's not an obvious solution and isn't documented prominently by Google.

The key constraint: anything that needs to be "always on" has to be driven by an open UI (popup, side panel, or new tab page). If your background monitoring logic is important even when no UI is open, you need to rethink the architecture for MV3 — the service worker model simply doesn't support persistent background processes.

CookieJar is on the Chrome Web Store: https://chromewebstore.google.com/detail/lhngfkchfepfjjdfhimconagoejemofg

---

*Built with Vite + React + TypeScript. Uses `chrome.cookies`, `chrome.tabs`, and port-based service worker keep-alive.*
