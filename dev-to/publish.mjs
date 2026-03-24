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

async function apiCall(method, endpoint, data) {
  const url = endpoint.startsWith("http") ? endpoint : `${API_BASE}${endpoint}`;
  const opts = {
    method,
    headers: {
      "api-key": API_KEY,
      "Content-Type": "application/json",
    },
  };
  if (data) opts.body = JSON.stringify(data);

  const res = await fetch(url, opts);
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`API ${method} ${url} failed (${res.status}): ${text}`);
  }
  return res.json();
}

async function createArticle(meta, body) {
  const payload = {
    article: {
      title: meta.title,
      body_markdown: body,
      published: false, // Always create as draft first
      tags: meta.tags || [],
    },
  };
  if (meta.series) payload.article.series = meta.series;
  if (meta.canonical_url) payload.article.canonical_url = meta.canonical_url;

  return apiCall("POST", "", payload);
}

async function updateArticle(id, meta, body, publish) {
  const payload = {
    article: {
      title: meta.title,
      body_markdown: body,
      tags: meta.tags || [],
      published: publish,
    },
  };
  if (meta.series) payload.article.series = meta.series;
  if (meta.canonical_url) payload.article.canonical_url = meta.canonical_url;

  return apiCall("PUT", `/${id}`, payload);
}

async function main() {
  const today = new Date().toISOString().slice(0, 10);
  console.log(`[${today}] Dev.to Scheduled Publisher started`);

  const files = fs.readdirSync(ARTICLES_DIR).filter(f => f.endsWith(".md"));
  console.log(`Found ${files.length} article(s)`);

  let published = 0;
  let synced = 0;
  let skipped = 0;

  for (const file of files) {
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

    // Step 1: Create draft if no devto_id
    if (!meta.devto_id) {
      console.log("    -> Creating draft on Dev.to...");
      const result = await createArticle(meta, body);
      meta.devto_id = result.id;
      writeFrontmatter(filePath, meta, body);
      console.log(`    -> Created draft (id: ${result.id})`);
      synced++;
    }

    // Step 2: Publish if publish_date has arrived and not yet published
    if (meta.publish_date && meta.publish_date <= today && !meta.published) {
      console.log("    -> Publishing...");
      await updateArticle(meta.devto_id, meta, body, true);
      meta.published = true;
      writeFrontmatter(filePath, meta, body);
      console.log(`    -> Published!`);
      published++;
    } else if (meta.published) {
      // Sync content update for already published articles
      console.log("    -> Already published, syncing content...");
      await updateArticle(meta.devto_id, meta, body, true);
      synced++;
    } else {
      // Update draft content
      console.log(`    -> Draft updated (publishes on ${meta.publish_date})`);
      await updateArticle(meta.devto_id, meta, body, false);
      skipped++;
    }
  }

  console.log(`\nDone: ${published} published, ${synced} synced, ${skipped} skipped`);
}

main().catch(e => {
  console.error("Fatal error:", e);
  process.exit(1);
});
