---
title: "I Built a Font Inspector Chrome Extension That Actually Identifies Japanese Fonts"
published: true
publish_date: "2026-04-18"
devto_id: "3519753"
tags: ["chrome","javascript","webdev","css"]
---

There is a specific frustration that every frontend developer knows: you open a Japanese website, see a beautiful typeface, open DevTools, and `font-family` gives you `"Hiragino Kaku Gothic ProN", "Noto Sans JP", "Meiryo", sans-serif`. Which of those is actually rendering?

The browser picks the first available font from the stack. DevTools tells you the declared stack, not the resolved font. For Latin scripts this is usually fine — most machines have similar system fonts. For Japanese, it matters a lot. The difference between Noto Sans JP and Hiragino Kaku Gothic ProN is significant to a designer.

So I built Japanese Font Finder to answer that question in one click.

## What It Does

**Japanese Font Finder** is a Chrome extension that lets you click any element on a page and get:

- The **actually rendered font** (not the declared stack)
- Full computed styles: size, weight, line-height, letter-spacing
- Color and background color in HEX
- Whether it's a web font, and which service serves it (Google Fonts, Adobe Fonts, etc.)
- Copy-ready CSS `font-family` syntax

For pages with multiple typefaces, there's also a page scan mode (Ctrl+Shift+A) that lists every distinct font in use.

## The Core Technical Problem

Determining which font is actually rendering is harder than it sounds. The CSS `font-family` property is a prioritized list; the browser tries each one and uses the first it can load. `window.getComputedStyle().fontFamily` still returns the full declared list, not the winner.

The standard solution is a Canvas-based width comparison:

```typescript
function isFontAvailable(fontName: string): boolean {
  const fallbackFonts = ['serif', 'sans-serif', 'monospace'];
  if (fallbackFonts.includes(fontName.toLowerCase())) return true;

  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) return false;

  // Use Japanese characters in the test string — critical for CJK fonts
  const testText = 'abcdefghijklmnopqrstuvwxyz0123456789日本語テスト';

  for (const baseFont of ['monospace', 'sans-serif', 'serif']) {
    ctx.font = `72px ${baseFont}`;
    const baseWidth = ctx.measureText(testText).width;

    ctx.font = `72px "${fontName}", ${baseFont}`;
    const testWidth = ctx.measureText(testText).width;

    if (baseWidth !== testWidth) return true;
  }
  return false;
}
```

The key insight: include Japanese characters in your test string. Canvas glyph rendering for CJK fonts differs enough from Latin fallbacks to produce width differences even when the font family name matches a system font.

Walk the declared stack, check each font with this method, and return the first available one.

## Handling Web Font Detection

For web fonts it's not enough to know the name — you want to know the service. I detect this by inspecting loaded stylesheets:

```typescript
function detectWebFontService(): WebFontService | null {
  const sheets = Array.from(document.styleSheets);
  for (const sheet of sheets) {
    try {
      const href = sheet.href ?? '';
      if (href.includes('fonts.googleapis.com')) return 'google-fonts';
      if (href.includes('use.typekit.net')) return 'adobe-fonts';
      if (href.includes('fonts.bunny.net')) return 'bunny-fonts';
    } catch {
      // Cross-origin stylesheet — skip
    }
  }
  return null;
}
```

Cross-origin stylesheets throw a SecurityError when you try to read `cssRules`, so you have to catch and skip. The `href` check is safe and catches the major services.

## Multi-Script Font Analysis

One feature I added later: full-page font scanning that groups results by script system. Japanese pages often use different fonts for CJK characters vs. Latin text — the `unicode-range` descriptor in `@font-face` handles this. The scan surfaces these distinctions so you see the complete picture.

```typescript
async function scanPageFonts(): Promise<MultiScriptFontResult> {
  const walker = document.createTreeWalker(
    document.body,
    NodeFilter.SHOW_ELEMENT
  );

  const fontSet = new Map<string, FontInfo>();
  let node: Node | null;

  while ((node = walker.nextNode())) {
    const el = node as HTMLElement;
    // Skip invisible elements
    const style = getComputedStyle(el);
    if (style.display === 'none' || style.visibility === 'hidden') continue;

    const info = detectFont(el);
    const key = `${info.renderedFont}::${info.fontSize}::${info.fontWeight}`;
    if (!fontSet.has(key)) {
      fontSet.set(key, info);
    }
  }

  return {
    fonts: Array.from(fontSet.values()),
    count: fontSet.size,
  };
}
```

## The Japanese Font Problem Specifically

Most font detection tools are built for Latin scripts. Japanese is different in a few ways:

1. **System fonts vary by OS**: macOS has Hiragino. Windows has Meiryo and Yu Gothic. Android has Noto. iOS Safari renders San Francisco/Helvetica Neue for Latin but Hiragino for CJK.

2. **Font stacks are long**: A well-written Japanese font stack might be 8-10 fonts deep to handle macOS/Windows/Linux/mobile consistently.

3. **Subsetting is common**: Web fonts for Japanese are often subset by unicode-range to avoid loading 10MB+ files. The `Noto Sans JP` you see on a page might actually be a subset that only covers hiragana/katakana.

Japanese Font Finder surfaces all of this: which font is rendering, whether it's a web font subset, and what the fallback chain looks like.

## Keyboard Shortcuts

- **Ctrl+Shift+F** (Cmd+Shift+F on Mac): Toggle click-to-inspect mode
- **Ctrl+Shift+A** (Cmd+Shift+A): Full page font scan

The extension is available on the Chrome Web Store. If you do any work with Japanese typography — or just want a faster way to inspect fonts on any page — give it a try.

---

*Built with TypeScript + Vite. Canvas API for font detection, TreeWalker for page scanning.*
