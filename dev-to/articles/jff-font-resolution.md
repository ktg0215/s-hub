---
title: "How to Detect Which Font Is Actually Rendering in a Browser (Not Just the CSS Stack)"
published: true
tags: ["webdev","css","javascript","fonts"]
series: null
canonical_url: null
publish_date: "2026-06-27"
devto_id: "3960053"
---

`getComputedStyle(element).fontFamily` returns the CSS declaration: `"Hiragino Kaku Gothic ProN", "Yu Gothic", "Noto Sans JP", sans-serif`. That's not the font that rendered. It's a priority list. The browser picks the first one that's available and contains a glyph for the character being rendered.

For Latin text, this distinction usually doesn't matter — Windows, macOS, and Linux have converged on a small set of common system fonts. For Japanese, it matters enormously. The visual weight, stroke contrast, and letterform style of Hiragino, Yu Gothic, and Noto Sans JP are genuinely different. A site designed on macOS (where Hiragino is the system Japanese font) looks different on Windows (where Yu Gothic is the fallback).

Here's how to figure out what's actually rendering, and what I learned building [Japanese Font Finder](https://chromewebstore.google.com/detail/jff/ageolfjmheacenbkgiahlkhkogcnocip) to automate it.

---

## Why `getComputedStyle` Doesn't Answer the Question

`getComputedStyle(el).fontFamily` gives you the cascade result — what the browser received after applying all CSS rules. But it doesn't tell you which entry in the stack was selected.

The underlying question is: does this font exist on this system, and does it have a glyph for this specific character?

For Japanese, both conditions matter. A font might exist on the system but only cover a subset of kanji (common with CJK fonts that split across multiple files). The browser will use that font for characters it covers, and fall back for others.

## Canvas-Based Font Detection

The classical technique uses a `<canvas>` element to measure text rendered with each font in the stack:

```javascript
function getFallbackWidth(canvas, char) {
  const ctx = canvas.getContext('2d');
  ctx.font = `16px monospace`; // known-available baseline
  return ctx.measureText(char).width;
}

function testFont(fontName, char) {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  ctx.font = `16px "${fontName}", monospace`;
  return ctx.measureText(char).width;
}

function isAvailable(fontName, testChar = '中') {
  const canvas = document.createElement('canvas');
  const baseline = getFallbackWidth(canvas, testChar);
  const withFont = testFont(fontName, testChar);
  return withFont !== baseline;
}
```

The idea: if the font you requested is not available, the browser falls back to `monospace`. If the width differs from the `monospace` width, the requested font was used. If it's the same, it wasn't found.

The weakness: fonts can have identical glyph widths for certain characters by coincidence. You need to test multiple characters to reduce false positives, and some edge cases remain.

## The `document.fonts` API

Modern browsers expose a CSS Font Loading API that's cleaner for checking font availability:

```javascript
async function isFontLoaded(fontName) {
  await document.fonts.ready;
  return document.fonts.check(`16px "${fontName}"`);
}
```

`document.fonts.check()` returns `true` if the font is loaded and ready to use. But it has a subtlety: it only considers fonts that have been *requested* — either via `@font-face` declarations or because text using that font has actually rendered. System fonts often register as available without needing an explicit load.

For web fonts, you can iterate the loaded FontFaces:

```javascript
async function getLoadedWebFonts() {
  await document.fonts.ready;
  const fonts = [];
  document.fonts.forEach(face => {
    fonts.push({
      family: face.family,
      weight: face.weight,
      style: face.style,
      status: face.status, // 'loaded' | 'loading' | 'error'
      source: face.toString(), // includes the URL for web fonts
    });
  });
  return fonts;
}
```

This gives you the web fonts. System fonts won't appear here.

## Combining Both Approaches for an Element

To find the actual font rendering on a specific element, you need to:

1. Get the computed font stack for the element
2. Parse the font family list
3. Check each font in order until you find one that's available

```javascript
function parseComputedFontFamilies(element) {
  const computed = getComputedStyle(element).fontFamily;
  // CSS font-family values can be quoted or unquoted, comma-separated
  return computed.split(',').map(f => f.trim().replace(/^["']|["']$/g, ''));
}

async function resolveActualFont(element) {
  const families = parseComputedFontFamilies(element);
  
  // First pass: check document.fonts (catches web fonts)
  await document.fonts.ready;
  for (const family of families) {
    if (document.fonts.check(`16px "${family}"`)) {
      return { family, source: 'css-font-loading-api' };
    }
  }

  // Second pass: canvas fingerprinting for system fonts
  const testChar = getTestChar(element); // pick a char from the element's text
  for (const family of families) {
    if (isAvailable(family, testChar)) {
      return { family, source: 'canvas-fingerprint' };
    }
  }

  return { family: families[families.length - 1], source: 'fallback' };
}
```

For the test character, using a character actually present in the element text gives the most accurate result — a font might have Latin coverage but not CJK coverage.

## The Character-Level Problem

Font resolution in browsers is actually per-character, not per-element. A single `<p>` element mixing Latin and Japanese text might render Latin characters in one font and kanji in another, even within the same `font-family` declaration.

```html
<p style="font-family: 'Helvetica Neue', 'Hiragino Kaku Gothic ProN', sans-serif;">
  Hello 世界
</p>
```

"Hello" renders in Helvetica Neue (Latin coverage). "世界" renders in Hiragino Kaku Gothic ProN (Helvetica Neue has no CJK glyphs). Two fonts, one element.

To handle this accurately, you'd need to test per-character range. In practice, JFF uses a heuristic: test with a representative CJK character for Japanese text, and with a Latin character for mixed content.

## Content Script Constraints

If you're building this into a Chrome extension content script, a few constraints apply:

**Canvas is available**: Content scripts can create DOM elements including canvas. No issues.

**`document.fonts` is available**: The content script shares the page's window context, so `document.fonts` reflects fonts loaded on the page.

**No access to font files**: Content scripts can't read font binary data from the OS or from remote font URLs. You can detect that "Hiragino Kaku Gothic ProN" is rendering, but you can't read the font's metadata from within the content script.

**For font metadata**: Build a local lookup table. Japanese Font Finder ships a static JSON database of ~300 Japanese fonts with their vendor, category, license type, and commercial links. When a font is identified, it's looked up in the database. No API call required.

---

The full implementation is in [Japanese Font Finder](https://chromewebstore.google.com/detail/jff/ageolfjmheacenbkgiahlkhkogcnocip) — hover any text on a Japanese page to see the resolved font with metadata. Free on Chrome Web Store.

What's the hairiest font detection edge case you've run into? The character-level fallback mixing is what bit me most — Japanese + emoji in the same element is a particular mess.
