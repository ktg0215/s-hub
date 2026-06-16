---
title: "I Built a Clipboard History Extension. chrome.storage Hit Its Limit. Here's What I Learned."
published: false
tags: ["chrome","mv3","buildinpublic","indiehacker"]
series: null
canonical_url: null
publish_date: "2026-06-17"
devto_id: null
---

I built ClipStack to capture and search clipboard history across browser tabs. It worked fine for the first week. Then users with heavy workflows started reporting that their oldest entries were silently disappearing — not on crash, not on refresh, just gone. The extension was eating its own history.

The culprit was `chrome.storage.local`'s 10MB ceiling. Here's how I migrated to IndexedDB, what broke in the process, and what I'd do differently.

## The Problem: chrome.storage.local Is Not a Database

`chrome.storage.local` is convenient — it's synchronous-ish, it syncs changes via listeners, and it requires no setup. But it has two hard limits that matter for a clipboard manager:

- **10MB total** (default) across all keys
- **8KB per value** for `chrome.storage.sync` (even tighter if you ever need cross-device sync)

For text-only entries, 10MB sounds generous. But clipboard managers often capture:
- Rich text (HTML + plain text = 2× storage per entry)
- Base64-encoded images (a single screenshot = 1-3MB)
- Code blocks with syntax metadata

ClipStack users who copy-paste images or work with long JSON payloads were filling 10MB in under 100 entries. The extension silently dropped the oldest entries to make room — no error, no warning, just vanishing history.

## Why IndexedDB

IndexedDB has no practical per-database size limit beyond available disk. Chrome's quota system allocates a percentage of available disk space (typically 60%), which means a device with 100GB free can store 60GB of IndexedDB data. Even for the most clipboard-heavy user, that's irrelevant headroom.

Other advantages that mattered for ClipStack:

- **Cursor-based iteration**: I can page through 10,000 entries without loading them all into memory
- **Indices**: I added an index on `timestamp` and `content_hash` for fast dedup lookup
- **Structured data**: Store entries as objects, not JSON-serialized strings

The downside: IndexedDB is callback-based and verbose. I wrapped it in a Promise utility layer to keep the rest of the codebase clean.

## The Migration: One-Time on Update

When ClipStack updates from the old version (storage.local) to the new one (IndexedDB), users have existing history. Throwing it away would be a terrible first impression of the upgrade.

The migration runs once on `chrome.runtime.onInstalled` with `reason === 'update'`:

```typescript
chrome.runtime.onInstalled.addListener(async ({ reason }) => {
  if (reason !== 'update') return;

  const migrated = await getFlag('idb_migrated');
  if (migrated) return;

  await migrateStorageToIndexedDB();
  await setFlag('idb_migrated', true);
});
```

The migration reads all entries from storage.local, writes them to IndexedDB in batches, then clears storage.local:

```typescript
async function migrateStorageToIndexedDB(): Promise<void> {
  const data = await chrome.storage.local.get(null);
  const entries = Object.entries(data)
    .filter(([key]) => key.startsWith('clip_'))
    .map(([_, val]) => val as ClipEntry);

  if (entries.length === 0) return;

  const db = await openDB();
  const tx = db.transaction('clips', 'readwrite');
  const store = tx.objectStore('clips');

  for (const entry of entries) {
    store.put(entry); // Non-blocking within transaction
  }

  await new Promise<void>((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });

  // Only clear after transaction commits
  await chrome.storage.local.remove(
    entries.map(e => `clip_${e.id}`)
  );
}
```

The key ordering here: **don't remove from storage.local until the IndexedDB transaction commits**. If the service worker is killed mid-migration (which can happen in MV3), the old data is still there on next wake.

## Service Worker Termination: The Real Challenge

MV3 service workers can be terminated at any time — after 30 seconds of inactivity, when Chrome is under memory pressure, or seemingly at random during development. This creates a problem that doesn't exist in MV2 background pages.

An IndexedDB transaction that hasn't committed yet gets abandoned when the SW dies. Unlike `chrome.storage` where writes are atomic, IndexedDB writes inside an uncommitted transaction are invisible to readers.

My first version had a bug: I was opening a transaction, writing to it, and awaiting a series of Promises — but if the SW was killed between writes, the transaction would roll back. The entry was "written" from the code's perspective but never visible to readers.

The fix: keep transactions short and commit them immediately after the write:

```typescript
async function saveClip(entry: ClipEntry): Promise<void> {
  const db = await openDB();

  // One entry = one transaction. Don't batch unless you handle rollback.
  return new Promise((resolve, reject) => {
    const tx = db.transaction('clips', 'readwrite');
    const req = tx.objectStore('clips').put(entry);

    req.onsuccess = () => {};
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(new Error('Transaction aborted'));
  });
}
```

One transaction per entry write. This is slightly less efficient than batching, but it means each write either fully commits or fails cleanly — no half-written state.

## Content Dedup With a Hash Index

ClipStack captures clipboard changes via `navigator.clipboard.readText()` on a polling interval. Without deduplication, copying the same text twice creates two identical entries.

The dedup check needs to be fast — it runs on every clipboard change. I added a content_hash index to the IndexedDB schema:

```typescript
function upgradeDB(db: IDBDatabase): void {
  const store = db.createObjectStore('clips', { keyPath: 'id' });
  store.createIndex('by_timestamp', 'timestamp', { unique: false });
  store.createIndex('by_hash', 'content_hash', { unique: false });
}
```

The dedup lookup uses the index to find the most recent entry with the same hash before inserting:

```typescript
async function isDuplicate(hash: string, windowMs = 5000): Promise<boolean> {
  const db = await openDB();
  const cutoff = Date.now() - windowMs;

  return new Promise((resolve, reject) => {
    const tx = db.transaction('clips', 'readonly');
    const index = tx.objectStore('clips').index('by_hash');
    const range = IDBKeyRange.only(hash);
    const req = index.openCursor(range, 'prev'); // Latest first

    req.onsuccess = () => {
      const cursor = req.result;
      if (!cursor) { resolve(false); return; }
      resolve(cursor.value.timestamp > cutoff);
    };
    req.onerror = () => reject(req.error);
  });
}
```

The 5-second window avoids treating rapid copy→paste→copy of the same text as a dedup case when the user genuinely wants two separate entries.

## Lessons

**Don't use chrome.storage.local for unbounded data.** It's fine for settings, flags, and small amounts of user-specific state. As soon as the data can grow without a known upper bound, move to IndexedDB from the start.

**MV3 SW termination is real.** During development the SW stays alive because of DevTools being open. In production, it dies constantly. Any code that holds state across async calls (open transaction + await + more writes) will silently fail on a real user's machine.

**One transaction per write is the safe default.** Batch writes only after you've proven the performance cost justifies the complexity and you've handled rollback.

**Migrate data before removing the old store.** Commit to IndexedDB → verify → then clear storage.local. Reversing this order means any interruption results in data loss.

ClipStack is live on the Chrome Web Store — clipboard history that doesn't silently eat itself.

{% embed https://chromewebstore.google.com/detail/clipboard-manager-text-sn/lkdcdpbenhhgncjfdfhnbfdenbkkihhk %}

What storage approach are you using for unbounded extension data? Curious if anyone's tried Cache API as an alternative to IndexedDB.

---

*Built with WXT + TypeScript. IndexedDB wrapper with Promise utilities.*
