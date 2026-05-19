---
title: "I Built a Chrome Extension That Catches Japanese Ad Law Violations in Real Time"
published: true
publish_date: "2026-05-10"
devto_id: "3515923"
tags: ["chrome","javascript","webdev","japan"]
---

Japanese advertising law is a minefield.

If you work in Japanese digital marketing, you know the anxiety. A single word like **最高** (best) or **必ず** (guaranteed) could technically violate 景品表示法 (Keihyo-ho). A beauty product description mentioning skin improvement might run afoul of 薬機法 (Yakki-ho). An influencer post without a clear "PR" disclosure triggers ステルスマーケティング (stealth marketing) regulations.

I was helping a friend review ad copy for a cosmetics brand when I realized: there is no tooling for this. No browser extension, no real-time checker, nothing. You either know the rules by heart or you pay a lawyer.

So I built one.

## What AdLegalCheck Does

**AdLegalCheck** is a Chrome extension that automatically scans any webpage you visit and flags potential violations across three Japanese legal frameworks:

- **景品表示法 (Keihyo-ho)** — Misleading claims, exaggerated benefits, prohibited comparative advertising
- **薬機法 (Yakki-ho)** — Health and beauty claims that are illegal for cosmetics and quasi-drugs
- **ステルスマーケティング規制** — Undisclosed sponsored content or paid reviews

When you open a product page or ad landing page, the extension:

1. Scans the visible text for 68 high-risk keywords and patterns
2. Highlights risky words directly on the page
3. Opens a side panel with a risk score (0-100) and findings sorted by severity
4. (Pro) Runs GPT-4o-mini AI analysis for context-aware evaluation

## The Technical Stack

Built with **WXT + React + TypeScript** — WXT gives you a proper build system with HMR, TypeScript out of the box, and sensible MV3 defaults.

```
adlegalcheck/
├── entrypoints/
│   ├── content.ts        # Page scanner + keyword highlighter
│   ├── sidepanel/        # React UI for results
│   └── background.ts     # Message bus + usage tracking
├── lib/
│   ├── keywords.ts       # 68 NG keyword database
│   ├── scanner.ts        # Regex matching engine
│   └── ai-analyzer.ts    # GPT proxy client
└── wxt.config.ts
```

### The Keyword Database

The core is a curated list of 68 expressions organized by violation type and severity:

```typescript
type KeywordEntry = {
  pattern: RegExp;
  law: "keihyo" | "yakki" | "stealth";
  severity: "high" | "medium" | "low";
  reason: string;
};

const keywords: KeywordEntry[] = [
  {
    pattern: /日本一|No\.?\s*1|ナンバーワン/g,
    law: "keihyo",
    severity: "high",
    reason: "Absolute superiority claims require substantiation",
  },
  {
    pattern: /必ず|絶対に|100%/g,
    law: "keihyo",
    severity: "high",
    reason: "Guarantee expressions violate 景表法 §5",
  },
  {
    pattern: /美白|シミが消|肌が若返/g,
    law: "yakki",
    severity: "high",
    reason: "Prohibited efficacy claims for cosmetics",
  },
];
```

### Content Script: Highlighting Without Breaking the Page

The trickiest part was highlighting keywords inside arbitrary DOM trees without corrupting the page structure. I use a TreeWalker to find text nodes, then wrap matches in `<mark>` elements:

```typescript
function highlightInNode(node: Text, matches: Match[]): void {
  const text = node.textContent ?? "";
  if (matches.length === 0) return;

  const fragment = document.createDocumentFragment();
  let lastIndex = 0;

  for (const match of matches) {
    if (match.start > lastIndex) {
      fragment.appendChild(
        document.createTextNode(text.slice(lastIndex, match.start))
      );
    }
    const mark = document.createElement("mark");
    mark.className = `adlc-highlight adlc-${match.severity}`;
    mark.textContent = text.slice(match.start, match.end);
    mark.title = match.reason;
    fragment.appendChild(mark);
    lastIndex = match.end;
  }

  if (lastIndex < text.length) {
    fragment.appendChild(document.createTextNode(text.slice(lastIndex)));
  }

  node.parentNode?.replaceChild(fragment, node);
}
```

### AI Analysis via Vercel Proxy

The Pro feature sends the page text to GPT-4o-mini for context-aware analysis. A keyword matcher cannot understand nuance — "最高の気分" (feeling great) is fine; "最高の効果" (highest efficacy) is not.

I route all AI calls through a Vercel serverless function so the OpenAI API key never touches the client:

```typescript
const response = await fetch(
  "https://s-hub-dashboard.vercel.app/api/llm/chat",
  {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      messages: [
        {
          role: "system",
          content: `You are a Japanese advertising law compliance expert.
            Analyze the provided text for violations of:
            1. 景品表示法 (misleading claims, absolute superiority)
            2. 薬機法 (prohibited health/beauty efficacy claims)
            3. ステルスマーケティング規制 (undisclosed sponsorship)
            Return JSON: { riskScore: 0-100, findings: Finding[], summary: string }`,
        },
        { role: "user", content: pageText.slice(0, 4000) },
      ],
    }),
  }
);
```

### Risk Score Calculation

The 0-100 risk score combines keyword density and AI analysis:

```typescript
function calculateRiskScore(
  keywordFindings: Finding[],
  aiScore?: number
): number {
  const keywordScore = Math.min(
    keywordFindings.reduce((acc, f) => {
      const weights = { high: 20, medium: 10, low: 5 };
      return acc + weights[f.severity];
    }, 0),
    70
  );

  if (aiScore !== undefined) {
    return Math.round(keywordScore * 0.4 + aiScore * 0.6);
  }
  return keywordScore;
}
```

## Freemium Design

Free tier: 3 page scans per month, keyword matching only.
Pro ($9.99/month): Unlimited scans + AI analysis + CSV export.

Monetization via [ExtensionPay](https://extensionpay.com) — no backend needed for payments.

## Who Is This For?

Japanese marketing teams and copywriters who need a quick gut-check before publishing:

1. Draft ad copy, put it on a staging page
2. Open the extension, hit scan
3. Red highlights = fix before legal review
4. Ship with confidence

Not a replacement for a lawyer — the disclaimer is built into the UI. But catching obvious violations before they reach legal review saves time and money.

## What is Next

- Better pattern matching for idiomatic expressions
- Support for 特定商取引法 (e-commerce disclosure requirements)
- Batch scanning via CSV upload (Pro roadmap)

The extension is live on the Chrome Web Store: https://chromewebstore.google.com/detail/eacmjlpcondhpifichlkahhpjofmicol

---

*Built with WXT + React + TypeScript. AI analysis powered by GPT-4o-mini via Vercel serverless.*
