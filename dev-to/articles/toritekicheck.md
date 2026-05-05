---
title: "I Built a Chrome Extension That Checks Japanese Subscription Terms with AI"
published: true
publish_date: "2026-05-05"
devto_id: "3519762"
tags: ["chrome","javascript","webdev","japan"]
---

Japanese subscription services have a problem with terms and conditions.

Not the length — that's universal. The specific issue is that Japanese cancellation terms, automatic renewal clauses, and price change notifications are buried in dense legal Japanese that's difficult to parse even for native speakers. The phrasing is designed to be compliant, not readable.

I've been surprised by charges I didn't expect. A streaming service I thought I'd cancelled. A software license that auto-renewed at double the introductory price. A free trial that converted to a paid plan because the cancellation window was "within 3 days of the trial end date" buried in paragraph 12 of the terms.

**ToritekiCheck** (取適チェック) is a Chrome extension that analyzes subscription terms and conditions pages with GPT and summarizes the important parts in plain Japanese.

## What It Analyzes

When you're on a service's terms page or subscription confirmation page, the extension scans for:

- **自動更新条件** (Auto-renewal conditions): When does it renew, what triggers it, how far in advance can you cancel?
- **解約方法・期限** (Cancellation method and deadline): How do you cancel, what's the deadline?
- **価格変更通知** (Price change notification): How will you be told if the price changes?
- **無料期間の終了** (Free trial end): Exactly when does the trial end and what happens after?
- **返金ポリシー** (Refund policy): Under what conditions can you get a refund?

The output is a structured summary in plain Japanese, not the original legalese.

## Architecture

The extension uses a side panel (Chrome's `sidePanel` API) rather than a popup, which gives enough vertical space to display detailed findings without feeling cramped.

```
ToritekiCheck/
├── entrypoints/
│   ├── content.ts          # Page text extraction
│   ├── sidepanel/          # React UI for results
│   └── background.ts       # API calls, message routing
└── lib/
    ├── extractor.ts        # Terms text extraction heuristics
    ├── analyzer.ts         # GPT call via Vercel proxy
    └── storage.ts          # Usage count, settings
```

### Extracting Terms Text

Not every page that has "terms" in the URL is a terms page in the relevant sense. I need to find the actual terms content while ignoring navigation, footers, and cookie banners.

```typescript
function extractTermsText(doc: Document): string {
  // Common terms container patterns in Japanese sites
  const selectors = [
    'article',
    '[class*="terms"]',
    '[class*="kiyaku"]',    // 規約 in romaji
    '[class*="agreement"]',
    '[id*="terms"]',
    '[id*="policy"]',
    'main',
  ];

  for (const selector of selectors) {
    const el = doc.querySelector(selector);
    if (el && el.textContent && el.textContent.trim().length > 500) {
      return cleanText(el.textContent);
    }
  }

  // Fallback: body text minus nav/header/footer
  return extractBodyContent(doc);
}

function cleanText(text: string): string {
  return text
    .replace(/\s+/g, ' ')
    .replace(/[\u200B-\u200D\uFEFF]/g, '') // Zero-width characters
    .trim()
    .slice(0, 8000); // GPT context limit
}
```

The 8000-character limit cuts most terms documents significantly, but the auto-renewal and cancellation clauses usually appear in the first third of any terms document (near the subscription-specific sections).

### The GPT Analysis Prompt

```typescript
const ANALYSIS_PROMPT = `
あなたは日本のサブスクリプションサービスの規約分析の専門家です。
以下の利用規約・特定商取引法に基づく表示から、ユーザーが特に注意すべき項目を抽出してください。

【抽出する項目】
1. 自動更新条件（更新タイミング、事前通知の有無）
2. 解約方法と解約期限（どのように、いつまでに解約が必要か）
3. 無料期間の終了条件（いつ有料に切り替わるか）
4. 価格変更の通知方法
5. 返金ポリシー

【出力形式】JSON
{
  "autoRenewal": { "exists": boolean, "conditions": string, "riskLevel": "high"|"medium"|"low" },
  "cancellation": { "method": string, "deadline": string, "riskLevel": "high"|"medium"|"low" },
  "freeTrial": { "endCondition": string, "conversionDate": string | null },
  "priceChange": { "notificationMethod": string },
  "refundPolicy": { "available": boolean, "conditions": string },
  "summary": "最も重要な点を1-2文で要約"
}

見つからない項目は null にしてください。
`;
```

The structured JSON output makes it easy to render each section with appropriate risk indicators in the UI.

### Free Tier Limits

The extension has a free tier (3 analyses per month) and a Pro tier (unlimited). Usage is tracked per calendar month:

```typescript
async function checkAndIncrementUsage(): Promise<{ allowed: boolean; remaining: number }> {
  const now = new Date();
  const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  const data = await chrome.storage.local.get(['usage', 'isPro']);
  if (data.isPro) return { allowed: true, remaining: Infinity };

  const usage = data.usage ?? {};
  const currentMonthCount = usage[monthKey] ?? 0;

  if (currentMonthCount >= FREE_LIMITS.MONTHLY_ANALYSES) {
    return { allowed: false, remaining: 0 };
  }

  // Increment
  await chrome.storage.local.set({
    usage: { ...usage, [monthKey]: currentMonthCount + 1 },
  });

  return {
    allowed: true,
    remaining: FREE_LIMITS.MONTHLY_ANALYSES - currentMonthCount - 1,
  };
}
```

Month-key storage means usage resets automatically without any cleanup job — old month keys accumulate but are tiny. A periodic cleanup job removes keys older than 3 months.

## The Proxy Requirement

Like my other AI-powered extensions, ToritekiCheck routes GPT calls through a Vercel serverless function. The API key lives server-side. The extension sends only the extracted terms text.

The data handling is important to be transparent about: the terms text (up to 8000 characters from a public terms page) is sent to the proxy, then to OpenAI for analysis. The text is not stored. This is disclosed in the CWS privacy settings and the in-extension UI.

## What I Learned About Freemium for Utility Extensions

The 3-analysis-per-month limit is intentionally generous for casual users. Most people check subscription terms 1-2 times a month at most. The Pro tier is for people who review contracts professionally or have a high volume of subscriptions to manage.

This is different from productivity tools where the free limit needs to be tight enough to create upgrade pressure. For an occasional-use utility, being too restrictive hurts word-of-mouth without gaining proportional upgrades.

ToritekiCheck is live on the Chrome Web Store.

---

*Built with WXT + React + TypeScript. AI analysis via GPT-4o-mini through a Vercel proxy.*
