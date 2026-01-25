#!/usr/bin/env node
/**
 * Chrome Web Store レビュー情報更新スクリプト
 * ProductSection.astro の rating と reviewCount を最新のストア情報で更新する
 *
 * 使い方: node scripts/update-reviews.mjs
 */

import { readFileSync, writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PRODUCT_FILE = resolve(__dirname, '../src/components/ProductSection.astro');

// storeLink から拡張機能IDを抽出
function extractExtensionId(storeLink) {
  if (!storeLink) return null;
  const match = storeLink.match(/\/detail\/[^/]*\/([a-z]{32})/);
  if (match) return match[1];
  // IDのみのURL
  const match2 = storeLink.match(/\/detail\/([a-z]{32})/);
  return match2 ? match2[1] : null;
}

// Chrome Web Store からレビュー情報を取得
async function fetchStoreData(extensionId) {
  const url = `https://chromewebstore.google.com/detail/_/${extensionId}`;
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
        'Accept-Language': 'en-US,en;q=0.9',
      },
    });
    if (!res.ok) {
      console.warn(`  ⚠ HTTP ${res.status} for ${extensionId}`);
      return null;
    }
    const html = await res.text();

    // 評価を抽出 (JSON-LD or meta tags)
    let rating = null;
    let reviewCount = null;

    // Method 1: JSON-LD structured data
    const jsonLdMatch = html.match(/<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/i);
    if (jsonLdMatch) {
      try {
        const jsonLd = JSON.parse(jsonLdMatch[1]);
        if (jsonLd.aggregateRating) {
          rating = parseFloat(jsonLd.aggregateRating.ratingValue);
          reviewCount = parseInt(jsonLd.aggregateRating.ratingCount || jsonLd.aggregateRating.reviewCount, 10);
        }
      } catch {}
    }

    // Method 2: HTML パターンマッチ (backup)
    if (rating === null) {
      // 評価値を探す
      const ratingMatch = html.match(/(\d+\.?\d*)\s*(?:out of 5|\/5|\u2605)/);
      if (ratingMatch) {
        rating = parseFloat(ratingMatch[1]);
      }
    }

    if (reviewCount === null) {
      // レビュー数を探す
      const reviewMatch = html.match(/(\d+)\s*(?:ratings?|reviews?)/i);
      if (reviewMatch) {
        reviewCount = parseInt(reviewMatch[1], 10);
      }
    }

    // Method 3: aria-label パターン
    if (rating === null) {
      const ariaMatch = html.match(/aria-label="[^"]*?(\d+\.?\d*)\s*(?:out of|of)\s*5/i);
      if (ariaMatch) {
        rating = parseFloat(ariaMatch[1]);
      }
    }

    if (reviewCount === null) {
      const countMatch = html.match(/(\d+)\s*(?:개의 평가|件の評価|valoraciones|Bewertungen|évaluations)/i);
      if (countMatch) {
        reviewCount = parseInt(countMatch[1], 10);
      }
    }

    return { rating, reviewCount };
  } catch (err) {
    console.warn(`  ⚠ Fetch error for ${extensionId}: ${err.message}`);
    return null;
  }
}

async function main() {
  console.log('📦 Chrome Web Store レビュー情報を更新中...\n');

  let content = readFileSync(PRODUCT_FILE, 'utf-8');

  // storeLink を持つ製品を抽出
  const storeLinkRegex = /storeLink:\s*'(https:\/\/chromewebstore\.google\.com\/detail\/[^']+)'/g;
  const links = [];
  let match;
  while ((match = storeLinkRegex.exec(content)) !== null) {
    links.push({ url: match[1], index: match.index });
  }

  console.log(`${links.length} 個の拡張機能を確認中...\n`);

  let updated = 0;

  for (const link of links) {
    const extensionId = extractExtensionId(link.url);
    if (!extensionId) {
      console.log(`  ✗ IDを抽出できません: ${link.url}`);
      continue;
    }

    // 対応する製品名を取得
    const nameMatch = content.substring(Math.max(0, link.index - 300), link.index).match(/name:\s*'([^']+)'/);
    const name = nameMatch ? nameMatch[1] : extensionId;

    console.log(`  → ${name} (${extensionId})`);

    const data = await fetchStoreData(extensionId);
    if (!data) {
      console.log(`    スキップ（データ取得失敗）`);
      continue;
    }

    if (data.rating !== null || data.reviewCount !== null) {
      // この製品のブロックを見つけて rating/reviewCount を更新
      // storeLink の位置から逆方向に rating と reviewCount を探す
      const blockStart = content.lastIndexOf('{', link.index);
      const blockEnd = content.indexOf('}', link.index);
      let block = content.substring(blockStart, blockEnd + 1);

      if (data.rating !== null) {
        block = block.replace(/rating:\s*[\d.]+/, `rating: ${data.rating}`);
      }
      if (data.reviewCount !== null) {
        block = block.replace(/reviewCount:\s*\d+/, `reviewCount: ${data.reviewCount}`);
      }

      content = content.substring(0, blockStart) + block + content.substring(blockEnd + 1);
      console.log(`    ✓ rating: ${data.rating ?? '—'}, reviews: ${data.reviewCount ?? '—'}`);
      updated++;
    } else {
      console.log(`    データ見つからず`);
    }

    // レート制限対策
    await new Promise(r => setTimeout(r, 1000));
  }

  writeFileSync(PRODUCT_FILE, content, 'utf-8');
  console.log(`\n✅ ${updated} 個の拡張機能を更新しました`);
}

main().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
