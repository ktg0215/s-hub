#!/usr/bin/env node
/**
 * Chrome Web Store レビュー情報更新スクリプト
 * ProductSection.astro の rating, reviewCount, userCount を最新のストア情報で更新する
 * 各拡張機能の詳細ページ（pages/extensions/*.astro）も同時に更新する
 *
 * 使い方: node scripts/update-reviews.mjs
 */

import { readFileSync, writeFileSync, readdirSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PRODUCT_FILE = resolve(__dirname, '../src/components/ProductSection.astro');
const EXTENSIONS_DIR = resolve(__dirname, '../src/pages/extensions');

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

    let rating = null;
    let reviewCount = null;
    let userCount = null;

    // Method 1: JSON-LD structured data
    const jsonLdMatch = html.match(/<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/i);
    if (jsonLdMatch) {
      try {
        const jsonLd = JSON.parse(jsonLdMatch[1]);
        if (jsonLd.aggregateRating) {
          rating = parseFloat(jsonLd.aggregateRating.ratingValue);
          reviewCount = parseInt(jsonLd.aggregateRating.ratingCount || jsonLd.aggregateRating.reviewCount, 10);
        }
        // interactionStatistic for user count
        if (jsonLd.interactionStatistic) {
          const installs = Array.isArray(jsonLd.interactionStatistic)
            ? jsonLd.interactionStatistic.find(s => s.interactionType?.['@type'] === 'InstallAction' || s['@type'] === 'InteractionCounter')
            : jsonLd.interactionStatistic;
          if (installs?.userInteractionCount) {
            userCount = parseInt(installs.userInteractionCount, 10);
          }
        }
      } catch {}
    }

    // Method 2: HTML パターンマッチ (backup for rating)
    if (rating === null) {
      const ratingMatch = html.match(/(\d+\.?\d*)\s*(?:out of 5|\/5|\u2605)/);
      if (ratingMatch) {
        rating = parseFloat(ratingMatch[1]);
      }
    }

    if (reviewCount === null) {
      const reviewMatch = html.match(/(\d+)\s*(?:ratings?|reviews?)/i);
      if (reviewMatch) {
        reviewCount = parseInt(reviewMatch[1], 10);
      }
    }

    // User count from HTML patterns
    if (userCount === null) {
      // Pattern: "10,000+ users" or "1,000 users"
      const userMatch = html.match(/([\d,]+)\+?\s*users/i);
      if (userMatch) {
        userCount = parseInt(userMatch[1].replace(/,/g, ''), 10);
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

    return { rating, reviewCount, userCount };
  } catch (err) {
    console.warn(`  ⚠ Fetch error for ${extensionId}: ${err.message}`);
    return null;
  }
}

// 拡張機能名からファイル名を推測
function guessDetailPageFile(name) {
  const mapping = {
    'Shorts Killer': 'shorts-killer.astro',
    'X Detox': 'x-detox.astro',
    'PromptStash': 'promptstash.astro',
    'Rakuten Sellers Analytics': 'rakuten-sellers-analytics.astro',
    'Arbitra': 'arbitra.astro',
    'Japanese Font Finder': 'japanese-font-finder.astro',
    'DataPick': 'datapick.astro',
    '物件スカウター（賃貸版）': 'bukken-scouter-rental.astro',
    '物件スカウター（購入版）': 'bukken-scouter-purchase.astro',
    'Yahoo快適モード': 'yahoo-kaiteki-mode.astro',
    'ReadMark': 'readmark.astro',
    'TVer Plus': 'tver-plus.astro',
    'ZenRead': 'zenread.astro',
    'PageMemo': 'pagememo.astro',
    'SnippetVault': 'snippetvault.astro',
    'TabVault': 'tabvault.astro',
    'ReShapic': 'reshapic.astro',
    'DataBridge': 'databridge.astro',
    'Kaitoki': 'kaitoki.astro',
    'OnPageX': 'onpagex.astro',
    'Procshot': 'procshot.astro',
    'SnapReply for Gmail': 'snapreply.astro',
    'SNSCrossPost': 'snscrosspost.astro',
    'CookieJar': 'cookiejar.astro',
    'PagePilot': 'pagepilot.astro',
    '請求書よみとり': 'invoice-reader.astro',
  };
  return mapping[name] || null;
}

// 詳細ページを更新
function updateDetailPage(name, data) {
  const fileName = guessDetailPageFile(name);
  if (!fileName) return false;

  const filePath = resolve(EXTENSIONS_DIR, fileName);
  let content;
  try {
    content = readFileSync(filePath, 'utf-8');
  } catch {
    return false;
  }

  let changed = false;

  if (data.rating !== null) {
    const newContent = content.replace(
      /(extension\s*=\s*\{[\s\S]*?)rating:\s*[\d.]+/,
      (match, prefix) => `${prefix}rating: ${data.rating}`
    );
    if (newContent !== content) {
      content = newContent;
      changed = true;
    }
  }

  if (data.reviewCount !== null) {
    const newContent = content.replace(
      /(extension\s*=\s*\{[\s\S]*?)reviewCount:\s*\d+/,
      (match, prefix) => `${prefix}reviewCount: ${data.reviewCount}`
    );
    if (newContent !== content) {
      content = newContent;
      changed = true;
    }
  }

  if (data.userCount !== null) {
    if (content.includes('userCount:')) {
      const newContent = content.replace(
        /(extension\s*=\s*\{[\s\S]*?)userCount:\s*\d+/,
        (match, prefix) => `${prefix}userCount: ${data.userCount}`
      );
      if (newContent !== content) {
        content = newContent;
        changed = true;
      }
    }
  }

  if (changed) {
    writeFileSync(filePath, content, 'utf-8');
  }

  return changed;
}

async function main() {
  console.log('Chrome Web Store review data update starting...\n');

  let content = readFileSync(PRODUCT_FILE, 'utf-8');

  // storeLink を持つ製品を抽出
  const storeLinkRegex = /storeLink:\s*'(https:\/\/chromewebstore\.google\.com\/detail\/[^']+)'/g;
  const links = [];
  let match;
  while ((match = storeLinkRegex.exec(content)) !== null) {
    links.push({ url: match[1], index: match.index });
  }

  console.log(`${links.length} extensions to check...\n`);

  let updatedProducts = 0;
  let updatedPages = 0;

  for (const link of links) {
    const extensionId = extractExtensionId(link.url);
    if (!extensionId) {
      console.log(`  x Cannot extract ID: ${link.url}`);
      continue;
    }

    // 対応する製品名を取得
    const nameMatch = content.substring(Math.max(0, link.index - 300), link.index).match(/name:\s*'([^']+)'/);
    const name = nameMatch ? nameMatch[1] : extensionId;

    console.log(`  -> ${name} (${extensionId})`);

    const data = await fetchStoreData(extensionId);
    if (!data) {
      console.log(`    Skipped (fetch failed)`);
      continue;
    }

    if (data.rating !== null || data.reviewCount !== null || data.userCount !== null) {
      // この製品のブロックを見つけて rating/reviewCount/userCount を更新
      const blockStart = content.lastIndexOf('{', link.index);
      const blockEnd = content.indexOf('}', link.index);
      let block = content.substring(blockStart, blockEnd + 1);

      if (data.rating !== null) {
        block = block.replace(/rating:\s*[\d.]+/, `rating: ${data.rating}`);
      }
      if (data.reviewCount !== null) {
        block = block.replace(/reviewCount:\s*\d+/, `reviewCount: ${data.reviewCount}`);
      }
      if (data.userCount !== null) {
        block = block.replace(/userCount:\s*\d+/, `userCount: ${data.userCount}`);
      }

      content = content.substring(0, blockStart) + block + content.substring(blockEnd + 1);
      console.log(`    v rating: ${data.rating ?? '-'}, reviews: ${data.reviewCount ?? '-'}, users: ${data.userCount ?? '-'}`);
      updatedProducts++;

      // 詳細ページも更新
      if (updateDetailPage(name, data)) {
        console.log(`    v Detail page updated`);
        updatedPages++;
      }
    } else {
      console.log(`    No data found`);
    }

    // レート制限対策
    await new Promise(r => setTimeout(r, 1000));
  }

  writeFileSync(PRODUCT_FILE, content, 'utf-8');
  console.log(`\nDone: ${updatedProducts} products updated, ${updatedPages} detail pages updated`);
}

main().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
