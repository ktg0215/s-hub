---
title: "I Built a Free Invoice OCR Chrome Extension — No Cloud, No Signup"
published: false
tags: ["chromeextension","ocr","pdf","productivity"]
series: null
canonical_url: null
publish_date: "2026-04-04"
devto_id: "3392112"
---

Every freelancer knows the drill. A PDF invoice arrives. You open it, squint at the numbers, then manually type the vendor name, amounts, tax breakdowns, and registration IDs into a spreadsheet or accounting app. Repeat twenty times a month.

Cloud OCR services like Dext (formerly Receipt Bank), Hubdoc, or Veryfi can automate this, but they start at $10-50/month, require uploading your financial documents to third-party servers, and often lock your data behind proprietary formats.

I wanted something different: an invoice reader that runs entirely in the browser, processes everything locally, costs nothing, and works the moment you install it. So I built one as a Chrome extension.

This article covers the technical decisions behind it: how to extract text from PDFs inside a Chrome extension, how to handle scanned invoices with in-browser OCR, how to parse unstructured invoice text into structured data with regex, and how to verify tax registration numbers against a government API in real time.

## The Architecture: A 4-Layer Processing Pipeline

The core challenge with invoice PDFs is that they vary wildly. Some have selectable text embedded by the authoring tool. Others are scanned images with no text layer at all. And even when text is present, the quality can be poor -- garbled characters, misaligned columns, or encoding issues.

To handle this reliably, I built a 4-layer fallback pipeline. Each layer attempts extraction, evaluates the result quality, and either returns the data or passes control to the next layer.

```
Layer 1: PDF.js text extraction (local)
  → quality score >= 50? → done
  ↓
Layer 2: PaddleOCR → Tesseract.js fallback (local)
  → quality score >= 40? → done
  ↓
Layer 3: Proxy AI extraction (optional, cloud)
  → success? → done
  ↓
Layer 4: BYOK - Bring Your Own Key (optional, user's API key)
```

For the vast majority of digitally-generated invoices, Layer 1 handles everything. Layer 2 kicks in for scanned PDFs. Layers 3 and 4 are optional cloud-assisted paths for edge cases like handwritten invoices or heavily formatted PDFs where local processing falls short.

The important point: **Layers 1 and 2 are completely local. No data leaves the browser.**

## Layer 1: PDF.js Text Extraction in a Chrome Extension

Using [PDF.js](https://mozilla.github.io/pdf.js/) inside a Chrome extension is not as straightforward as importing it in a web app. Chrome extensions run in a service worker context (Manifest V3), which has no DOM access and no `<canvas>` element. PDF.js needs a canvas for rendering and a worker thread for parsing.

The solution: an **offscreen document**. Chrome's Offscreen Documents API (introduced in MV3) lets you create a hidden HTML page with full DOM access. The service worker sends PDF data to the offscreen document, which runs PDF.js with its web worker, and returns the extracted text.

```
content script (detects PDF)
  → sends URL to service worker
    → service worker fetches PDF as ArrayBuffer
      → converts to base64
        → sends to offscreen document via Port
          → offscreen runs PDF.js with web worker
            → returns extracted text + quality score
```

The text extraction itself goes beyond a naive `getTextContent()` call. PDF text items have transform matrices that encode position, and you need to reconstruct the reading order from spatial coordinates. Here is the approach:

- Track Y-coordinate changes between text items to detect line breaks
- Track X-coordinate gaps within the same line to insert tab separators (for table-like data)
- Use font size as a reference for gap thresholds -- a gap wider than 30% of the font size becomes a tab, anything smaller becomes a space

This spatial reconstruction is critical for invoices because they are essentially tables. Without it, you get a flat string where vendor names run into amounts and tax rates blend into dates.

### Quality Scoring

Not all PDFs yield usable text. Some have copy-protection that strips text layers. Others encode text as glyph paths. The pipeline needs to know whether to trust the Layer 1 output or fall through to OCR.

I built a quality scoring function that evaluates the extracted text on multiple axes:

- **Japanese character density**: What percentage of characters are CJK? (Since this targets Japanese invoices, a high ratio is a good signal.)
- **Amount pattern detection**: Does the text contain currency patterns like `¥1,234` or comma-separated numbers?
- **Invoice keyword presence**: Are terms like "total," "tax," "subtotal," or "invoice number" present?
- **Text volume**: Is there enough text to represent a complete invoice?

Each axis contributes to a score out of 100. If the score exceeds 50, the text is considered reliable. Below that, Layer 2 takes over.

## Layer 2: In-Browser OCR with PaddleOCR and Tesseract.js

For scanned PDFs, the extension renders each page to an image using PDF.js (via `OffscreenCanvas` in the offscreen document), then feeds those images to an OCR engine.

The OCR pipeline itself has a two-engine fallback:

1. **PaddleOCR** runs first. It tends to produce better results for dense CJK text.
2. If PaddleOCR fails or returns empty output, **Tesseract.js** (v7, with WASM backend) takes over.

Both engines run entirely in the browser. Tesseract.js loads language models on first use and caches them. There is no server round-trip.

The offscreen document is essential here too -- Tesseract.js needs WASM execution, which requires a document context. The offscreen document's `reasons` field is set to `WORKERS` to justify its creation to Chrome.

## Parsing Invoice Fields with Regex

Once you have raw text -- whether from PDF.js or OCR -- you need to extract structured fields: vendor name, invoice number, issue date, total amount, tax breakdowns, bank details, and registration numbers.

This is where things get messy. Invoices have no standard format. Every company uses its own layout, terminology, and conventions. I ended up with a regex-first approach: a collection of patterns for each field, tried in priority order.

For example, the total amount extractor tries patterns like:

- Japanese keywords followed by amounts: patterns matching "total amount," "invoice amount," "tax-inclusive total," etc.
- Yen symbol followed by a number at the end of a line

Each pattern handles both half-width and full-width characters (a common headache in Japanese text processing -- `¥` vs `￥`, `0-9` vs `０-９`).

### Full-Width / Half-Width Normalization

Japanese invoices freely mix full-width and half-width characters. A registration number might appear as `Ｔ１２３４５６７８９０１２３` (all full-width) or `T1234567890123` (all half-width) or any combination. The field extractor normalizes everything to half-width after matching:

```typescript
result.registrationNumber = match[0]
  .replace(/Ｔ/, 'T')
  .replace(/[０-９]/g, (ch) =>
    String.fromCharCode(ch.charCodeAt(0) - 0xfee0),
  );
```

The `0xFEE0` offset is the Unicode distance between full-width digits (`０` = U+FF10) and their ASCII equivalents (`0` = U+0030).

### Vendor Name Extraction: A 5-Pattern Cascade

Extracting the vendor name is the hardest field because there is no universal keyword. Instead, the extractor uses contextual heuristics:

1. **Same-line split**: If the text has "Recipient Corp. + honorific + Vendor Corp." on one line, split at the honorific.
2. **Next-line detection**: Look for a company name on the line following the recipient's name.
3. **Proximity to registration number**: Company names often appear just above the tax registration number.
4. **Global search**: Find any line containing a corporate suffix (Inc., Ltd., Corp., LLC, etc.) that is not the recipient.
5. **English company names**: Match patterns ending with Inc., LLC, Corp., Ltd., etc.

This cascade handles around 90% of invoice layouts I have tested. The remaining edge cases fall to the AI-assisted layers.

## Real-Time Tax Registration Verification

Japan's Qualified Invoice System (introduced in October 2023) requires businesses to verify that their vendors hold a valid tax registration number. The National Tax Agency (NTA) provides a public API for this:

```
GET https://web-api.invoice-kohyo.nta.go.jp/1/num?id=T1234567890123&type=21
```

The extension calls this API directly from the service worker. No backend proxy needed -- the NTA API supports CORS and is publicly accessible. The response includes:

- Registration status (valid / expired)
- Registered business name
- Registration date
- Expiration date (if revoked)

Results are cached in memory for 24 hours to minimize API calls. The extension validates the format locally first (`/^T\d{13}$/`) before making any network request.

### Why This Matters Beyond Japan

While the specific API is Japan-specific, the pattern is universally applicable. Many countries have similar tax registration verification systems:

- **EU VAT**: VIES (VAT Information Exchange System)
- **UK**: HMRC VAT check
- **India**: GSTIN verification
- **Australia**: ABN Lookup

The architecture -- extract a registration number from an invoice, validate its format locally, then verify against a government API -- translates directly to any of these systems. The regex patterns and API endpoint change, but the pipeline stays the same.

## The Chrome Extension Constraints That Shaped the Design

Building this as a Chrome extension rather than a web app introduced several constraints that directly influenced the architecture:

### No DOM in Service Workers

Manifest V3 service workers cannot access `document`, `canvas`, or any DOM API. PDF.js and Tesseract.js both need DOM access. The offscreen document pattern solves this, but it adds communication overhead -- every PDF operation requires serializing data to base64, sending it through a Port, and deserializing on the other side.

### Message Size Limits

Chrome's `runtime.sendMessage` has undocumented size limits. For large PDFs, the base64-encoded data can exceed these limits. I switched to `runtime.connect()` (long-lived Ports) for all offscreen communication, which handles larger payloads reliably.

### Single Offscreen Document

Chrome only allows one offscreen document at a time per extension. This means PDF.js text extraction and Tesseract.js OCR share the same offscreen document. The document multiplexes requests using a request ID system -- each message gets a unique `_id`, and responses are routed back to the correct promise via a `Map`.

### Content Script PDF Detection

The content script runs on all URLs and checks three signals to detect PDFs:

1. URL ends with `.pdf`
2. `document.contentType === 'application/pdf'`
3. An `<embed>` element with `type="application/pdf"` exists

When a PDF is detected, the extension's toolbar icon gets a "PDF" badge, signaling to the user that they can open the side panel to process the invoice.

## Privacy-First Design

For an invoice processing tool, privacy is non-negotiable. Financial documents contain bank account numbers, tax IDs, revenue figures, and vendor relationships. Uploading these to a cloud OCR service is a real risk.

The extension's default mode (Layers 1 and 2) keeps everything local:

- PDF data is processed in the offscreen document and never leaves the browser
- OCR runs via WASM -- no external API calls
- Extracted data is stored in IndexedDB (via Dexie.js) on the user's machine
- The only external network call is the NTA API for registration verification, which sends only the 14-character registration number

The optional cloud layers (3 and 4) exist for users who need AI-assisted extraction of complex invoices. Layer 3 uses a managed proxy. Layer 4 lets users provide their own OpenAI API key, so the data goes directly from their browser to OpenAI without passing through any intermediary.

## Export: Meeting Users Where They Are

Extracted invoice data is only useful if it flows into existing workflows. The extension supports multiple export formats:

- **CSV** with customizable column mappings
- **Excel (XLSX)** via the SheetJS library
- **JSON** for developers and API integrations
- **Clipboard** for quick paste into any application
- **Accounting software presets** for popular Japanese accounting tools (freee, Money Forward, Yayoi)

Each preset maps the extracted fields to the specific column format expected by the target software, so users can import directly without manual column mapping.

## The Tech Stack

| Component | Technology | Purpose |
|---|---|---|
| Framework | WXT (Vite-based) | Chrome extension build tooling |
| UI | React 18 + Tailwind CSS | Side panel interface |
| PDF parsing | pdfjs-dist v5 | Text extraction + page rendering |
| OCR (primary) | PaddleOCR | CJK-optimized text recognition |
| OCR (fallback) | Tesseract.js v7 | WASM-based OCR engine |
| State | Zustand | Lightweight state management |
| Storage | Dexie.js (IndexedDB) | Local invoice data persistence |
| Spreadsheet | SheetJS (xlsx) | Excel export |
| CSV | PapaParse | CSV generation with encoding support |
| i18n | i18next + react-i18next | Japanese/English interface |
| Monetization | ExtPay | Payment processing |

## What I Learned

**Quality scoring is essential.** Without a way to measure extraction quality, you cannot build a reliable fallback pipeline. The scoring function was one of the earliest pieces I wrote and has been the most stable.

**Offscreen documents are powerful but awkward.** The communication pattern between service worker and offscreen document adds significant complexity. If Chrome ever adds DOM access to service workers (unlikely), this entire layer would collapse into something much simpler.

**Regex beats ML for structured extraction -- sometimes.** For fields with clear syntactic patterns (dates, amounts, registration numbers), regex is faster, more predictable, and requires no model loading. ML/AI shines for unstructured fields (vendor names, line item descriptions) where context matters more than syntax.

**Full-width/half-width normalization is not optional in Japanese text processing.** Every string comparison, every regex match, every format validation needs to handle both character widths. This was a source of subtle bugs early on.

## Try It

The extension is free on the Chrome Web Store:

{% embed https://dev-tools-hub.xyz/extensions/invoice-reader %}

It works on any Chromium-based browser (Chrome, Edge, Brave, Arc). Open a PDF invoice in your browser, click the extension icon to open the side panel, and it extracts the data automatically. No account creation, no cloud upload, no subscription.

If you are building Chrome extensions that process documents, I hope the patterns described here -- offscreen document communication, quality-based fallback pipelines, spatial text reconstruction -- are useful starting points.

Questions or feedback? Drop a comment below or open an issue on the project.

---

*Other tools I've built:*

{% embed https://chromewebstore.google.com/detail/epoehadeccangbpjldlbkapnakndbpkf %}

{% embed https://chromewebstore.google.com/detail/gbjklhkdilhnnfgikfcnahaijacnhfce %}
