---
title: "Free Chrome Extension for SEO Analysis - Page Score, Schema Detection and SERP Preview"
published: true
tags: ["chromeextension","seo","webdev","html"]
series: null
canonical_url: null
publish_date: "2026-04-10"
main_image: "https://dev-tools-hub.xyz/screenshots/onpagex/screenshot-01.png"
devto_id: "3392102"
---

Every time I published a new page, I would open the browser DevTools, dig through the `<head>` section, manually check if I had a title, meta description, canonical URL, Open Graph tags, Twitter Card tags, structured data, and proper heading hierarchy. Then I would check the images for alt attributes. Then the links. Every. Single. Time.

I wanted a tool that would do all of this in one click and give me a score. Not a cloud-based crawler that takes minutes. Not a SaaS dashboard that requires a login. Just a Chrome extension that instantly analyzes the page I am looking at and tells me what is good, what is missing, and what needs fixing.

So I built **OnPageX**, a Chrome extension that extracts every SEO-relevant signal from the current page, scores it on a 0-100 scale, and presents the results in a clean tabbed interface. It covers meta tags, Open Graph, Twitter Cards, heading structure, structured data (JSON-LD), image alt attributes, link analysis, and more.

## The Tech Stack

OnPageX is built with the WXT framework, React 19, TypeScript, and Tailwind CSS. WXT is a modern Chrome extension framework that provides a development experience similar to Next.js -- file-based entrypoints, hot module replacement, TypeScript out of the box, and a clean build pipeline. If you are starting a new extension in 2026, I would strongly recommend it over manual Vite or Webpack configurations.

The project structure follows WXT conventions:

```
src/
  entrypoints/
    background.ts       # Service worker
    popup/
      App.tsx           # Main popup UI
      main.tsx          # Entry point
  components/
    MetaOverview.tsx    # Meta tags + score
    HeadingTree.tsx     # Heading hierarchy
    SchemaViewer.tsx    # JSON-LD viewer
    LinkAnalysis.tsx    # Internal/external links
    ImageAudit.tsx      # Image alt check
    SerpPreview.tsx     # SERP preview (Pro)
    CompareView.tsx     # Page comparison (Pro)
  lib/
    extractor.ts        # SEO data extraction
    scoring.ts          # Scoring engine
    types.ts            # TypeScript types
    export-pdf.ts       # PDF export
    export-csv.ts       # CSV export
  hooks/
    useAnalysis.ts      # Main analysis hook
```

## The Extractor: Pulling SEO Data from the DOM

The heart of the extension is the `extractSeoData()` function. It runs in the context of the page (via `chrome.scripting.executeScript`) and extracts every piece of SEO-relevant information from the document.

Here is the core extraction logic:

```typescript
export function extractSeoData(): SeoData {
  const doc = document;

  const meta = (name: string): string => {
    const el = doc.querySelector<HTMLMetaElement>(
      `meta[name="${name}"]`
    ) ?? doc.querySelector<HTMLMetaElement>(
      `meta[name="${name}" i]`
    );
    return el?.content?.trim() ?? '';
  };

  const metaProp = (prop: string): string => {
    const el = doc.querySelector<HTMLMetaElement>(
      `meta[property="${prop}"]`
    );
    return el?.content?.trim() ?? '';
  };

  const title = doc.title?.trim() ?? '';
  const metaDescription = meta('description');
  const canonical =
    (doc.querySelector('link[rel="canonical"]')
      as HTMLLinkElement)?.href ?? '';
  const robots = meta('robots');

  // ... Open Graph, Twitter, headings, schema,
  //     images, links extraction
  return { url, title, metaDescription, canonical,
           robots, hreflang, og, twitter,
           headings, schemas, images, links };
}
```

A key design decision: this function is a pure function with zero external imports. That is because `chrome.scripting.executeScript` can only run functions that are self-contained -- you cannot import modules inside an injected function. Everything the extractor needs is defined inline.

### Meta Tag Extraction

The extractor checks both `name` and `property` attributes because different standards use different conventions. Standard meta tags like `description` and `robots` use `name`, while Open Graph tags use `property`:

```html
<!-- name-based -->
<meta name="description" content="..." />
<meta name="robots" content="index, follow" />

<!-- property-based -->
<meta property="og:title" content="..." />
<meta property="og:image" content="..." />
```

The Twitter Card specification is particularly inconsistent -- some implementations use `name`, others use `property`. The extractor checks both:

```typescript
const twitter: TwitterData = {
  card: meta('twitter:card') || metaProp('twitter:card'),
  title: meta('twitter:title') || metaProp('twitter:title'),
  description: meta('twitter:description')
    || metaProp('twitter:description'),
  image: meta('twitter:image') || metaProp('twitter:image'),
  site: meta('twitter:site') || metaProp('twitter:site'),
};
```

### Heading Hierarchy

The extension collects all headings (H1 through H6) with their level and text content:

```typescript
const headings: HeadingEntry[] = Array.from(
  doc.querySelectorAll('h1,h2,h3,h4,h5,h6'),
).map((el) => ({
  level: parseInt(el.tagName[1], 10),
  text: (el.textContent ?? '').trim().slice(0, 200),
}));
```

The heading tree component renders these as a nested outline, making it easy to spot structural issues like multiple H1 tags, skipped heading levels, or headings that are too long.

### Structured Data Detection

JSON-LD structured data is extracted from `<script type="application/ld+json">` elements. The extractor parses the JSON to identify the schema type:

```typescript
const schemas: SchemaEntry[] = Array.from(
  doc.querySelectorAll(
    'script[type="application/ld+json"]'
  ),
).map((el) => {
  const raw = el.textContent ?? '';
  let type = '(unknown)';
  try {
    const parsed = JSON.parse(raw);
    type = parsed['@type']
      ?? parsed?.['@graph']?.[0]?.['@type']
      ?? '(unknown)';
  } catch { /* ignore malformed JSON-LD */ }
  return { type, raw };
});
```

It handles both flat schemas (with a top-level `@type`) and graph-based schemas (where the schema is nested inside an `@graph` array, as commonly generated by Yoast SEO and similar WordPress plugins).

### Image Audit

Every `<img>` element is checked for its `alt` attribute, dimensions, and source URL:

```typescript
const images: ImageEntry[] = Array.from(
  doc.querySelectorAll<HTMLImageElement>('img'),
).map((el) => ({
  src: el.src || el.dataset.src || '',
  alt: el.alt ?? '',
  width: el.getAttribute('width') ?? '',
  height: el.getAttribute('height') ?? '',
}));
```

The `el.dataset.src` fallback catches lazy-loaded images that store the real URL in a data attribute. Missing alt text and missing explicit dimensions are both flagged in the UI.

### Link Analysis

Links are categorized as internal or external by comparing their origin to the page's origin:

```typescript
const links: LinkEntry[] = Array.from(
  doc.querySelectorAll<HTMLAnchorElement>('a[href]'),
).map((el) => {
  let isExternal = false;
  try {
    isExternal = new URL(el.href).origin !== origin;
  } catch { /* relative URL */ }
  return {
    href: el.href,
    text: (el.textContent ?? '').trim().slice(0, 120),
    rel: el.rel ?? '',
    isExternal,
  };
});
```

The `try/catch` handles relative URLs that would throw when passed to `new URL()`. The link analysis view shows internal vs. external link counts, identifies links with `nofollow` attributes, and flags any broken or empty `href` values.

## The Scoring Engine

Once the data is extracted, it goes through a scoring engine that evaluates nine SEO factors and produces an overall score from 0 to 100.

Each factor is evaluated as "good," "warning," or "critical":

```typescript
function level(
  ok: boolean, warn: boolean
): ScoreLevel {
  if (ok) return 'good';
  if (warn) return 'warning';
  return 'critical';
}
```

Here is how the title is scored, for example:

```typescript
const tLen = data.title.length;
items.push({
  label: 'Title',
  value: tLen > 0 ? `${tLen} chars` : 'Missing',
  level: level(
    tLen >= 30 && tLen <= 60,
    tLen > 0 && tLen < 70
  ),
  tip: tLen === 0
    ? 'Add a <title> tag'
    : tLen < 30
      ? 'Title is too short (aim for 30-60 chars)'
      : tLen > 60
        ? 'Title may be truncated in SERPs (>60 chars)'
        : 'Good title length',
});
```

The nine scoring factors are:

1. **Title** -- Should exist, ideally 30-60 characters.
2. **Meta Description** -- Should exist, ideally 120-160 characters.
3. **H1** -- Exactly one H1 heading should be present.
4. **Open Graph** -- `og:title`, `og:description`, and `og:image` should all be set.
5. **Canonical URL** -- Should be defined to prevent duplicate content issues.
6. **Image Alt Attributes** -- All images should have alt text.
7. **Structured Data** -- At least one JSON-LD schema should be present.
8. **Twitter Card** -- `twitter:card` and `twitter:title` should be set.
9. **Robots Directive** -- Should not contain `noindex` (unless intentional).

The overall score is calculated as a weighted average:

```typescript
const goodCount = items.filter(
  (i) => i.level === 'good'
).length;
const warnCount = items.filter(
  (i) => i.level === 'warning'
).length;
const overall = Math.round(
  ((goodCount * 1 + warnCount * 0.5) / items.length) * 100,
);
```

Good items contribute 1.0, warnings contribute 0.5, and critical items contribute 0. A page with all nine factors in good standing scores 100. A page with all warnings scores 50. This gives a quick at-a-glance reading of the page's SEO health.

## The Type System

The TypeScript types define the contract between the extractor and the rest of the application:

```typescript
export interface SeoData {
  url: string;
  title: string;
  metaDescription: string;
  canonical: string;
  robots: string;
  hreflang: HreflangEntry[];
  og: OgData;
  twitter: TwitterData;
  headings: HeadingEntry[];
  schemas: SchemaEntry[];
  images: ImageEntry[];
  links: LinkEntry[];
}

export interface ScoreResult {
  overall: number;
  items: ScoreItem[];
}

export interface ScoreItem {
  label: string;
  value: string;
  level: 'good' | 'warning' | 'critical';
  tip: string;
}
```

Having a strict `SeoData` interface means the extractor and the scorer are always in sync. If I add a new extraction field, TypeScript forces me to handle it everywhere it is consumed.

## The Popup UI: React with Tabs

The popup is a React application rendered in the extension's popup window. It uses a tabbed interface with six sections: Overview, Headings, Schema, Links, Images, and Pro.

```tsx
export default function App() {
  const [tab, setTab] = useState<TabKey>('overview');
  const { data, score, loading, error, analyze } =
    useAnalysis();
  const { t } = useI18n();

  return (
    <div className="flex flex-col h-full">
      <TabNavigation active={tab} onChange={setTab} />
      <div className="flex-1 overflow-y-auto">
        {tab === 'overview' &&
          <MetaOverview data={data} score={score} />}
        {tab === 'headings' &&
          <HeadingTree headings={data.headings} />}
        {tab === 'schema' &&
          <SchemaViewer schemas={data.schemas} />}
        {tab === 'links' &&
          <LinkAnalysis links={data.links} />}
        {tab === 'images' &&
          <ImageAudit images={data.images} />}
        {tab === 'pro' &&
          <ProPanel data={data} score={score} />}
      </div>
    </div>
  );
}
```

The `useAnalysis` hook manages the lifecycle: it triggers `chrome.scripting.executeScript` with the extraction function, receives the raw data, passes it through the scoring engine, and exposes the results to the UI. All of this happens when the popup opens, typically completing in under 100ms.

## Internationalization: Eight Languages

OnPageX supports eight languages: English, Japanese, Korean, Spanish, French, German, Italian, and Portuguese. The i18n system uses Chrome's built-in `_locales` mechanism for the extension name and description, plus a custom translation layer for the popup UI.

This was an important decision for reach. SEO is a global concern, and making the extension accessible to non-English speakers significantly expanded the potential user base.

## Pro Features

The free tier covers everything described above -- full analysis with scoring across all nine factors, heading tree, schema viewer, link analysis, and image audit.

The Pro tier (powered by ExtensionPay) adds:

- **SERP Preview**: Shows how the page would appear in Google search results, with title truncation preview and meta description length visualization.
- **Page Comparison**: Fetch and analyze a competitor's page side-by-side with yours, with a diff view highlighting differences.
- **Bulk Analysis**: Analyze multiple URLs from a list and export the results.
- **Analysis History**: Track SEO scores over time with timestamped snapshots.
- **PDF and CSV Export**: Generate reports for clients or stakeholders.

The comparison feature is particularly interesting technically. It fetches the competitor's page HTML via a background script (to avoid CORS restrictions), parses it into a Document using DOMParser, and runs the same extraction function on it:

```typescript
export function extractFromDocument(
  doc: Document, baseUrl: string
): SeoData {
  let origin = '';
  try {
    origin = new URL(baseUrl).origin;
  } catch {}

  const meta = (name: string): string => {
    const el = doc.querySelector<HTMLMetaElement>(
      `meta[name="${name}"]`
    );
    return el?.content?.trim() ?? '';
  };

  // ... same extraction logic, operating on
  // the fetched document instead of the live page
}
```

Having an `extractFromDocument` variant that takes a Document parameter (instead of using the global `document`) makes the extraction logic reusable for both live pages and fetched HTML.

## Export: PDF and CSV

The export system uses jsPDF with the jspdf-autotable plugin for PDF generation and a custom CSV builder for spreadsheet export.

The PDF export creates a formatted report with the site URL, timestamp, overall score, and a table of all scoring items with their values and recommendations. This is useful for SEO auditors who need to deliver reports to clients.

The CSV export produces a flat table that can be opened in Excel or Google Sheets for further analysis, filtering, and comparison across multiple pages.

## Why WXT?

I initially considered building this with a raw Vite setup and the CRXJS plugin, which is what I used for some of my other extensions. But WXT offered several advantages:

1. **File-based entrypoints.** Drop a file in `src/entrypoints/` and WXT automatically generates the manifest entry for it. No manual manifest configuration.

2. **React module.** The `@wxt-dev/module-react` package handles React integration with no boilerplate.

3. **Built-in browser targeting.** `wxt build --browser firefox` produces a Firefox-compatible build from the same source code.

4. **Dev server with HMR.** The popup reloads when you save a file. This is a huge productivity boost when iterating on UI.

5. **TypeScript by default.** Path aliases, type checking, and module resolution just work out of the box.

## Lessons Learned

1. **`chrome.scripting.executeScript` has constraints.** The injected function must be self-contained. No imports, no closures over external variables. This forced me to write the extractor as a pure function, which turned out to be a good architectural decision since it made the code easy to test and reuse.

2. **Meta tag conventions are inconsistent.** Some sites use `name`, others use `property`, and some use both. Always checking both is the safe approach. Case-insensitive matching (the `i` flag in the CSS selector) catches sites that use `Name` or `DESCRIPTION`.

3. **SERP character limits are guidelines, not rules.** Google truncates titles at different lengths depending on pixel width, not character count. The 60-character title guideline and 160-character description guideline are approximations. The scoring reflects this by using ranges rather than hard cutoffs.

4. **Structured data is messier than you expect.** Some sites have malformed JSON-LD that fails parsing. Some use `@graph` arrays. Some embed multiple schemas. The extractor needs to handle all these cases gracefully without crashing.

5. **Eight-language support multiplied the maintenance burden.** Every new feature or changed message requires updating eight translation files. I considered using machine translation but found that SEO-specific terminology needs careful human review. Incorrect translations for technical terms would undermine credibility.

If you do SEO work -- whether for your own sites or for clients -- and you want instant page-level analysis without leaving your browser, give OnPageX a try.

{% embed https://chromewebstore.google.com/detail/onpagex-seo-meta-analyzer/bnmkiihgfmmedaikcipkihcpabjbmdcc %}

---

*Other tools I've built:*

{% embed https://chromewebstore.google.com/detail/epoehadeccangbpjldlbkapnakndbpkf %}

{% embed https://chromewebstore.google.com/detail/ageolfjmheacenbkgiahlkhkogcnocip %}
