---
title: "I Built a Chrome Extension That Lets You Leave Notes on Any Webpage"
published: false
tags: ["chromeextension","notes","productivity","webdev"]
series: null
canonical_url: null
publish_date: "2026-04-15"
devto_id: "3392103"
---

I have a problem with web pages. I visit a page, find something important, make a mental note about it, and then completely forget what I was thinking when I return to that page three days later. Maybe it was a documentation page where I figured out a tricky configuration. Maybe it was a Stack Overflow answer that almost solved my problem but needed a small tweak. Maybe it was a product page where I noted the price was too high and wanted to check back later.

The information is not in the page itself -- it is the context I had while reading it. And that context evaporates the moment I close the tab.

So I built **PageMemo** -- a Chrome extension that lets you attach rich-text notes to any URL. When you visit a page that has a note, it is right there waiting for you in the side panel. No account required. No cloud sync to worry about. Everything stays local on your machine.

## The Core Idea: URL-Linked Notes

The fundamental design principle is simple: every note is tied to a normalized URL. When you navigate to a page, the extension checks if there is a note for that URL. If there is, it loads automatically into the side panel.

URL normalization is important here. The same page can be reached through different URLs depending on query parameters, trailing slashes, and fragments. Without normalization, you would end up with orphaned notes that never appear.

```javascript
export const normalizeUrl = (url) => {
  try {
    const parsed = new URL(url);
    if (!parsed.protocol.startsWith('http')) {
      return null;
    }
    let path = parsed.pathname;
    if (path.length > 1 && path.endsWith('/')) {
      path = path.slice(0, -1);
    }
    return `${parsed.origin}${path}`;
  } catch (e) {
    return null;
  }
};
```

This strips query parameters, removes trailing slashes (except for the root path), and rejects non-HTTP URLs like `chrome://` and `extension://` pages. The result is that `https://example.com/docs/api?ref=nav` and `https://example.com/docs/api/` both resolve to the same normalized key: `https://example.com/docs/api`.

There is a deliberate trade-off here. Stripping query parameters means that `?page=1` and `?page=2` share the same note. For most sites this is the right behavior -- the query string is tracking noise. But for sites where query parameters define the actual content (like search results), it means notes get attached to the search page itself rather than to individual result sets. In practice, users want notes on content pages, not search result pages, so this works out.

## Rich Text Editing with Tiptap

Plain text notes are limiting. When you are documenting a code workaround, you want code blocks. When you are taking meeting notes, you want checkboxes. When you are collecting research links, you want actual hyperlinks.

PageMemo uses Tiptap as its rich text editor. Tiptap is built on top of ProseMirror, which provides the low-level editing engine, while Tiptap adds a clean extension-based API on top. The editor is configured with a specific set of extensions:

```javascript
const editor = new Editor({
  element: element,
  extensions: [
    StarterKit.configure({
      heading: { levels: [1, 2, 3] },
      codeBlock: false,
    }),
    Placeholder.configure({
      placeholder: 'Write your notes here...',
    }),
    Link.configure({
      openOnClick: true,
      HTMLAttributes: {
        target: '_blank',
        rel: 'noopener noreferrer',
      },
    }),
    TaskList,
    TaskItem.configure({ nested: true }),
    Underline,
    Highlight.configure({ multicolor: false }),
    TextAlign.configure({
      types: ['heading', 'paragraph'],
    }),
  ],
  content: initialContent,
  onUpdate: ({ editor }) => {
    const html = editor.getHTML();
    if (onUpdate) {
      onUpdate(html);
    }
  },
});
```

The feature set was carefully curated. Headings (three levels), bold, italic, underline, highlight, bullet lists, numbered lists, task lists with checkboxes, links, and text alignment. Code blocks were intentionally disabled -- for heavy code annotation, I have another extension (SnippetVault). PageMemo is for prose, checklists, and quick context notes.

Task lists with nested support deserve special mention. The ability to create checkbox-based to-do lists that nest under each other turns PageMemo into a lightweight task tracker for page-specific work. When you are reviewing a PR on GitHub, you can make a checklist of issues to address, and it will be waiting for you every time you return to that PR URL.

## Auto-Save: Never Lose a Note

There is no save button. Every keystroke triggers Tiptap's `onUpdate` callback, which writes the note to `chrome.storage.local`. This is intentionally aggressive -- the worst user experience is losing a note because you forgot to save before closing the tab.

```javascript
export const saveNote = async (url, content, categoryId = null, title = null) => {
  const key = normalizeUrl(url);
  if (!key) return false;

  const { notes = {} } = await chrome.storage.local.get("notes");
  const isEmptyContent = !content || content === '<p></p>' || content.trim() === '';

  if (isEmptyContent) {
    delete notes[key];
  } else {
    notes[key] = {
      content: content,
      title: title !== null ? title : notes[key]?.title || null,
      categoryId: categoryId !== null ? categoryId : notes[key]?.categoryId || null,
      updatedAt: Date.now(),
      createdAt: notes[key]?.createdAt || Date.now()
    };
  }

  await chrome.storage.local.set({ notes });
  return true;
};
```

A few design decisions are embedded in this function. Empty content triggers deletion rather than storing an empty note -- this keeps the storage clean. The function preserves existing `categoryId` and `title` values when they are not explicitly passed, which prevents accidental data loss during normal editing. And `createdAt` is only set once, on first save, while `updatedAt` changes on every save.

One thing to note: writing to `chrome.storage.local` on every keystroke could theoretically be expensive. In practice, Chrome's storage API batches writes internally, and Tiptap's `onUpdate` fires per transaction rather than per individual character. So the actual write frequency is reasonable.

## The Side Panel: Chrome's Best-Kept Secret API

PageMemo uses Chrome's Side Panel API (`chrome.sidePanel`) rather than a popup or a separate tab. The side panel slides open from the right edge of the browser and stays open as you navigate between tabs. This is critical for a note-taking tool -- you need to see the note and the page simultaneously.

The manifest declares the side panel:

```json
{
  "side_panel": {
    "default_path": "sidepanel/index.html"
  },
  "permissions": ["sidePanel", "tabs", "storage", "unlimitedStorage"]
}
```

The `tabs` permission lets the service worker detect when the user switches tabs or navigates to a new URL, triggering a note lookup for the new page. The `unlimitedStorage` permission removes the default storage cap, which matters because rich-text HTML notes are larger than plain text.

When the active tab changes, the background service worker sends the new URL to the side panel, which normalizes it and looks up the corresponding note. If a note exists, the editor content is replaced. If not, the editor shows the placeholder text. This happens transparently -- the user just sees their notes appear and disappear as they switch between tabs.

## Category System for Organization

As your note collection grows, you need a way to organize it. PageMemo includes a category system with color-coded labels:

```javascript
const DEFAULT_CATEGORIES = [
  { id: 'work', name: 'Work', color: '#228be6' },
  { id: 'personal', name: 'Personal', color: '#40c057' },
  { id: 'learning', name: 'Learning', color: '#fab005' },
];
```

Users can create custom categories with any name and color. Each note can be assigned to one category, and the notes list view can be filtered by category or by "uncategorized." When a category is deleted, all notes in that category are moved to uncategorized rather than deleted.

```javascript
export const deleteCategory = async (id) => {
  let categories = await getCategories();
  categories = categories.filter(c => c.id !== id);
  await chrome.storage.local.set({ categories });

  // Reassign notes in deleted category
  const { notes = {} } = await chrome.storage.local.get("notes");
  let updated = false;
  Object.keys(notes).forEach(key => {
    if (notes[key].categoryId === id) {
      notes[key].categoryId = null;
      updated = true;
    }
  });
  if (updated) {
    await chrome.storage.local.set({ notes });
  }
};
```

This cascading update ensures data integrity. It runs in a single pass over all notes, which is efficient even with hundreds of notes.

## Multi-Language Support from Day One

PageMemo supports multiple languages through Chrome's `_locales` system with the `__MSG_extName__` pattern in the manifest. The extension name, description, and UI strings are all localizable. The `default_locale` is set to English, but the extension includes translations from the start.

Internationalization was not an afterthought -- it was built into the first version. The reason is practical: Chrome Web Store shows localized extension names in search results, and having translations significantly improves discoverability in non-English markets. For a productivity tool, the potential audience is global.

## Privacy by Design: No Account, No Cloud

PageMemo stores everything in `chrome.storage.local`. There is no server, no account creation, no cloud sync. Your notes never leave your machine.

This was a deliberate product decision, not a shortcut. Note-taking tools that require sign-up have a major adoption barrier. Users do not want to create another account just to jot down a quick thought about a webpage. And for notes that might contain sensitive information -- passwords, internal URLs, project details -- local-only storage removes the trust question entirely.

The trade-off is obvious: no sync across devices. But for a browser-extension-based note tool, this is acceptable. Your notes are tied to URLs you visit in Chrome, so they are inherently scoped to the machine where you browse.

## Building the Service Worker

The background service worker ties everything together. It listens for tab activation events and navigation events, then notifies the side panel about the current URL:

```javascript
chrome.tabs.onActivated.addListener(async (activeInfo) => {
  const tab = await chrome.tabs.get(activeInfo.tabId);
  if (tab.url) {
    notifySidePanel(tab.url);
  }
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.url && tab.active) {
    notifySidePanel(changeInfo.url);
  }
});
```

The service worker also manages the extension's action button behavior. Clicking the toolbar icon opens the side panel. This uses the `chrome.sidePanel.open()` API, which is the modern replacement for the old popup approach.

One gotcha with Manifest V3 service workers: they can be terminated at any time by the browser. There is no persistent state in memory. Every time the service worker wakes up, it re-registers its listeners. This is fine for PageMemo because all persistent state is in `chrome.storage.local`, and the service worker is purely reactive -- it responds to tab events and forwards information.

## The Build System: Vite with Dual Configs

The project uses Vite for building, but with an unusual setup -- two separate Vite configurations. One builds the side panel as a standard web app (HTML + JS + CSS), and the other builds the service worker as a standalone JavaScript file:

```json
{
  "build": "vite build && vite build --config vite.config.sw.js"
}
```

The side panel can use ES modules, dynamic imports, and all the features you would expect in a modern web app. But the service worker has strict constraints -- it must be a single JavaScript file that Chrome can register. The separate config handles bundling all service worker code into one file.

## Lessons from Shipping a Free Extension

**1. The side panel is underused.** Most Chrome extensions still use popups, which close the moment you click outside them. The Side Panel API was introduced in Chrome 114, and it is perfect for tools that need persistent UI alongside the page. More developers should use it.

**2. URL normalization is harder than it looks.** Every site has different URL conventions. Some use hash-based routing (`/#/page`), some use query parameters for content (`?id=123`), some use both. The normalization function is a compromise -- it works well for most sites but will never be perfect for all of them.

**3. Rich text storage is expensive.** A Tiptap document with headings, lists, and links generates substantially more HTML than the equivalent plain text. With `unlimitedStorage`, this is not a practical problem, but it means the `chrome.storage.local.get('notes')` call returns increasingly large objects as the user creates more notes. For a future version, a paginated storage approach (storing each note under its own key rather than in a single `notes` object) would scale better.

**4. Auto-save creates trust.** Users who have lost notes in other apps immediately notice when they close the panel and reopen it to find their note intact. The aggressive auto-save is the single most praised feature in user feedback, even though it is technically the simplest part of the codebase.

## Try It Out

If you are the kind of person who keeps mental notes about web pages -- and then forgets them -- PageMemo might change your workflow. Open the side panel, type your thoughts, navigate away, come back, and the note is there. No account required, no setup, no friction.

{% embed https://chromewebstore.google.com/detail/jmpmfbheoclfmceceihjpcjlabakkdde %}

---

*Other tools I've built:*

{% embed https://chromewebstore.google.com/detail/zenread/adoiakplckmoahmiainobfpmdomnhomj %}

{% embed https://chromewebstore.google.com/detail/snippetvault/gnnmjklohcoaiheikefoifiekcnndcdi %}
