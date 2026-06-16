/**
 * sync-published-titles.mjs
 *
 * One-time sync: push updated title/tags from frontmatter to Dev.to
 * for articles that are already published (publish.mjs skips these).
 *
 * Usage: DEVTO_API_KEY=... node dev-to/sync-published-titles.mjs
 *
 * Run from C:/Company/homepage/:
 *   DEVTO_API_KEY=xxx node dev-to/sync-published-titles.mjs
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ARTICLES_DIR = path.join(__dirname, "articles");
const API_KEY = process.env.DEVTO_API_KEY;

if (!API_KEY) {
  console.error("DEVTO_API_KEY is not set");
  process.exit(1);
}

// Articles changed 2026-06-16 (b-1 title/tag optimization)
const CHANGED_FILES = [
  "x-detox.md",
  "snapreply.md",
  "yahoo-comfort-mode.md",
  "datatransfer.md",
  "dev-tools-hub.md",
  "toritekicheck.md",
  "tverplus.md",
];

function parseFrontmatter(content) {
  content = content.replace(/\r\n/g, "\n");
  const match = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!match) return null;

  const meta = {};
  for (const line of match[1].split("\n")) {
    const m = line.match(/^(\w+):\s*(.+)$/);
    if (!m) continue;
    let val = m[2].trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    if (val.startsWith("[")) {
      try { val = JSON.parse(val); } catch { val = val.slice(1, -1).split(",").map(s => s.trim().replace(/['"]/g, "")); }
    }
    if (val === "null") val = null;
    if (val === "true") val = true;
    if (val === "false") val = false;
    meta[m[1]] = val;
  }
  return { meta, body: match[2].trim() };
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function updateArticle(id, title, tags) {
  const url = `https://dev.to/api/articles/${id}`;
  const res = await fetch(url, {
    method: "PUT",
    headers: {
      "api-key": API_KEY,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ article: { title, tags } }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`PUT /articles/${id} failed (${res.status}): ${text.slice(0, 200)}`);
  }
  return res.json();
}

async function main() {
  console.log(`Syncing ${CHANGED_FILES.length} articles to Dev.to...`);

  let success = 0;
  let failed = 0;

  for (let i = 0; i < CHANGED_FILES.length; i++) {
    const file = CHANGED_FILES[i];
    if (i > 0) await sleep(3000); // 3s between API calls

    const filePath = path.join(ARTICLES_DIR, file);
    const content = fs.readFileSync(filePath, "utf-8");
    const parsed = parseFrontmatter(content);

    if (!parsed) {
      console.log(`  [SKIP] ${file}: invalid frontmatter`);
      continue;
    }

    const { meta } = parsed;

    if (!meta.devto_id) {
      console.log(`  [SKIP] ${file}: no devto_id`);
      continue;
    }

    if (!meta.published) {
      console.log(`  [SKIP] ${file}: not published`);
      continue;
    }

    console.log(`\n  Syncing: ${file}`);
    console.log(`    devto_id: ${meta.devto_id}`);
    console.log(`    title: ${meta.title}`);
    console.log(`    tags: ${JSON.stringify(meta.tags)}`);

    try {
      const result = await updateArticle(meta.devto_id, meta.title, meta.tags);
      console.log(`    -> OK: ${result.url}`);
      success++;
    } catch (err) {
      console.error(`    -> ERROR: ${err.message}`);
      failed++;
    }
  }

  console.log(`\nDone: ${success} synced, ${failed} failed`);
  if (failed > 0) process.exit(1);
}

main().catch(e => {
  console.error("Fatal:", e);
  process.exit(1);
});
