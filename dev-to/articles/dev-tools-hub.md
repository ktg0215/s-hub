---
title: "I Built 20 Free Browser-Based Developer Tools — No Signup, No Server, No Tracking"
published: false
tags: ["webdev", "javascript", "productivity", "opensource"]
series: null
canonical_url: null
publish_date: "2026-04-19"
devto_id: "3397773"
---

Every developer has a collection of bookmarked utility sites. A JSON formatter here, a Base64 encoder there, a regex tester somewhere else. Each one has its own UI quirks, cookie consent banners, and data handling policies. Some send your input to a server. Some inject ads between your paste and the output.

I got tired of juggling ten different tabs from ten different sites just to do basic transformations. So I built one site with everything I need: **Dev Tools Hub** -- 20 developer utilities that run entirely in your browser.

{% embed https://tools.dev-tools-hub.xyz %}

## Why Client-Side Only Matters

Every tool on Dev Tools Hub processes data exclusively in your browser. Nothing is sent to any server. This is not just a privacy feature -- it is a hard architectural constraint that shaped every decision.

There is no backend. The entire site is statically exported with Next.js and served from Cloudflare Pages. When you paste a JWT token to decode it, that token never leaves your machine. When you hash a password, the computation happens in Web Crypto API on your device.

This matters for the tools where you handle sensitive data: JWT tokens contain user claims. Hashes might be computed on real passwords. JSON payloads might contain API keys during debugging. None of that should ever touch a third-party server.

## The 20 Tools

The tools fall into seven categories:

**Formatters**
- **JSON Formatter** -- Pretty-print, minify, and validate JSON with syntax highlighting. Auto-formats as you type with configurable indentation.
- **JSON Validator** -- Real-time syntax validation with error line highlighting and one-click navigation to the JSON Formatter for fixing issues.

**Encoders/Decoders**
- **Base64** -- Encode and decode text or files. Supports binary file encoding with drag-and-drop.
- **URL Encoder** -- Encode and decode URI components. Handles full URLs and individual components separately.
- **HTML Entity** -- Convert special characters to HTML entities and back, with a reference table of common entities.

**Converters**
- **Timestamp Converter** -- Convert between Unix timestamps and human-readable dates across timezones.
- **Number Base Converter** -- Convert between binary, octal, decimal, and hexadecimal with quick-value buttons.
- **JSON-YAML Converter** -- Bidirectional conversion between JSON and YAML with configurable indentation.

**Generators**
- **UUID Generator** -- Generate UUID v4 values in bulk, with one-click copy.
- **Hash Generator** -- Compute MD5, SHA-1, SHA-256, and SHA-512 hashes for text or files. Uses Web Crypto API for SHA variants.
- **Password Generator** -- Customizable length, character sets, excluded characters, and entropy calculation in bits.

**Text Tools**
- **Character Counter** -- Counts characters, words, sentences, paragraphs, lines, bytes (UTF-8), and full-width/half-width characters. Shows limits for Twitter, Instagram, and other platforms.
- **Text Converter** -- Case conversion (camelCase, snake_case, kebab-case, etc.), full-width/half-width conversion, and whitespace/line-ending normalization.

**Developer Tools**
- **SQL Formatter** -- Format SQL queries with support for multiple dialects (PostgreSQL, MySQL, SQLite, BigQuery, and more).
- **Cron Generator** -- Build cron expressions with per-field input, natural language explanation, and next-execution preview with timezone support.
- **JWT Decoder** -- Decode JWT tokens, inspect header and payload, and check expiration status.
- **Diff Checker** -- Side-by-side text comparison with inline highlighting of additions, deletions, and modifications.
- **Regex Tester** -- Test regular expressions with real-time match highlighting, capture group display, and flag toggles.

**Design Tools**
- **Color Picker** -- Convert between HEX, RGB, HSL, HSV, and CMYK. Includes WCAG contrast ratio checker and palette generation (complementary, analogous, triadic).
- **CSS Gradient Generator** -- Build linear, radial, and conic gradients with a visual editor and one-click CSS output.

## Architecture: Three Layers Per Tool

Each tool follows the same pattern:

```
lib/tools/[name].ts          → Pure logic (no React, no DOM)
components/tools/[Name].tsx   → UI component (React, client-side)
app/[locale]/tools/[slug]/page.tsx → SSG page (metadata, JSON-LD)
```

The logic layer is framework-agnostic. The JSON formatter logic, for example, is just two functions:

```typescript
export function formatJson(
  input: string,
  indent: number | string = 2
): FormatResult {
  if (!input.trim()) {
    return { output: '', error: null, errorLine: null };
  }
  try {
    const parsed = JSON.parse(input);
    const indentValue = indent === 'tab' ? '\t' : Number(indent);
    return {
      output: JSON.stringify(parsed, null, indentValue),
      error: null,
      errorLine: null,
    };
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    const lineMatch = message.match(/position (\d+)/);
    let errorLine: number | null = null;
    if (lineMatch) {
      const pos = parseInt(lineMatch[1], 10);
      errorLine = input.substring(0, pos).split('\n').length;
    }
    return { output: '', error: message, errorLine };
  }
}
```

This separation means the logic is independently testable, and the UI can be swapped without touching the core algorithms.

## Hashing Without a Server

The hash generator uses the Web Crypto API for SHA variants and a JavaScript library for MD5 (since Web Crypto does not support MD5):

```typescript
export async function hashText(
  text: string,
  format: OutputFormat = 'hex'
): Promise<HashResult[]> {
  const encoder = new TextEncoder();
  const data = encoder.encode(text);

  // MD5 via js-md5 (Web Crypto doesn't support MD5)
  const md5Hash = format === 'hex'
    ? md5(text)
    : md5.base64(text);

  // SHA variants via Web Crypto API
  const [sha1, sha256, sha512] = await Promise.all([
    computeWebCryptoHash('SHA-1', data.buffer, format),
    computeWebCryptoHash('SHA-256', data.buffer, format),
    computeWebCryptoHash('SHA-512', data.buffer, format),
  ]);

  return [
    { algorithm: 'MD5', hash: md5Hash },
    { algorithm: 'SHA-1', hash: sha1 },
    { algorithm: 'SHA-256', hash: sha256 },
    { algorithm: 'SHA-512', hash: sha512 },
  ];
}
```

File hashing works the same way -- `File.arrayBuffer()` feeds directly into the same pipeline. No upload, no server round-trip.

## Static Export with Full Interactivity

The site is built with Next.js 15 using `output: 'export'`, which generates a fully static site. Every page is pre-rendered at build time. Cloudflare Pages serves the static files with aggressive caching.

But each tool page is a React client component with full interactivity. The page shell (metadata, JSON-LD structured data, SEO content) is static. The tool itself is hydrated on the client.

```tsx
// page.tsx — static at build time
export default async function Page({ params }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'tools.jsonFormatter' });
  const structuredData = generateToolStructuredData(locale, SLUG, t('name'), t('description'));

  return (
    <ToolPageLayout toolSlug={SLUG}>
      <script type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }} />
      <JsonFormatter />  {/* ← Client component, fully interactive */}
      <ToolContent translationKey={TKEY} relatedSlugs={['json-validator']} />
    </ToolPageLayout>
  );
}
```

This gives you the best of both worlds: fast initial loads with SEO-friendly HTML, plus rich client-side interactivity.

## Internationalization

Every string in the UI is externalized into translation files (`messages/en.json` and `messages/ja.json`). This includes not just button labels, but also SEO content -- the HowTo steps, FAQ items, and tool descriptions are all translated.

The URL structure reflects the locale: `/en/tools/json-formatter` and `/ja/tools/json-formatter` serve the same tool with different UI language. Each page generates proper `hreflang` tags for search engines.

## The Design System

I built a shared component library that every tool uses:

- **CodeEditor** -- A CodeMirror wrapper with syntax highlighting for JSON, SQL, YAML, and JavaScript
- **CopyButton** -- One-click copy with visual feedback
- **Tabs** -- For tools with multiple modes (encode/decode, format/minify)
- **FileDropZone** -- Drag-and-drop file input for hash generator and Base64

The theme uses CSS custom properties for dark/light mode switching. Dark mode is the default because developers live in dark mode.

## SEO: Three Structured Data Types Per Page

Each tool page includes three JSON-LD schemas:

1. **WebApplication** -- Marks the page as a free web application
2. **HowTo** -- Step-by-step usage instructions (appears in Google's rich results)
3. **FAQPage** -- Common questions and answers

Combined with a dynamically generated sitemap covering all 42 URLs (20 tools × 2 locales + 2 top pages), this gives each tool the best chance of ranking for its target queries.

## Lessons Learned

**Pure logic functions make development fast.** When adding a new tool, I write and test the logic layer first without thinking about UI. Once the functions work correctly, wiring them up to a React component is mechanical.

**Static export with client components is underrated.** You get the deployment simplicity of a static site (just files on a CDN) with the interactivity of a full React app. No server to manage, no cold starts, no scaling concerns.

**20 tools on one site is better than 20 separate sites.** Shared components, shared design system, shared SEO infrastructure. Adding a new tool takes an afternoon instead of a week.

**The "no server" constraint is liberating.** When you cannot send data anywhere, you never have to think about rate limiting, data retention, GDPR compliance, or security breaches. The attack surface is zero.

## Try It

The site is live and free to use. No signup, no tracking, no ads.

{% embed https://tools.dev-tools-hub.xyz %}

---

*Other tools I've built:*

{% embed https://chromewebstore.google.com/detail/onpagex-seo-meta-analyzer/bnmkiihgfmmedaikcipkihcpabjbmdcc %}

{% embed https://chromewebstore.google.com/detail/snippetvault/gnnmjklohcoaiheikefoifiekcnndcdi %}
