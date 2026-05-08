/**
 * Dev.to Scheduled Publisher
 *
 * Reads markdown files in dev-to/articles/, checks publish_date,
 * and publishes articles whose date has arrived.
 *
 * Frontmatter format:
 * ---
 * title: "Article Title"
 * published: false
 * tags: ["tag1", "tag2"]
 * series: "optional series name"
 * canonical_url: "optional"
 * publish_date: "2026-03-29"
 * devto_id: null  (filled after first push)
 * ---
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ARTICLES_DIR = path.join(__dirname, "articles");
const API_KEY = process.env.DEVTO_API_KEY;
const API_BASE = "https://dev.to/api/articles";

if (!API_KEY) {
  console.error("DEVTO_API_KEY is not set");
  process.exit(1);
}

function parseFrontmatter(content) {
  // Normalize line endings to \n
  content = content.replace(/\r\n/g, "\n");
  const match = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!match) return null;

  const meta = {};
  for (const line of match[1].split("\n")) {
    const m = line.match(/^(\w+):\s*(.+)$/);
    if (!m) continue;
    let val = m[2].trim();
    // Remove quotes
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    // Parse arrays
    if (val.startsWith("[")) {
      try { val = JSON.parse(val); } catch { val = val.slice(1, -1).split(",").map(s => s.trim().replace(/['"]/g, "")); }
    }
    // Parse null/boolean
    if (val === "null") val = null;
    if (val === "true") val = true;
    if (val === "false") val = false;
    meta[m[1]] = val;
  }

  return { meta, body: match[2].trim() };
}

function writeFrontmatter(filePath, meta, body) {
  const lines = ["---"];
  for (const [key, val] of Object.entries(meta)) {
    if (val === null) {
      lines.push(`${key}: null`);
    } else if (typeof val === "boolean") {
      lines.push(`${key}: ${val}`);
    } else if (Array.isArray(val)) {
      lines.push(`${key}: ${JSON.stringify(val)}`);
    } else {
      lines.push(`${key}: "${val}"`);
    }
  }
  lines.push("---");
  lines.push("");
  lines.push(body);
  lines.push("");
  fs.writeFileSync(filePath, lines.join("\n"), "utf-8");
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function apiCall(method, endpoint, data, retries = 3) {
  const url = endpoint.startsWith("http") ? endpoint : `${API_BASE}${endpoint}`;
  const opts = {
    method,
    headers: {
      "api-key": API_KEY,
      "Content-Type": "application/json",
    },
  };
  if (data) opts.body = JSON.stringify(data);

  for (let attempt = 1; attempt <= retries; attempt++) {
    const res = await fetch(url, opts);
    if (res.status === 429) {
      const retryAfter = res.headers.get("retry-after");
      const wait = retryAfter ? parseInt(retryAfter, 10) : attempt * 30;
      console.log(`    [RATE LIMIT] Waiting ${wait}s before retry ${attempt}/${retries}...`);
      await sleep(wait * 1000);
      continue;
    }
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`API ${method} ${url} failed (${res.status}): ${text}`);
    }
    return res.json();
  }
  throw new Error(`API ${method} ${url} failed after ${retries} retries (rate limited)`);
}

function buildArticlePayload(meta, body, published) {
  const article = {
    title: meta.title,
    body_markdown: body,
    published,
    tags: meta.tags || [],
  };
  // Featured section requires main_image — always set if available
  if (meta.main_image) article.main_image = meta.main_image;
  // description shown in feed cards and search results (max 150 chars)
  if (meta.description) article.description = meta.description;
  if (meta.series) article.series = meta.series;
  if (meta.canonical_url) article.canonical_url = meta.canonical_url;
  return { article };
}

async function createArticle(meta, body) {
  return apiCall("POST", "", buildArticlePayload(meta, body, false));
}

async function updateArticle(id, meta, body, publish) {
  return apiCall("PUT", `/${id}`, buildArticlePayload(meta, body, publish));
}

/**
 * marketing_events テーブルに upsert (Phase 2-A 経路 2 — Dev.to publish hook)
 * SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY が未設定なら silent skip。
 * external_id = devto-{devto_id} で UNIQUE 制約により冪等。
 */
async function upsertMarketingEventDevto({ devtoId, articleSlug, title, tags, publishedAt }) {
  const supabaseUrl = (process.env.SUPABASE_URL || "").replace(/\/$/, "");
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
  if (!supabaseUrl || !key) {
    console.log("    [marketing_events] env 未設定 — skip");
    return;
  }
  const eventTime = (publishedAt instanceof Date ? publishedAt : new Date()).toISOString();
  const eventDate = eventTime.slice(0, 10);
  const url = `https://dev.to/${articleSlug}`;
  const externalId = `devto-${devtoId}`;
  const body = {
    event_date: eventDate,
    event_time: eventTime,
    channel: "devto",
    action_type: "article",
    extension_id: null, // Dev.to 記事は基本横断的、必要なら手動で extension_id を後付け
    url,
    external_id: externalId,
    metadata: {
      devto_id: devtoId,
      title,
      tags: Array.isArray(tags) ? tags : [],
      source: "homepage/dev-to/publish.mjs",
    },
  };
  try {
    const res = await fetch(
      `${supabaseUrl}/rest/v1/marketing_events?on_conflict=channel,external_id`,
      {
        method: "POST",
        headers: {
          apikey: key,
          Authorization: `Bearer ${key}`,
          "Content-Type": "application/json",
          Prefer: "resolution=merge-duplicates,return=minimal",
        },
        body: JSON.stringify(body),
      },
    );
    if (res.ok) {
      console.log(`    [marketing_events] ✅ upsert OK: ${externalId}`);
    } else {
      const t = await res.text();
      console.error(`    [marketing_events] ⚠️ upsert ${res.status}: ${t.slice(0, 200)}`);
    }
  } catch (e) {
    console.error(`    [marketing_events] upsert exception: ${e.message}`);
  }
}

/**
 * 記事公開時にBluesky/Threads向けのSNS投稿下書きをコンソールに出力
 * タイトル + リンク + タグをスレッド形式に変換
 */
function generateSnsPost(title, url, tags) {
  // Bluesky向け（EN、300文字制限、ハッシュタグあり）
  const blueskyTags = tags.slice(0, 3).map(t => `#${t}`).join(" ");
  const bluesky = `${title}\n\n${url}\n\n${blueskyTags} #buildinpublic`.slice(0, 300);

  // Threads向け（JP、500文字制限、トピックタグ1個）
  const jpTitle = `新記事を公開しました 📝\n\n「${title}」\n\nChrome拡張を作った実体験と技術的な詳細をまとめました。\n\n${url}\n\n#個人開発`;
  const threads = jpTitle.slice(0, 500);

  console.log("\n" + "=".repeat(50));
  console.log("📣 SNS投稿下書き（手動で投稿してください）");
  console.log("=".repeat(50));
  console.log("\n【Bluesky (EN)】");
  console.log(bluesky);
  console.log("\n【Threads (JP)】");
  console.log(threads);
  console.log("=".repeat(50) + "\n");
}

async function main() {
  const today = new Date().toISOString().slice(0, 10);
  console.log(`[${today}] Dev.to Scheduled Publisher started`);

  const files = fs.readdirSync(ARTICLES_DIR).filter(f => f.endsWith(".md")).sort();
  console.log(`Found ${files.length} article(s)`);

  let published = 0;
  let synced = 0;
  let skipped = 0;
  let errors = 0;
  let changed = false;

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    if (i > 0) await sleep(5000); // 5s delay between articles
    const filePath = path.join(ARTICLES_DIR, file);
    const content = fs.readFileSync(filePath, "utf-8");
    const parsed = parseFrontmatter(content);

    if (!parsed) {
      console.log(`  [SKIP] ${file}: invalid frontmatter`);
      skipped++;
      continue;
    }

    const { meta, body } = parsed;
    console.log(`\n  Processing: ${file}`);
    console.log(`    title: ${meta.title}`);
    console.log(`    publish_date: ${meta.publish_date}`);
    console.log(`    devto_id: ${meta.devto_id || "none"}`);
    console.log(`    published: ${meta.published}`);

    try {
      // Step 1: Create draft if no devto_id
      if (!meta.devto_id) {
        console.log("    -> Creating draft on Dev.to...");
        const result = await createArticle(meta, body);
        meta.devto_id = result.id;
        writeFrontmatter(filePath, meta, body);
        changed = true;
        console.log(`    -> Created draft (id: ${result.id})`);
        synced++;
      }

      // Step 2: Publish if publish_date has arrived and not yet published
      if (meta.publish_date && meta.publish_date <= today && !meta.published) {
        console.log("    -> Publishing...");
        const result = await updateArticle(meta.devto_id, meta, body, true);
        meta.published = true;
        writeFrontmatter(filePath, meta, body);
        changed = true;
        console.log(`    -> Published!`);
        published++;

        // SNS投稿下書き自動生成
        const devtoUrl = result?.url || `https://dev.to/ktg/${meta.devto_id}`;
        generateSnsPost(meta.title, devtoUrl, meta.tags || []);

        // marketing_events upsert (Phase 2-A 経路 2)
        const slug = result?.slug || meta.devto_id;
        await upsertMarketingEventDevto({
          devtoId: meta.devto_id,
          articleSlug: result?.path?.replace(/^\//, "") || `ktg/${slug}`,
          title: meta.title,
          tags: meta.tags || [],
          publishedAt: result?.published_at ? new Date(result.published_at) : new Date(),
        });
      } else if (meta.published) {
        // Already published, skip (no need to sync every day)
        console.log("    -> Already published, skipping.");
        skipped++;
      } else {
        // Not yet time to publish, skip draft update
        console.log(`    -> Scheduled for ${meta.publish_date}, skipping.`);
        skipped++;
      }
    } catch (err) {
      console.error(`    [ERROR] ${file}: ${err.message}`);
      errors++;
    }
  }

  console.log(`\nDone: ${published} published, ${synced} synced, ${skipped} skipped, ${errors} errors`);
  if (changed) {
    console.log("FILES_CHANGED=true");
  }
  if (errors > 0) {
    process.exit(1);
  }
}

main().catch(e => {
  console.error("Fatal error:", e);
  process.exit(1);
});
