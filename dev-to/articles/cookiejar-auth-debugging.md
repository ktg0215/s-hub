---
title: "5 Cookie Tricks for Debugging Auth Issues in Chrome (No More Creating Test Accounts)"
published: true
tags: ["webdev","chrome","testing","javascript"]
series: null
canonical_url: null
publish_date: "2026-06-19"
main_image: "https://dev-tools-hub.xyz/screenshots/cookiejar/screenshot-01.png"
devto_id: "3960038"
---

Debugging authentication in web apps is painful. You need to test the same flow as five different user types — new visitor, returning user, admin, expired session, logged-out — and the easiest way is to constantly create new accounts or clear all your cookies and start over.

There's a faster way. These five techniques use direct cookie manipulation to simulate any auth state without touching your database or creating dummy accounts.

I use [CookieJar](https://chromewebstore.google.com/detail/cookiejar-cookie-manager/lhngfkchfepfjjdfhimconagoejemofg) for most of this — a free Chrome extension built natively on MV3 that gives you a proper UI for cookie editing. But I'll show you the underlying Chrome DevTools method too, so you understand what's actually happening.

---

## 1. Simulate a Logged-Out State Without Clearing Everything

The naive approach: clear all cookies and reload. The problem: you just nuked your dev server session token, your local storage flags, your Stripe test mode cookie, and everything else you carefully set up.

**The targeted approach**: identify and delete only the session/auth cookie.

Most session cookies are named `session`, `sid`, `auth_token`, `_session_id`, or something close. In DevTools:

```
Application → Cookies → [your domain] → find the session cookie → right-click → Delete
```

With CookieJar: open the extension, search `session`, click the trash icon next to just that cookie.

Your dev environment stays intact. The user state resets to logged-out.

---

## 2. Test the "Returning User" vs "New User" Path Without a Second Account

Session cookies tell the server you're authenticated. But many apps use *separate* cookies to track whether a user has seen the onboarding flow, completed setup, or visited before.

Look for cookies like `onboarding_complete`, `setup_done`, `first_visit`, or custom flags in your app code. To test the new user experience:

1. Export your current cookies (CookieJar → Export → JSON format, or copy from DevTools)
2. Delete the specific onboarding/first-visit flag cookie
3. Reload and test the new user path
4. Re-import or re-set the cookie to restore your state

This is especially useful when testing progressive disclosure UI — the "have they done X before" branching.

---

## 3. Switch Between User Roles Instantly with Cookie Snapshots

If your app uses role-based access control, you'll regularly need to verify that:
- Admin users see the admin dashboard
- Regular users see the regular dashboard
- Guest users see the right landing page

Creating three accounts and logging in/out manually wastes time. The better approach: **cookie snapshots**.

**Setup (one time)**:
1. Log in as admin → CookieJar → Export → save as `admin-session.json`
2. Log in as regular user → Export → save as `user-session.json`
3. Log in as guest or clear auth cookies → Export → save as `guest-session.json`

**Switching roles (30 seconds)**:
1. CookieJar → Import → load `admin-session.json` → reload
2. You're now the admin. Test what you need.
3. Import `user-session.json` → reload. Now you're the regular user.

This works because the server trusts whoever holds the session token. You're not bypassing auth — you're using valid sessions you legitimately created.

> ⚠️ Keep these JSON files local and out of version control. They're valid session tokens.

---

## 4. Debug "Expired Session" Behavior by Manually Expiring a Cookie

Testing what happens when a session expires is annoying. You either wait for it to actually expire (hours), or you mess with your server-side expiry logic.

The clean way: manipulate the cookie's expiry date directly.

In DevTools:
```
Application → Cookies → your domain → double-click the Expires column of your session cookie → set it to a past date
```

With CookieJar: click the cookie → edit the Expiry field → set it to yesterday → save.

Reload the page. The browser now treats the session as expired, and you see exactly what the user sees when their session times out — login redirect, expired session message, or partial UI state.

Reset by importing your saved session snapshot or logging in normally.

---

## 5. Find Which Cookie Is Causing a Redirect Loop

Login redirect loops (`/login → /dashboard → /login → ...`) are almost always caused by a stale or malformed session cookie. The session exists but fails server-side validation.

Systematic isolation approach:

1. Open CookieJar and look at all cookies for the looping domain
2. Note every auth-related cookie (look for names containing `session`, `token`, `auth`, `jwt`)
3. Delete *one* at a time, reloading after each deletion
4. When the loop stops (either you get logged out cleanly or it works), you've found the culprit

This is much faster than clearing all cookies, because it tells you *which* cookie is broken — useful information for filing a bug report or understanding what's happening server-side.

A common cause: the cookie domain or path is set incorrectly (e.g., set to `.example.com` but the app is at `app.example.com`). CookieJar shows you the full cookie metadata including domain, path, Secure, HttpOnly, and SameSite flags — exactly what you need to diagnose this.

---

## What About HttpOnly Cookies?

HttpOnly cookies can't be read or modified by JavaScript, which is the right security choice for session tokens. But Chrome DevTools (and extensions with the `cookies` permission, like CookieJar) can still see and modify them — because the extension operates at the browser level, not the JavaScript level.

So these techniques work even for HttpOnly session cookies.

---

## The Underlying API

If you want to do this programmatically (in a test script or CI setup), the `chrome.cookies` API handles all of this:

```javascript
// Get all cookies for a domain
const cookies = await chrome.cookies.getAll({ domain: 'localhost' });

// Delete a specific cookie
await chrome.cookies.remove({
  url: 'http://localhost:3000',
  name: 'session'
});

// Set a cookie with a specific expiry
await chrome.cookies.set({
  url: 'http://localhost:3000',
  name: 'session',
  value: 'your-valid-session-token',
  expirationDate: Math.floor(Date.now() / 1000) + 3600 // expires in 1 hour
});
```

For Playwright or Puppeteer testing, you can inject cookies directly into the browser context:

```javascript
// Playwright
await context.addCookies([{
  name: 'session',
  value: 'test-session-token',
  domain: 'localhost',
  path: '/'
}]);

// Puppeteer
await page.setCookie({
  name: 'session',
  value: 'test-session-token',
  domain: 'localhost'
});
```

---

## Tools Referenced

- **Chrome DevTools** (built in) — Application tab, manual cookie editing
- **[CookieJar](https://chromewebstore.google.com/detail/cookiejar-cookie-manager/lhngfkchfepfjjdfhimconagoejemofg)** — free Chrome extension for cookie editing, import/export, and privacy scoring. Built on MV3, stores everything locally.

The cookie snapshot workflow (tip #3) is the one I use most. Set it up once, switch user roles in under 30 seconds for the rest of the project.
