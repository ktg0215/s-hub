---
title: "Detecting Which AI Chat Platform You're On: URL and DOM Patterns for ChatGPT, Claude, Gemini, and Copilot"
published: false
tags: ["chrome","javascript","ai","webdev"]
series: null
canonical_url: null
publish_date: "2026-06-30"
devto_id: "3960057"
---

If you're building a Chrome extension that works with AI chat platforms — prompt injection, session export, UI customization — you need to know which platform the user is on before you do anything. A content script that injects a prompt into ChatGPT's textarea will silently fail on Claude, which has a completely different DOM.

Here's how to reliably detect the platform from a content script, with patterns that hold up through UI redesigns.

---

## Matching by URL (Tier 1: Fast and Reliable)

The fastest check: `location.hostname`. AI platforms use distinct domains with predictable structures:

```javascript
const AI_PLATFORM_HOSTS = {
  'chatgpt.com': 'chatgpt',
  'chat.openai.com': 'chatgpt',       // legacy domain
  'claude.ai': 'claude',
  'gemini.google.com': 'gemini',
  'copilot.microsoft.com': 'copilot',
  'bard.google.com': 'gemini',        // legacy redirect
  'poe.com': 'poe',
  'character.ai': 'characterai',
};

function detectPlatformByHost() {
  return AI_PLATFORM_HOSTS[location.hostname] ?? null;
}
```

This covers the common case: user is on `claude.ai`, hostname matches, platform identified. No DOM access needed.

Edge cases this misses:
- Embedded interfaces (ChatGPT embedded in other products)
- API playgrounds that aren't the primary chat UI
- White-label deployments running on custom domains

For those, fall through to DOM-based detection.

## DOM-Based Detection (Tier 2: Layout Signatures)

Each platform has distinctive DOM signatures that are more stable than class names or element IDs (which change frequently). Look for structural patterns, not implementation details:

```javascript
const PLATFORM_SIGNATURES = [
  {
    platform: 'chatgpt',
    checks: [
      () => !!document.querySelector('[data-testid="send-button"]'),
      () => !!document.querySelector('#prompt-textarea'),
      () => document.title.includes('ChatGPT'),
    ],
  },
  {
    platform: 'claude',
    checks: [
      () => !!document.querySelector('[data-placeholder*="Reply"]'),
      () => !!document.querySelector('.claude-message'),
      () => document.title.toLowerCase().includes('claude'),
    ],
  },
  {
    platform: 'gemini',
    checks: [
      () => !!document.querySelector('rich-textarea'),  // custom element
      () => document.title.includes('Gemini'),
    ],
  },
  {
    platform: 'copilot',
    checks: [
      () => !!document.querySelector('[data-testid="composer-input"]'),
      () => location.hostname.includes('copilot.microsoft.com'),
    ],
  },
];

function detectPlatformByDOM() {
  for (const sig of PLATFORM_SIGNATURES) {
    const passedChecks = sig.checks.filter(fn => {
      try { return fn(); } catch { return false; }
    });
    if (passedChecks.length >= 2) return sig.platform; // majority vote
  }
  return null;
}
```

The majority vote (requiring at least 2 checks to pass) reduces false positives when only one signature element happens to be present on an unrelated page.

Wrapping each check in `try/catch` handles DOM state issues — some checks might throw if the element doesn't exist in the way you expect.

## Combining Both Approaches

```javascript
function detectPlatform() {
  // Tier 1: URL-based (instant)
  const byHost = detectPlatformByHost();
  if (byHost) return byHost;

  // Tier 2: DOM-based (for edge cases)
  const byDOM = detectPlatformByDOM();
  return byDOM;
}
```

In practice, tier 1 handles 95%+ of real usage. Tier 2 is the safety net.

## Timing: When to Run Detection

AI chat platforms are SPAs. The initial HTML is usually a shell; the actual UI loads asynchronously. Running detection immediately on `document_start` will fail — the DOM isn't built yet.

Options:

**`document_idle` injection (simplest):**
```json
// manifest.json
"content_scripts": [{
  "matches": ["https://chatgpt.com/*", "https://claude.ai/*", "..."],
  "js": ["content.js"],
  "run_at": "document_idle"
}]
```

`document_idle` fires after `DOMContentLoaded` and after any deferred scripts run, but before images load. For most AI platforms this is sufficient — the UI is rendered by then.

**MutationObserver for SPAs:**

If the platform changes state after initial load (navigating between conversations, switching models), you need to react to DOM changes:

```javascript
const observer = new MutationObserver(() => {
  const platform = detectPlatform();
  if (platform && platform !== currentPlatform) {
    currentPlatform = platform;
    onPlatformChanged(platform);
  }
});

observer.observe(document.body, { childList: true, subtree: false });
```

`subtree: false` is intentional here — you only need to detect major layout changes, not every DOM mutation inside the conversation thread.

## Finding the Input Textarea

Once you know the platform, you need the textarea to inject a prompt:

```javascript
const INPUT_SELECTORS = {
  chatgpt: [
    '#prompt-textarea',
    'div[contenteditable="true"][data-id="root"]',
  ],
  claude: [
    'div[contenteditable="true"].ProseMirror',
    '[data-placeholder*="Reply to Claude"]',
  ],
  gemini: [
    'rich-textarea .ql-editor',
    'div[contenteditable="true"].textarea',
  ],
  copilot: [
    'textarea[data-testid="composer-input"]',
    'cib-text-input textarea',
  ],
};

function getInputElement(platform) {
  const selectors = INPUT_SELECTORS[platform] ?? [];
  for (const selector of selectors) {
    const el = document.querySelector(selector);
    if (el) return el;
  }
  return null;
}
```

ContentEditable divs (used by Claude and Gemini) need different injection code than standard textareas:

```javascript
function injectPrompt(element, text) {
  if (element.tagName === 'TEXTAREA') {
    // Standard textarea
    element.value = text;
    element.dispatchEvent(new Event('input', { bubbles: true }));
  } else if (element.contentEditable === 'true') {
    // ContentEditable (ProseMirror, Quill, etc.)
    element.focus();
    document.execCommand('selectAll', false, null);
    document.execCommand('insertText', false, text);
  }
}
```

`document.execCommand` is technically deprecated but remains the most reliable way to trigger React/Vue reactivity on contentEditable elements. The synthetic event approach (`new InputEvent('input', { data: text, bubbles: true })`) doesn't consistently trigger framework state updates.

## Handling Page Navigation in SPAs

ChatGPT and Claude both navigate without page reloads (new conversation = SPA navigation, not a full reload). Your detection logic needs to handle this:

```javascript
let currentPlatform = detectPlatform();
let lastUrl = location.href;

const navObserver = new MutationObserver(() => {
  if (location.href !== lastUrl) {
    lastUrl = location.href;
    // Re-run detection after navigation
    setTimeout(() => {
      currentPlatform = detectPlatform();
    }, 500); // brief delay for new route to render
  }
});

navObserver.observe(document, { subtree: true, childList: true });
```

---

This is the detection layer under [PromptStash](https://chromewebstore.google.com/detail/promptstash/ocgkponbnolpgobllplcamfobolbjbcj) — a Chrome extension for saving and reusing prompts across AI platforms. One shortcut inserts your saved prompt wherever you are.

What platform-specific quirks have you run into? The Gemini `<rich-textarea>` custom element was the most surprising — it wraps a Quill editor inside a shadow DOM subtree, which breaks standard querySelector behavior.
