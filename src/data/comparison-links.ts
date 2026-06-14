/**
 * Extension slug → comparison page mappings
 * Used by ExtensionLayout to show "See how it compares" links
 */
export const comparisonsByExtension: Record<string, { slug: string; theirs: string; desc: string }[]> = {
  datapick: [
    { slug: "datapick-vs-instant-data-scraper", theirs: "Instant Data Scraper", desc: "Point-and-click vs AI auto-detection" },
    { slug: "datapick-vs-web-scraper", theirs: "Web Scraper", desc: "No-code vs CSS selectors" },
    { slug: "datapick-vs-listly", theirs: "Listly", desc: "Privacy-first vs cloud scraping" },
  ],
  arbitra: [
    { slug: "arbitra-vs-keepa", theirs: "Keepa", desc: "Multi-marketplace arbitrage vs Amazon-only tracking" },
  ],
  "shorts-killer": [
    { slug: "shorts-killer-vs-unhook", theirs: "Unhook", desc: "Screen time tracking vs UI element removal" },
  ],
  "x-detox": [
    { slug: "x-detox-vs-control-panel-for-twitter", theirs: "Control Panel for Twitter", desc: "Timeline cleanup tools compared" },
  ],
  zenread: [
    { slug: "zenread-vs-mercury-reader", theirs: "Mercury Reader", desc: "Reader mode with TTS vs classic simplicity" },
  ],
  snapreply: [
    { slug: "snapreply-vs-gmail-templates", theirs: "Gmail Templates", desc: "Variables and folders vs basic templates" },
  ],
  promptstash: [
    { slug: "promptstash-vs-promptbox", theirs: "PromptBox", desc: "One-time pricing vs monthly subscription" },
  ],
  readmark: [
    { slug: "readmark-vs-liner", theirs: "Liner", desc: "Reading progress vs AI highlighting" },
  ],
  onpagex: [
    { slug: "onpagex-vs-detailed-seo-extension", theirs: "Detailed SEO Extension", desc: "Scoring system vs raw meta data" },
  ],
  "japanese-font-finder": [
    { slug: "japanese-font-finder-vs-whatfont", theirs: "WhatFont", desc: "Japanese font support vs Western-only" },
  ],
  procshot: [
    { slug: "procshot-vs-scribe", theirs: "Scribe", desc: "Local-first vs $23/month cloud tool" },
  ],
  cookiejar: [
    { slug: "cookiejar-vs-editthiscookie", theirs: "EditThisCookie", desc: "MV3-ready vs removed from Chrome" },
  ],
  reshapic: [
    { slug: "reshapic-vs-image-resizer", theirs: "Image Resizer", desc: "WebP/AVIF conversion vs basic resizing" },
  ],
};

/** Top comparisons for the homepage "Popular Comparisons" section */
export const popularComparisons = [
  { slug: "datapick-vs-instant-data-scraper", ours: "DataPick", theirs: "Instant Data Scraper", icon: "/ext-icons/datapick.webp" },
  { slug: "procshot-vs-scribe", ours: "Procshot", theirs: "Scribe", icon: "/ext-icons/procshot.png" },
  { slug: "shorts-killer-vs-unhook", ours: "Shorts Killer", theirs: "Unhook", icon: "/ext-icons/shorts-killer.webp" },
  { slug: "snapreply-vs-gmail-templates", ours: "SnapReply", theirs: "Gmail Templates", icon: "/ext-icons/snapreply.webp" },
  { slug: "cookiejar-vs-editthiscookie", ours: "CookieJar", theirs: "EditThisCookie", icon: "/ext-icons/cookiejar.png" },
  { slug: "promptstash-vs-promptbox", ours: "PromptStash", theirs: "PromptBox", icon: "/ext-icons/promptstash.webp" },
];
