/**
 * Dev.to Analytics Collector
 *
 * 公開済み記事の分析データを収集してCSV/JSONに保存
 * - 累計PV・リアクション・コメント数
 * - 流入元（referrers）
 * - 日別PV推移（undocumented API使用）
 *
 * Usage: DEVTO_API_KEY=xxx node dev-to/analytics.mjs
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const API_KEY = process.env.DEVTO_API_KEY;
const API_BASE = "https://dev.to/api";

if (!API_KEY) {
  console.error("DEVTO_API_KEY is not set");
  process.exit(1);
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function apiGet(path, retries = 3) {
  const url = path.startsWith("http") ? path : `${API_BASE}${path}`;
  for (let attempt = 1; attempt <= retries; attempt++) {
    const res = await fetch(url, {
      headers: {
        "api-key": API_KEY,
        "accept": "application/vnd.forem.api-v1+json",
      },
    });
    if (res.status === 429) {
      const wait = parseInt(res.headers.get("retry-after") || "30", 10);
      console.log(`  [RATE LIMIT] Waiting ${wait}s...`);
      await sleep(wait * 1000);
      continue;
    }
    if (!res.ok) {
      const text = await res.text();
      console.warn(`  [WARN] GET ${path} failed (${res.status}): ${text.slice(0, 100)}`);
      return null;
    }
    return res.json();
  }
  return null;
}

async function getPublishedArticles() {
  const articles = [];
  let page = 1;
  while (true) {
    const data = await apiGet(`/articles/me?page=${page}&per_page=30`);
    if (!data || data.length === 0) break;
    articles.push(...data);
    if (data.length < 30) break;
    page++;
    await sleep(1000);
  }
  return articles.filter(a => a.published);
}

async function getArticleAnalytics(articleId) {
  // undocumented analytics endpoints (used by Dev.to dashboard internally)
  const [totals, referrers] = await Promise.all([
    apiGet(`/analytics/totals?article_id=${articleId}`),
    apiGet(`/analytics/referrers?article_id=${articleId}`),
  ]);
  return { totals, referrers };
}

async function main() {
  const today = new Date().toISOString().slice(0, 10);
  const outputDir = path.join(__dirname, "..", "analytics");
  if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

  console.log(`[${today}] Dev.to Analytics Collector started`);

  const articles = await getPublishedArticles();
  console.log(`Found ${articles.length} published article(s)`);

  const report = [];

  for (const article of articles) {
    console.log(`\n  Collecting: ${article.title.slice(0, 50)}...`);
    await sleep(500);

    const { totals, referrers } = await getArticleAnalytics(article.id);

    const entry = {
      id: article.id,
      title: article.title,
      slug: article.slug,
      url: `https://dev.to${article.path}`,
      published_at: article.published_at,
      tags: article.tags,
      // Standard API fields
      page_views_count: article.page_views_count || 0,
      public_reactions_count: article.public_reactions_count || 0,
      comments_count: article.comments_count || 0,
      reading_time_minutes: article.reading_time_minutes || 0,
      // Analytics API fields (undocumented, may be null)
      total_views: totals?.page_views || null,
      total_reactions: totals?.reactions || null,
      top_referrers: referrers
        ? referrers.slice(0, 5).map(r => `${r.domain}(${r.count})`).join(", ")
        : null,
      collected_at: today,
    };
    report.push(entry);

    console.log(`    Views: ${entry.page_views_count} | Reactions: ${entry.public_reactions_count} | Comments: ${entry.comments_count}`);
    if (entry.top_referrers) {
      console.log(`    Referrers: ${entry.top_referrers}`);
    }
  }

  // Save JSON
  const jsonPath = path.join(outputDir, `devto-analytics-${today}.json`);
  fs.writeFileSync(jsonPath, JSON.stringify(report, null, 2), "utf-8");
  console.log(`\n✅ Saved JSON: ${jsonPath}`);

  // Save CSV
  const csvPath = path.join(outputDir, "devto-analytics-latest.csv");
  const headers = Object.keys(report[0] || {});
  const csv = [
    headers.join(","),
    ...report.map(r => headers.map(h => JSON.stringify(r[h] ?? "")).join(","))
  ].join("\n");
  fs.writeFileSync(csvPath, csv, "utf-8");
  console.log(`✅ Saved CSV: ${csvPath}`);

  // Summary
  const totalViews = report.reduce((s, r) => s + r.page_views_count, 0);
  const totalReactions = report.reduce((s, r) => s + r.public_reactions_count, 0);
  console.log(`\n📊 Summary: ${report.length} articles | Total Views: ${totalViews} | Total Reactions: ${totalReactions}`);

  // Top performers
  const sorted = [...report].sort((a, b) => b.page_views_count - a.page_views_count);
  console.log("\n🏆 Top 5 by Views:");
  sorted.slice(0, 5).forEach((r, i) => {
    console.log(`  ${i + 1}. ${r.title.slice(0, 50)} — ${r.page_views_count} views | ${r.public_reactions_count} reactions`);
  });
}

main().catch(e => {
  console.error("Fatal error:", e);
  process.exit(1);
});
