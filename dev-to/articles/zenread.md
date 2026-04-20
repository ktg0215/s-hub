---
title: "How to Add Reader Mode to Chrome - Free Distraction-Free Extension"
published: true
tags: ["chromeextension","reading","productivity","webdev"]
series: null
canonical_url: null
publish_date: "2026-03-26"
main_image: "https://dev-tools-hub.xyz/screenshots/zenread/screenshot-01.png"
devto_id: "3392118"
---

You know that feeling when you open a long article in Chrome, and the actual content is drowning in sidebar ads, navigation menus, newsletter popups, and "recommended for you" widgets? You just want to read the article. That's it. Just the words.

Safari has a built-in reader mode. Firefox has one too -- it's been there for years, powered by Mozilla's own Readability.js. But Chrome? The world's most popular browser? Nothing stable. There's been an experimental flag buried in `chrome://flags` for a while, but it's unreliable, feature-limited, and not something you'd trust for daily use.

So I built my own.

**ZenRead** is a Chrome extension that gives you a proper reader mode with accessibility features, bionic reading, text-to-speech, and site-specific content extraction rules. It started as a weekend project to scratch my own itch, and it turned into something I use every single day.

{% embed https://chromewebstore.google.com/detail/zenread/adoiakplckmoahmiainobfpmdomnhomj %}

## The Core: Extracting Content with Readability.js

The heart of any reader mode is content extraction -- figuring out which part of the page is the actual article and throwing away everything else. I didn't want to reinvent the wheel here, so I reached for `@mozilla/readability`, the same library that powers Firefox's reader mode.

The basic extraction looks like this:

```typescript
import { Readability, isProbablyReaderable } from '@mozilla/readability';
import DOMPurify from 'dompurify';

export function extractArticle(doc: Document = document): ArticleData | null {
  // Clone document to prevent modification
  const clone = doc.cloneNode(true) as Document;

  const reader = new Readability(clone, {
    charThreshold: 500,
    keepClasses: false,
    disableJSONLD: false,
  });

  const article = reader.parse();
  if (!article) return null;

  // Sanitize content
  const sanitizedContent = DOMPurify.sanitize(article.content, {
    USE_PROFILES: { html: true },
    FORBID_TAGS: ['script', 'style', 'iframe', 'form', 'input', 'button'],
    FORBID_ATTR: ['onerror', 'onload', 'onclick', 'onmouseover'],
  });

  return {
    title: article.title,
    content: sanitizedContent,
    textContent: article.textContent,
    estimatedReadTime: Math.max(1, Math.ceil(
      article.textContent.split(/\s+/).filter(Boolean).length / 265
    )),
    // ...other fields
  };
}
```

Two things to note here:

1. **Always clone the document first.** Readability mutates the DOM during parsing. If you pass in the live document, it'll destroy the page. `doc.cloneNode(true)` gives you a safe copy to work with.

2. **Always sanitize the output.** The extracted HTML still comes from an untrusted source. DOMPurify strips out `<script>`, `<iframe>`, event handler attributes, and other vectors. You're injecting this HTML into the page, so XSS protection isn't optional.

The reading time estimate assumes 265 words per minute for English, which is the widely-cited average for adult reading speed.

## When Readability Isn't Enough: Site-Specific Rules

Readability.js does a remarkable job on most pages, but some sites have unusual DOM structures that trip it up. Medium wraps articles in deeply nested sections. Wikipedia has navigation boxes mixed into the content. News sites embed ad containers between paragraphs.

To handle these cases, I added a site-specific rule system:

```typescript
interface SiteRule {
  contentSelector?: string;
  titleSelector?: string;
  authorSelector?: string;
  preRemove?: string[];
}

const siteRules: Record<string, SiteRule> = {
  'medium.com': {
    contentSelector: 'article section',
    titleSelector: 'h1',
    authorSelector: 'a[data-testid="authorName"]',
    preRemove: ['.metabar', '.post-actions', '.js-postShareWidget']
  },
  'wikipedia.org': {
    contentSelector: '#mw-content-text .mw-parser-output',
    titleSelector: '#firstHeading',
    preRemove: [
      '.mw-editsection', '.navbox', '.vertical-navbox',
      '#toc', '.hatnote', '.noprint'
    ]
  },
  'nytimes.com': {
    contentSelector: 'article[data-testid="article-body"]',
    titleSelector: 'h1[data-testid="headline"]',
    preRemove: ['[data-testid="inline-message"]', '.ad']
  },
  'arstechnica.com': {
    contentSelector: 'article[itemprop="articleBody"]',
    titleSelector: 'h1[itemprop="headline"]',
    preRemove: [
      '.gallery-overlay', '.sidebar', '.ad-wrapper',
      '.promoted-content', '.related-articles'
    ]
  },
  // ...more rules
};
```

The key trick is `preRemove`. Before passing the document to Readability, I remove elements that I know are noise for that site -- sidebars, footers, ad wrappers, related article blocks. This dramatically improves extraction accuracy on sites where generic heuristics fail.

Is it fragile? A little. Sites change their DOM, and selectors can break. But in practice, the major sites update their structure infrequently, and the fallback to vanilla Readability still works fine when selectors go stale.

## Bionic Reading (Focus Bold)

This is one of the features I didn't expect to use so much myself. Bionic reading (I call it "Focus Bold" in the extension) bolds the first portion of each word. The idea is that your brain recognizes words by their initial letters, so bolding those letters creates artificial fixation points that guide your eyes through the text faster.

The implementation is straightforward: walk through the text nodes, split each word, and wrap the first N% of characters in `<b>` tags. The bold ratio is configurable from 30% to 70% via a slider.

Does it actually make you read faster? The research is mixed. But anecdotally, I find it reduces the "zoning out" effect when reading long technical articles. My eyes have anchor points to latch onto, and I lose my place less often. Your mileage may vary, and that's why it's an opt-in toggle (Alt+B).

## Text-to-Speech: Fighting Chrome's 14-Second Bug

TTS was the feature that gave me the most headaches. The Web Speech API is conceptually simple -- create a `SpeechSynthesisUtterance`, call `speechSynthesis.speak()`, done. But Chrome has a well-known bug where synthesis stops after roughly 14 seconds of continuous speech.

The workaround is a timer that calls `pause()` followed by `resume()` every 10 seconds:

```typescript
speak(text: string, options: WebSpeechOptions = {}): Promise<void> {
  return new Promise((resolve, reject) => {
    this.synth.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.voice = options.voice || this.getBestVoice(options.lang);
    utterance.rate = options.rate ?? 1.0;
    utterance.lang = options.lang || 'en-US';

    utterance.onend = () => {
      this.clearWorkaround();
      resolve();
    };

    // Chrome 14-second bug workaround
    this.resumeInterval = setInterval(() => {
      if (this.synth.speaking && !this.synth.paused) {
        this.synth.pause();
        this.synth.resume();
      }
    }, 10000);

    this.synth.speak(utterance);
  });
}
```

This bug has been open in Chromium's issue tracker for years. The `pause()/resume()` workaround is ugly but effective.

Beyond the Chrome bug, there are a few other things the TTS pipeline handles:

**Text preprocessing.** Before sending text to the Speech API, URLs get replaced with the word "link", email addresses become "email address", and common abbreviations get expanded (`e.g.` becomes "for example", `Dr.` becomes "Doctor"). This prevents the synthesizer from trying to spell out URLs character by character.

**Chunking.** Long articles get split into chunks at natural sentence boundaries. Each chunk is spoken sequentially, which gives you progress tracking and prevents the Speech API from choking on a 10,000-word wall of text.

**Voice selection.** Not all system voices are created equal. The extension prioritizes high-quality voices (Microsoft Natural voices, Google voices) over low-quality ones, and filters out novelty voices like "Zarvox" or "Whisper" that would ruin the listening experience.

```typescript
getBestVoice(lang: string = 'en-US'): SpeechSynthesisVoice | null {
  const langCode = lang.split('-')[0].toLowerCase();

  const priorities: Record<string, RegExp[]> = {
    'en': [
      /Microsoft.*Natural/i,
      /Microsoft.*Aria/i,
      /Google.*US.*English/i,
      /Samantha.*(Premium|Enhanced)/i,
      /Samantha/i,
    ],
    // ...other languages
  };

  const matchingVoices = this.voices.filter(v =>
    v.lang.toLowerCase().startsWith(langCode)
  );

  for (const pattern of (priorities[langCode] || priorities['en'])) {
    const match = matchingVoices.find(v => pattern.test(v.name));
    if (match) return match;
  }

  // Prefer remote (cloud) voices over local ones
  return matchingVoices.find(v => !v.localService) || matchingVoices[0] || null;
}
```

## Injecting React into Any Web Page

Running a React app inside a content script isn't as straightforward as it sounds. Content scripts share the page's DOM but have their own JavaScript execution context. Here's the approach I landed on:

1. Create a `<div id="zenread-root">` and append it to `document.body`
2. Mount React with `createRoot` on that div
3. Inject a `<style>` tag into `document.head` with all the reader styles
4. Set `z-index: 2147483647` (the max 32-bit integer) to overlay everything

```typescript
async function injectReader() {
  if (document.querySelector('#zenread-root')) return;
  if (!isReadable()) return;

  const article = extractArticle();
  if (!article) return;

  const root = document.createElement('div');
  root.id = 'zenread-root';
  document.body.appendChild(root);

  injectStyles();

  const reactRoot = createRoot(root);
  reactRoot.render(
    <React.StrictMode>
      <ReaderWrapper article={article} initialSettings={settings} />
    </React.StrictMode>
  );
}
```

The content script itself is built separately with esbuild as an IIFE (immediately invoked function expression), while the popup and welcome pages go through Vite's standard build pipeline. This separation keeps the content script bundle lean and avoids conflicts with the host page's module system.

One lesson I learned: use the maximum z-index. Some sites (looking at you, cookie consent banners) use absurdly high z-index values. `2147483647` is the largest value a 32-bit integer can hold, so nothing on the page can appear above the reader overlay.

## Accessibility Features

I wanted ZenRead to be more than just a "hide the sidebar" tool. Reading difficulties are real, and a few features can make a meaningful difference:

- **Dyslexia-friendly fonts**: OpenDyslexic, Lexie Readable, and Comic Neue as font options. These fonts have weighted bottoms and distinct letter shapes that reduce character confusion.
- **Color overlays**: Semi-transparent tinted filters (yellow, blue, pink, green, peach, lavender) that can reduce visual stress for readers with Irlen syndrome or light sensitivity.
- **Reading ruler**: A highlight bar that follows your cursor position, helping you track which line you're on. Useful for anyone who tends to lose their place in dense paragraphs.
- **Letter and word spacing**: Adjustable from normal to widest. Increased spacing has been shown to improve reading speed for people with dyslexia.

All of these are free features. I didn't want accessibility to be a premium paywall.

## The Tech Stack

For those curious about the full setup:

| Component | Technology |
|-----------|-----------|
| UI Framework | React 19 + TypeScript |
| Build (popup/pages) | Vite 7 |
| Build (content script) | esbuild (IIFE output) |
| Content Extraction | @mozilla/readability |
| HTML Sanitization | DOMPurify |
| TTS | Web Speech API |
| Styling | Tailwind CSS 4 + injected CSS for content script |
| Payments | ExtPay |

The extension supports 8 languages for its UI (English, French, German, Spanish, Italian, Portuguese, Korean, Japanese) and automatically detects the article's language for TTS voice selection.

## Free vs. Pro

Most of ZenRead is free:

- Reader mode with full customization (themes, fonts, spacing, width)
- Estimated reading time
- Focus Bold (bionic reading)
- All accessibility features
- Reading streak tracking
- Print optimization

The Pro tier adds:
- Text-to-speech
- Highlights and notes
- Export to Markdown/HTML/Plain Text

I wanted the core reading experience and all accessibility features to be available to everyone. The Pro features are genuinely additive -- they enhance the experience but aren't essential to it.

## What I Learned

Building a reader mode extension taught me a few things:

**Content extraction is a harder problem than it looks.** Every site structures its HTML differently. Readability.js handles 90% of cases, but that remaining 10% requires site-specific knowledge. Having a rule system for popular sites was the right call.

**The Web Speech API is powerful but buggy.** The 14-second Chrome bug is well-documented but still unpatched. Text preprocessing is essential -- without it, the synthesizer will try to pronounce URLs, code snippets, and special characters with bizarre results.

**Accessibility matters more than you think.** I initially added dyslexia fonts and color overlays as a nice-to-have. Then I started getting messages from users saying these features genuinely changed their reading experience. They're now a core part of what ZenRead is.

**z-index wars are real.** Every website thinks their popup deserves the highest z-index. The only winning move is to use the actual maximum value.

---

If you read a lot of articles in Chrome and wish it had a proper reader mode, give ZenRead a try. I built it for myself, but I'd love to hear what you think.

{% embed https://chromewebstore.google.com/detail/zenread/adoiakplckmoahmiainobfpmdomnhomj %}

If you have questions about the implementation or run into any issues, drop a comment below. I'm happy to dig into the technical details.

---

*Other tools I've built:*

{% embed https://chromewebstore.google.com/detail/jmpmfbheoclfmceceihjpcjlabakkdde %}

{% embed https://chromewebstore.google.com/detail/ageolfjmheacenbkgiahlkhkogcnocip %}
