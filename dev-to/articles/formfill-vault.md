---
title: "I Built a Chrome Extension That Auto-Fills Any Form — Encrypted, No Cloud"
description: "How I implemented AES-256 encrypted local storage for sensitive form data in a Chrome MV3 extension, with one-click autofill and import/export."
tags: ["chromeextension","webdev","productivity","javascript"]
published: false
publish_date: "2026-05-05"
canonical_url: ""
devto_id: "3550212"
---

I run a few side projects. The paperwork reality of running side projects is filling in the same company name, address, phone number, and tax ID into web forms, over and over, on vendor portals, invoice tools, e-commerce seller dashboards, and government registration pages.

My password manager handles login credentials. It doesn't handle business info particularly well. So I built FormFill Vault.

---

## The problem is more specific than it sounds

Password managers are great at what they do. But "what they do" is structured around credentials: username, password, maybe a TOTP. When you hit an invoice form that wants your company legal name, postal code (Japanese 7-digit format), city/ward, building, floor, room number, fax, and tax registration number — in separate fields — the auto-fill either ignores most of it or fills random fields incorrectly.

The other option is a browser profile. Browsers let you save your address. One address. In one format. That doesn't cover the seller who has three business registrations.

FormFill Vault's model is simple: you create named profiles (Personal, Work, Side Project A), fill them in once, and click a button to fill whatever form is in front of you. The extension matches fields heuristically, fires the right events for React/Vue apps, and moves on.

---

## The technical part I found interesting: storing encrypted data in chrome.storage.local

The obvious implementation is: save profiles as JSON in `chrome.storage.local`. But profiles contain business addresses and potentially invoice numbers. Storing them in plaintext felt wrong.

So I added AES-256-GCM encryption via the Web Crypto API. The implementation itself is straightforward:

```typescript
const key = await crypto.subtle.generateKey(
  { name: 'AES-GCM', length: 256 },
  true,
  ['encrypt', 'decrypt']
);
const iv = crypto.getRandomValues(new Uint8Array(12));
const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, encoded);
```

The part that tripped me up: persisting the key.

`chrome.storage.local` uses JSON serialization internally. An `ArrayBuffer` — which is what `crypto.subtle.exportKey('raw', key)` returns — serializes to `{}`. You store it, you read back an empty object, your key is gone, and all your encrypted profiles are permanently unreadable.

The fix is one line, but it's the kind of thing you only know if you've already lost data to it:

```typescript
// Broken: ArrayBuffer becomes {} in JSON
await chrome.storage.local.set({ key: exportedKeyBuffer });

// Working: serialize to plain number array before storing
await chrome.storage.local.set({
  key: Array.from(new Uint8Array(exportedKeyBuffer))
});

// On retrieval:
const keyBuffer = new Uint8Array(storedArray).buffer;
const key = await crypto.subtle.importKey('raw', keyBuffer, { name: 'AES-GCM' }, false, ['encrypt', 'decrypt']);
```

The key lives in `chrome.storage.local` as a plain number array. On every read, it's reconstructed into a `CryptoKey`. The IV is prepended to the ciphertext and stored as Base64. The key never leaves the browser.

---

## The form filling part: matching fields without a schema

The harder problem is that forms don't have a standard schema. Every vendor portal has different field names. Some use `last_name`, some use `familyName`, some use `surname`, some use Japanese `姓`.

I built a heuristic matcher that checks, in order:
1. The field's `name` and `id` attributes
2. The `placeholder` and `aria-label` text
3. The `autocomplete` attribute
4. The associated `<label for="...">` text if the field has an `id`

Each field type in the profile has a regex pattern. The address fields include Japanese kanji and katakana patterns. It's not perfect — edge cases in deeply custom enterprise portals exist — but it handles the common 80% of business forms without configuration.

One more thing: injecting values into React or Vue forms. You can't just `element.value = 'new value'` and dispatch a standard event. Those frameworks intercept the native input value setter. The fix is to use `Object.getOwnPropertyDescriptor` to get the original setter and call it directly, then dispatch both `input` and `change`:

```typescript
const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
  HTMLInputElement.prototype,
  'value'
)?.set;
nativeInputValueSetter?.call(element, value);
element.dispatchEvent(new Event('input', { bubbles: true }));
element.dispatchEvent(new Event('change', { bubbles: true }));
```

This is the standard workaround for triggering React state updates from external scripts.

---

## What the extension actually is

FormFill Vault stores up to 3 profiles on the free plan. Pro removes the limit. All encryption, autofill, and the postal code lookup (a local static dictionary — no API calls) run locally. No network requests for profile operations.

It's available on the Chrome Web Store: [FormFill Vault — link coming soon]

If you do any amount of paperwork involving the same business data across multiple sites, it's the kind of tool you don't notice until you don't have it.

---

*I'm also building [Procshot](https://chromewebstore.google.com/detail/ieblehdloggcpmkncplccjofeoakhkll) (browser workflow documentation) and other small dev tools at [dev-tools-hub.xyz](https://dev-tools-hub.xyz). These posts are technical notes from building them.*
