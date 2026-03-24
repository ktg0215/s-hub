---
title: "I Built a Chrome Extension That Identifies Japanese Fonts on Any Web Page"
published: false
tags: ["chromeextension", "fonts", "css", "webdev"]
series: null
canonical_url: null
publish_date: "2026-04-12"
devto_id: null
---

If you have ever inspected a Japanese website and tried to figure out which font is being used, you know the pain. You open DevTools, find the element, look at the computed `font-family`, and see something like `"Hiragino Kaku Gothic ProN", "Yu Gothic", "Meiryo", sans-serif`. That tells you the CSS declaration, but not which font is actually rendering on screen. And even if you figure that out, you might not know whether it is a system font, a Google Font, or a commercial font from Morisawa or Fontworks.

I built **Japanese Font Finder** to solve this problem. It is a Chrome extension that lets you hover over any text element on a web page and instantly see which font is actually being rendered, with detailed metadata for Japanese fonts -- including the Japanese name, category, vendor, license type, and links to download or purchase the font.

The extension ships with a database of over 150 Japanese fonts covering system fonts across Windows, macOS, and Linux, over 60 Google Fonts with Japanese support, and commercial fonts from Morisawa, Fontworks, TypeBank, Iwata, and other major Japanese type foundries.

## The Core Problem: CSS font-family vs. Rendered Font

The fundamental technical challenge is the gap between what CSS declares and what the browser actually renders. A typical Japanese website might have this in its stylesheet:

```css
body {
  font-family: "Noto Sans JP", "Hiragino Kaku Gothic ProN",
               "Yu Gothic", "Meiryo", sans-serif;
}
```

This is a font stack -- an ordered list of preferences. The browser walks down the list and uses the first font that is available on the user's system. If the user is on macOS, they will probably see Hiragino Kaku Gothic ProN. On Windows, Yu Gothic or Meiryo. If the page loads Noto Sans JP from Google Fonts, that one wins.

`window.getComputedStyle(element).fontFamily` only gives you back the CSS declaration, not the rendered result. To figure out which font is actually being used, you need a different approach.

## Font Detection via Canvas Measurement

The technique I use is Canvas-based font detection. The idea is simple: render a test string in the candidate font and in a known baseline font, then compare the measured widths. If they differ, the candidate font is available and being used.

```typescript
function isFontAvailable(fontName: string): boolean {
  const fallbackFonts = [
    'serif', 'sans-serif', 'monospace',
    'cursive', 'fantasy', 'system-ui'
  ];
  if (fallbackFonts.includes(fontName.toLowerCase())) {
    return true;
  }

  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');
  if (!context) return false;

  const testText =
    'abcdefghijklmnopqrstuvwxyz0123456789日本語テスト';
  const baseFonts = ['monospace', 'sans-serif', 'serif'];

  for (const baseFont of baseFonts) {
    context.font = `72px ${baseFont}`;
    const baselineWidth = context.measureText(testText).width;

    context.font = `72px "${fontName}", ${baseFont}`;
    const testWidth = context.measureText(testText).width;

    if (baselineWidth !== testWidth) {
      return true;
    }
  }

  return false;
}
```

A few important details:

1. **The test string includes both Latin and Japanese characters.** Some fonts only cover one script, so testing with both prevents false negatives. If a font only has Japanese glyphs, the Latin characters will fall through to the baseline, but the Japanese characters will cause a width difference.

2. **We test against multiple baselines.** A font might happen to have the same metrics as one baseline but not others. Testing against monospace, sans-serif, and serif catches more cases.

3. **We use a large font size (72px).** Larger sizes amplify width differences, making detection more reliable. At small sizes, subpixel rounding could mask a genuine difference.

4. **Generic font families are skipped.** If the candidate is `sans-serif`, `serif`, or another CSS generic, we just report it as-is since there is nothing to measure against.

The `detectFont` function wraps this into a complete pipeline that extracts all typography information from an element:

```typescript
export function detectFont(element: HTMLElement): FontInfo {
  const styles = window.getComputedStyle(element);

  return {
    fontFamily: styles.fontFamily,
    renderedFont: getRenderedFont(element, styles.fontFamily),
    fontSize: styles.fontSize,
    fontWeight: styles.fontWeight,
    fontStyle: styles.fontStyle,
    lineHeight: styles.lineHeight,
    letterSpacing: styles.letterSpacing,
    color: styles.color,
    colorHex: rgbToHex(styles.color),
    backgroundColor: getBackgroundColor(element),
    backgroundColorHex: rgbToHex(getBackgroundColor(element)),
    isWebFont: detectWebFont(styles.fontFamily),
    webFontService: detectWebFontService(),
  };
}
```

## Multi-Script Font Detection: Japanese vs. Latin

One of the most interesting challenges in Japanese web typography is that many sites use different fonts for Japanese and Latin characters. A CSS font stack like `Arial, "Hiragino Sans", sans-serif` will render English text in Arial but Japanese text in Hiragino Sans, because Arial does not contain Japanese glyphs.

The Pro version of the extension includes a multi-script detection feature that separately identifies which font is rendering Japanese characters and which is rendering Latin characters:

```typescript
export function detectMultiScriptFonts(
  _element: HTMLElement, fontStack: string
): MultiScriptFontResult {
  const fonts = fontStack.split(',')
    .map(f => f.trim().replace(/['"]/g, ''));

  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');
  if (!context) {
    return {
      japanese: null, latin: null, isMultiScript: false
    };
  }

  const japaneseTest = '日本語テスト東京あいう';
  const latinTest = 'ABCDEFGHabcdefgh0123456789';

  let japaneseFont: string | null = null;
  let latinFont: string | null = null;

  for (const font of fonts) {
    for (const baseFont of baseFonts) {
      context.font = `72px ${baseFont}`;
      const jaBase = context.measureText(japaneseTest).width;
      const latBase = context.measureText(latinTest).width;

      context.font = `72px "${font}", ${baseFont}`;
      const jaTest = context.measureText(japaneseTest).width;
      const latTest = context.measureText(latinTest).width;

      if (!japaneseFont && jaBase !== jaTest) {
        japaneseFont = font;
      }
      if (!latinFont && latBase !== latTest) {
        latinFont = font;
      }

      if (japaneseFont && latinFont) break;
    }
    if (japaneseFont && latinFont) break;
  }

  return {
    japanese: japaneseFont,
    latin: latinFont,
    isMultiScript: japaneseFont !== null
      && latinFont !== null
      && japaneseFont !== latinFont,
  };
}
```

The key insight is that we use separate test strings for each script and walk through the font stack independently. The first font in the stack that affects the width of the Japanese test string is the one rendering Japanese text. The first one that affects the Latin test string handles Latin text. If they are different, we flag it as a multi-script configuration.

## The Japanese Font Database

The extension includes a curated database of over 150 Japanese fonts organized into three categories: system fonts, Google Fonts, and commercial fonts.

Each entry includes metadata relevant to designers and developers:

```typescript
// System fonts (Windows, macOS, Linux)
'Noto Sans JP': {
  ja: 'Noto Sans JP',
  category: 'Gothic',
  license: 'open-source',
  commercialUse: true,
  downloadUrl: 'https://fonts.google.com/...'
},

// Commercial fonts (Morisawa)
'A-OTF Shin Go Pro': {
  ja: 'Shin Go',
  vendor: 'Morisawa',
  category: 'Gothic',
  license: 'commercial',
  commercialUse: false,
  price: 'Included in Morisawa Passport'
},
```

The system font section covers fonts bundled with Windows (Yu Gothic, Meiryo, BIZ UD Gothic, UD Digi Kyokasho, and more), macOS (Hiragino Sans, Hiragino Mincho, Toppan Bunkyu, Klee, and more), and Linux (IPA Gothic, Takao, VL Gothic, Sazanami, and more).

The Google Fonts section includes the Noto family, M PLUS family, Kosugi, Sawarabi, Shippori, Zen, Kaisei, Yuji, and dozens of display and handwriting fonts.

The commercial section covers major Japanese type foundries: Morisawa (Shin Go, Ryumin, Gothic MB101), Fontworks (Tsukushi, Rodin, Matisse), TypeBank, Iwata, Motoya, and Screen (Hiragino).

Font name lookup supports both exact matching and partial matching, because font names appear in different formats across different contexts:

```typescript
export function getJapaneseFontInfo(
  fontName: string
): JapaneseFontInfo | null {
  const normalized = fontName.replace(/['"]/g, '').trim();

  for (const category of Object.values(JAPANESE_FONTS)) {
    if (category[normalized]) {
      return category[normalized];
    }
  }

  for (const category of Object.values(JAPANESE_FONTS)) {
    for (const [key, value] of Object.entries(category)) {
      if (normalized.includes(key) || key.includes(normalized)) {
        return value;
      }
    }
  }

  return null;
}
```

## Web Font Service Detection

The extension detects which web font service a page is using by looking for characteristic elements in the DOM:

```typescript
function detectWebFontService(): WebFontService | undefined {
  const googleFontsLink = document.querySelector(
    'link[href*="fonts.googleapis.com"]'
  );
  if (googleFontsLink) return 'google';

  const adobeScript = document.querySelector(
    'script[src*="use.typekit.net"]'
  );
  if (adobeScript) return 'adobe';

  const typeSquareScript = document.querySelector(
    'script[src*="typesquare.com"]'
  );
  if (typeSquareScript) return 'typesquare';

  const fontPlusScript = document.querySelector(
    'script[src*="fontplus.jp"]'
  );
  if (fontPlusScript) return 'fontplus';

  return undefined;
}
```

This covers the four main web font services used in Japan: Google Fonts, Adobe Fonts (Typekit), TypeSquare (by Morisawa), and FONTPLUS (by SB Technology). Knowing the service helps users understand the licensing situation -- a font served via Google Fonts is free to use, while one from TypeSquare requires a subscription.

## The Inspector UI: Hover, Click, Scan

The extension has three interaction modes:

**Hover mode** activates when you click the extension icon or press `Ctrl+Shift+F`. Moving your mouse over any text element shows a tooltip with the font name, size, weight, and color. The element gets a visual highlight so you can see exactly what you are inspecting.

**Click mode** captures a click on the hovered element and opens a detailed panel with the full font information, Japanese name, category, web font service, similar font suggestions, font pairing recommendations, and links to download or purchase the font.

**Page scan mode** (`Ctrl+Shift+A`) scans every text element on the page and produces a summary of all fonts used, sorted by frequency of use. This is useful for getting a quick overview of a site's typography system.

The content script manages these modes with clean activation and deactivation:

```typescript
function activateInspector(): void {
  document.body.classList.add('jff-active');
  tooltip = createTooltip();

  document.addEventListener('mouseover', handleMouseOver, true);
  document.addEventListener('mouseout', handleMouseOut, true);
  document.addEventListener('click', handleClick, true);
  document.addEventListener('keydown', handleKeyDown, true);

  refreshUsageCache();
  showActivationMessage();
}

function deactivateInspector(): void {
  document.body.classList.remove('jff-active');

  document.removeEventListener('mouseover', handleMouseOver, true);
  document.removeEventListener('mouseout', handleMouseOut, true);
  document.removeEventListener('click', handleClick, true);
  document.removeEventListener('keydown', handleKeyDown, true);

  removeTooltip();
  removeDetailPanel();
  removeHighlight();
}
```

All event listeners are registered with `useCapture: true` to intercept events before the page's own handlers, and click events call `preventDefault()` and `stopPropagation()` to prevent navigation while the inspector is active.

## Font Highlighting

There is also a font highlighting feature that visually marks all elements on the page that use a specific font. This is triggered from the popup's page scan results -- click on a font name, and every element using that font gets a colored outline:

```typescript
function highlightFontElements(fontName: string): void {
  clearFontHighlight();

  const walker = document.createTreeWalker(
    document.body,
    NodeFilter.SHOW_ELEMENT,
    null
  );

  const elements: HTMLElement[] = [];
  let node: Node | null;

  while ((node = walker.nextNode())) {
    const element = node as HTMLElement;
    if (isOwnElement(element)) continue;
    if (!hasTextContent(element)) continue;

    const style = window.getComputedStyle(element);
    if (style.fontFamily.includes(fontName)) {
      elements.push(element);
    }
  }

  elements.forEach((el, index) => {
    el.classList.add('jff-font-highlight');
    el.setAttribute(
      'data-jff-highlight-index', String(index + 1)
    );
  });

  if (elements.length > 0) {
    elements[0].scrollIntoView({
      behavior: 'smooth', block: 'center'
    });
  }
}
```

The TreeWalker API is more efficient than `querySelectorAll('*')` for traversing the DOM when you need to check computed styles on each element. It also makes it easy to skip the extension's own UI elements to avoid infinite recursion.

## Freemium with Usage Limiting

The extension uses a freemium model. Free users get 15 font detections per day. After that, a polite upgrade modal appears. The usage counter resets daily and is tracked in `chrome.storage.local`.

The usage check happens in two places: a cached synchronous check during hover (to avoid lag) and an authoritative async check on click (to prevent stale cache from allowing extra detections):

```typescript
// During hover - fast cached check
if (usageLimitReached) return;

// During click - authoritative check with increment
const response = await chrome.runtime.sendMessage({
  action: 'checkUsageLimit'
});
if (!response?.allowed) {
  usageLimitReached = true;
  hideTooltip();
  showUpgradeModal();
  return;
}
```

This two-tier approach keeps the hover experience smooth while ensuring accurate enforcement on actual font inspections.

## Internationalization

The extension supports English and Japanese through a lightweight i18n system. All user-facing strings go through a `t()` function that looks up translations based on the user's language setting:

```typescript
const overlay = document.createElement('div');
overlay.innerHTML = `
  <h2>${t('upgrade.title')}</h2>
  <p>${t('upgrade.desc')}</p>
  <button id="jff-upgrade-cta">
    ${escapeHtml(t('upgrade.cta'))}
  </button>
`;
```

All dynamic content is escaped with `escapeHtml()` before insertion to prevent XSS, even for strings that come from the extension's own translation files. Defense in depth.

## Technical Decisions and Trade-offs

**Canvas detection has limitations.** It measures text width, not individual glyphs. Two fonts with similar metrics for the test string could produce false matches. Using a longer test string with both Latin and Japanese characters minimizes this risk, but it is not eliminated.

**The font database is manually curated.** There is no API for getting the full list of fonts installed on a user's system (and for good reason -- it would be a fingerprinting vector). The database covers the fonts most commonly encountered on Japanese websites, which means obscure custom fonts might show as "unknown."

**Bundle size matters.** The Japanese font database with 150+ entries adds weight to the content script. I kept the data structure flat and avoided importing external font databases to stay under Chrome Web Store's recommended limits.

**Event capture phase is necessary.** Without `useCapture: true`, click events on links and buttons would navigate away before the extension could intercept them. The capture phase ensures the extension gets first shot at every event.

## What I Learned

Building a font inspection tool for Japanese web content revealed some interesting aspects of how browsers handle CJK typography:

1. **Font fallback in CJK is more complex than Latin.** A single element can use three different fonts for Japanese, Latin, and numeric characters, all determined by the browser's fallback behavior.

2. **Japanese web font services are a distinct ecosystem.** TypeSquare and FONTPLUS are major players in Japan but virtually unknown outside it. Supporting them matters for the target audience.

3. **Commercial font identification is valuable.** Designers often spot a font they like on a website and want to know what it is. Telling them it is Morisawa Shin Go and that they need a Morisawa Passport subscription is actionable information.

4. **The Canvas API is surprisingly useful for font detection.** It gives you rendering-level information that is not available through any other standard web API.

If you work with Japanese websites -- whether as a designer, developer, or typographer -- give it a try.

{% embed https://chromewebstore.google.com/detail/ageolfjmheacenbkgiahlkhkogcnocip %}
