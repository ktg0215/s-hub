---
title: "Manifest V3 Migration: The Gotchas Nobody Warned Me About"
published: false
publish_date: "2026-05-04"
devto_id: "3519755"
tags: ["chrome","javascript","webdev","tutorial"]
---

When Google announced the Manifest V3 deadline, the developer community had a lot to say — most of it negative. The service worker model was rightly criticized as a regression for ad blockers and complex extensions.

I've now migrated 18 extensions from MV2 to MV3, or built them MV3-native from the start. The commonly documented issues (no persistent background pages, limited webRequest) are real. But there's a longer list of subtler problems I hit that weren't well-documented.

Here's what actually caught me off guard.

## 1. Service Workers Die at Inopportune Times

This is the most-discussed MV3 change, but the extent of it surprised me. The service worker doesn't just "stop when idle" — it can be terminated after as little as 30 seconds of inactivity, even mid-operation.

The failure mode is subtle: a message from a content script reaches the service worker just as it's being terminated. The message is lost. The content script gets no response. No error, no log, just silence.

**The fix**: Always assume the service worker might not be running. Content scripts should retry with exponential backoff:

```typescript
async function sendToBackground<T>(
  message: unknown,
  maxRetries = 3
): Promise<T> {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await chrome.runtime.sendMessage(message);
    } catch (err) {
      if (attempt === maxRetries - 1) throw err;
      // Brief delay — gives the service worker time to restart
      await new Promise(res => setTimeout(res, 100 * Math.pow(2, attempt)));
    }
  }
  throw new Error('Service worker unreachable');
}
```

## 2. `chrome.alarms` Is the Only Reliable Timer

`setTimeout` and `setInterval` do not persist across service worker suspensions. A 5-minute timer set with `setTimeout` will fire 30 seconds later — when the service worker happens to wake up and continue execution.

Use `chrome.alarms` for anything time-based:

```typescript
// ❌ This timer won't fire reliably in a service worker
setTimeout(() => doSomething(), 5 * 60 * 1000);

// ✅ This will fire even if the service worker was suspended
await chrome.alarms.create('my-task', { delayInMinutes: 5 });

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'my-task') doSomething();
});
```

The minimum alarm interval is 1 minute. For shorter intervals, you have to use a different approach (keeping the service worker alive with a port connection, though this is unreliable and Google discourages it).

## 3. `chrome.storage` Race Conditions at Startup

When your service worker wakes up to handle an event, `chrome.storage.local.get()` might be slow if the storage backend needs to initialize. Code that reads storage synchronously at module level will fail intermittently:

```typescript
// ❌ Race condition — storage might not be ready
const settings = await chrome.storage.local.get('settings');
let cachedSettings = settings; // Module-level variable

chrome.runtime.onMessage.addListener((msg) => {
  if (cachedSettings.enabled) { // Might be undefined on first wake
    // ...
  }
});
```

**Fix**: Read storage inside event handlers, not at module initialization:

```typescript
// ✅ Always read from storage when handling an event
chrome.runtime.onMessage.addListener(async (msg) => {
  const { settings } = await chrome.storage.local.get('settings');
  if (settings?.enabled) {
    // ...
  }
});
```

## 4. `chrome.runtime.lastError` Must Be Checked

In MV3, failing to check `chrome.runtime.lastError` in callbacks causes uncaught errors that terminate the service worker immediately. This was less fatal in MV2 persistent background pages.

```typescript
// ❌ If this fails, the service worker dies
chrome.storage.local.set({ key: value }, () => {
  console.log('saved');
});

// ✅ Always check
chrome.storage.local.set({ key: value }, () => {
  if (chrome.runtime.lastError) {
    console.error('Storage error:', chrome.runtime.lastError.message);
    return;
  }
  console.log('saved');
});
```

If you're using the Promise-based API (Chrome 88+), this is automatic — rejected promises propagate normally. Use the Promise API whenever possible.

## 5. Content Script Injection Timing Changed

MV2 allowed `"run_at": "document_start"` scripts to reliably modify the page before any other scripts ran. In MV3, the timing of dynamically injected scripts via `chrome.scripting.executeScript` is less predictable.

For extensions that need early injection (to intercept fetch calls, patch globals, etc.), stick with the manifest-declared content scripts:

```json
{
  "content_scripts": [
    {
      "matches": ["<all_urls>"],
      "js": ["content.js"],
      "run_at": "document_start"  // Still reliable in manifest declaration
    }
  ]
}
```

Avoid `chrome.scripting.executeScript` for anything timing-sensitive.

## 6. The `host_permissions` Split

MV2 combined `permissions` and `host_permissions` in one array. MV3 separates them. This isn't just a syntax change — it affects the install warning dialog.

Extensions with `host_permissions: ["<all_urls>"]` show a scary install warning. Extensions that request host permissions for specific domains show domain-specific warnings. Be intentional about which hosts you actually need:

```json
// ❌ Request only if truly needed for all sites
"host_permissions": ["<all_urls>"]

// ✅ Only request what you use
"host_permissions": [
  "https://api.example.com/*",
  "https://extensionpay.com/*"
]
```

For my extensions that genuinely need all-host access (content scripts that run on user-chosen pages), I keep `<all_urls>` and explain it in the CWS listing.

## 7. `eval()` and `new Function()` Are Forbidden

MV3 enforces a strict Content Security Policy that disallows `eval()` and `new Function()`. This breaks several popular libraries that use dynamic code execution internally — including some older versions of template engines and math expression parsers.

Check your dependencies. The error is a CSP violation logged to the console, easy to miss during development if you're not looking for it.

## 8. The `offscreen` API Is for Background Media

MV3 removed background pages entirely, which broke extensions that needed a persistent DOM context (e.g., to play audio, use the Clipboard API, or parse HTML). The `offscreen` document API is the replacement:

```typescript
async function ensureOffscreenDocument(): Promise<void> {
  const existing = await chrome.offscreen.hasDocument();
  if (!existing) {
    await chrome.offscreen.createDocument({
      url: 'offscreen.html',
      reasons: [chrome.offscreen.Reason.CLIPBOARD],
      justification: 'Clipboard operations require a DOM context',
    });
  }
}
```

The offscreen document is a hidden page that provides a DOM context for background operations. It has the same limitations as service workers (no user-visible UI) but can use DOM APIs.

## The Actual Impact

Most of these issues are solvable with a few patterns. The real cost is that MV3 requires more defensive programming. You can't assume your background context is alive, you can't use in-memory state reliably, and you have to be more explicit about when and how you access Chrome APIs.

For simple extensions, MV3 is fine. For complex extensions with long-running operations, you need to design differently.

---

*All my extensions are MV3-native. Source and notes at dev-tools-hub.xyz.*
