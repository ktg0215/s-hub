export interface Extension {
  name: string;
  description: string;
  price: string;
  priceNote?: string;
  url: string;
  icon?: string;
  status?: 'available' | 'coming-soon';
}

export interface Category {
  title: string;
  extensions: Extension[];
}

export const categories: Category[] = [
  {
    title: "Digital Wellbeing",
    extensions: [
      {
        name: "Shorts Killer",
        description: "Hide YouTube Shorts, track usage time, set daily limits. Take control of your YouTube experience.",
        price: "Free",
        url: "/extensions/shorts-killer/",
        icon: "/ext-icons/shorts-killer.webp",
      },
      {
        name: "X Detox",
        description: "Clean up your X (Twitter) experience by removing algorithms and distractions.",
        price: "Free Trial / $3.99/mo",
        url: "/extensions/x-detox/",
        icon: "/ext-icons/x-detox.png",
      },
      {
        name: "FocusGuard",
        description: "Block distracting sites and boost productivity with a Pomodoro timer. Gentle but effective site blocking.",
        price: "Free Trial / $3.99/mo",
        url: "/extensions/focusguard/",
        icon: "/ext-icons/focusguard.png",
      },
    ],
  },
  {
    title: "Design Tools",
    extensions: [
      {
        name: "PaletteGrab",
        description: "MV3 color picker & palette manager. Pick colors with Chrome's EyeDropper API, build named palettes, export to CSS variables, Tailwind config, or Figma JSON.",
        price: "Free / Pro $3.99",
        url: "/extensions/palettegrab/",
        icon: "/ext-icons/palettegrab.png",
      },
      {
        name: "ColorThief",
        description: "Right-click any image to extract an 8-color palette. Copy as HEX, RGB, HSL, or Figma JSON. K-means++ clustering runs entirely in your browser.",
        price: "Free",
        url: "/extensions/colorthief/",
        icon: "/ext-icons/colorthief.png",
      },
    ],
  },
  {
    title: "Productivity",
    extensions: [
      {
        name: "Yahoo快適モード",
        description: "Yahoo!ニュースの低品質記事を自動フィルタリング。こたつ記事や炎上記事を非表示にして、快適な閲覧体験を。",
        price: "無料 / Pro ¥700",
        url: "/extensions/yahoo-kaiteki-mode/",
        icon: "/ext-icons/yahoo-kaiteki-mode.webp",
      },
      {
        name: "物件スカウター（賃貸版）",
        description: "SUUMOの賃貸物件を効率比較。㎡単価・初期費用・年間コストを自動計算、AI賃料判定付き。",
        price: "Free",
        url: "/extensions/bukken-scouter-rental/",
        icon: "/ext-icons/bukken-scouter-rental.webp",
      },
      {
        name: "ClipStack",
        description: "Auto-save clipboard history with fuzzy search powered by Fuse.js. Pin clips, recopy in one click. Free: 20 items. Pro: unlimited + export.",
        price: "Free / Pro $3.99",
        url: "/extensions/clipstack/",
        icon: "/ext-icons/clipstack.png",
      },
      {
        name: "PromptStash",
        description: "Save, organize, and reuse AI prompts effortlessly. Works with ChatGPT, Claude, Gemini, and 16+ other AI services.",
        price: "Free Trial / $3.99/mo",
        url: "/extensions/promptstash/",
        icon: "/ext-icons/promptstash.webp",
      },
      {
        name: "Japanese Font Finder",
        description: "Instantly detect font information on any webpage. Full support for Japanese fonts.",
        price: "Free",
        url: "/extensions/japanese-font-finder/",
        icon: "/ext-icons/japanese-font-finder.webp",
      },
      {
        name: "DataPick",
        description: "Extract data from any website with just a few clicks. Export to CSV, Excel, or Google Sheets.",
        price: "Free / Pro $19 (one-time)",
        url: "/extensions/datapick/",
        icon: "/ext-icons/datapick.webp",
      },
      {
        name: "DataBridge",
        description: "Transfer data between web pages with visual element mapping. Match elements by number and transfer with one click.",
        price: "Free / Pro $6",
        url: "/extensions/databridge/",
        icon: "/ext-icons/databridge.webp",
      },
      {
        name: "ReadMark",
        description: "Automatically saves your reading position on any webpage. Never lose your place in long articles again.",
        price: "Free Trial / $3.99/mo",
        url: "/extensions/readmark/",
        icon: "/ext-icons/ReadMark.webp",
      },
      {
        name: "Procshot",
        description: "Auto-record browser actions to create step-by-step guides with screenshots. Export as PDF, Markdown, or HTML.",
        price: "Free / Pro $9/mo",
        url: "/extensions/procshot/",
        icon: "/ext-icons/procshot.png",
      },
      {
        name: "SnapReply for Gmail",
        description: "Quick email templates for Gmail. Save, manage, and insert templates with variables in seconds.",
        price: "Free / Pro",
        url: "/extensions/snapreply/",
        icon: "/ext-icons/snapreply.png",
      },
      {
        name: "ZenRead",
        description: "Distraction-free reader mode for any webpage. Remove ads and sidebars, customize themes and fonts for comfortable reading.",
        price: "Free",
        url: "/extensions/zenread/",
        icon: "/ext-icons/ZenRead.webp",
      },
      {
        name: "Header Editor",
        description: "Add custom HTTP request headers to any site. Set Authorization tokens, Content-Type, or debug headers per URL pattern. Uses declarativeNetRequest. Free: 5 rules. Pro: unlimited.",
        price: "Free / Pro $3.99/mo",
        url: "/extensions/header-editor/",
        icon: "/ext-icons/HeaderEditor.png",
      },
      {
        name: "Request Monitor",
        description: "Monitor XHR and fetch requests for the current tab in real time. Method/status color coding, duration, size, URL filter, XHR/Fetch type filter. No DevTools needed.",
        price: "Free",
        url: "/extensions/request-monitor/",
        icon: "/ext-icons/RequestMonitor.png",
      },
      {
        name: "Storage Inspector",
        description: "Browse, edit, and delete localStorage, sessionStorage, and cookies without DevTools. 3-tab popup with inline editing, JSON pretty-print, copy, search filter.",
        price: "Free",
        url: "/extensions/storage-inspector/",
        icon: "/ext-icons/StorageInspector.png",
      },
      {
        name: "Viewport Inspector",
        description: "Real-time viewport width badge in the toolbar — color matches the active Tailwind CSS breakpoint. Click for width, height, DPR, scroll position, and document size.",
        price: "Free",
        url: "/extensions/viewport-inspector/",
        icon: "/ext-icons/ViewportInspector.png",
      },
      {
        name: "CSS Inspector",
        description: "Click any element to inspect its computed CSS — Layout, Typography, Colors, and Spacing in one panel. Toggle between CSS variable references and resolved actual values.",
        price: "Free",
        url: "/extensions/css-inspector/",
        icon: "/ext-icons/CSSInspector.png",
      },
      {
        name: "MarkdownLive",
        description: "Real-time Markdown editor in a Chrome side panel. Split view: Markdown on the left, HTML preview on the right. Copy HTML, save .md, or export standalone HTML. Auto-saves locally.",
        price: "Free",
        url: "/extensions/markdown-live/",
        icon: "/ext-icons/MarkdownLive.png",
      },
      {
        name: "SpeedDialX",
        description: "Custom new tab speed dial page. Pin your favorite sites in a grid, drag to rearrange, search Google instantly. Free: 12 sites. Pro: unlimited + custom image background.",
        price: "Free / Pro $2.99/mo",
        url: "/extensions/speed-dial-x/",
        icon: "/ext-icons/SpeedDialX.png",
      },
      {
        name: "Tab Manager",
        description: "All your tabs in one list. Search, switch, and close tabs. Detects duplicate URLs and removes them in one click. No clutter, no groups — just a clean tab list.",
        price: "Free",
        url: "/extensions/tab-manager/",
        icon: "/ext-icons/TabManager.png",
      },
      {
        name: "PageSpeed Badge",
        description: "See LCP, FCP, and CLS scores for any webpage in real time. Color-coded badge on the toolbar icon — green ✓, amber ~, or red ✗. Click for full metrics breakdown.",
        price: "Free",
        url: "/extensions/pagespeed-badge/",
        icon: "/ext-icons/PageSpeedBadge.png",
      },
      {
        name: "SmartSelect",
        description: "Select any text to instantly search Google, Wikipedia, or translate with DeepL. Add your own custom URL actions. Floating action bar with shadow DOM.",
        price: "Free / Pro $2.99/mo",
        url: "/extensions/smartselect/",
        icon: "/ext-icons/SmartSelect.png",
      },
      {
        name: "ScreenNote",
        description: "Attach sticky notes to any webpage. Notes appear automatically every time you visit. Drag, collapse, 5 colors. Free: 5 notes. Pro: unlimited. (PageMemo へ統合予定 / merging into PageMemo)",
        price: "Free / Pro $3.99/mo",
        url: "/extensions/screennote/",
        icon: "/ext-icons/ScreenNote.png",
      },
      {
        name: "PageMemo",
        description: "URL-linked notes that auto-appear when you revisit pages. Rich text editor with categories and full-text search.",
        price: "Free",
        url: "/extensions/pagememo/",
        icon: "/ext-icons/Pagememo.png",
        status: "coming-soon",
      },
      {
        name: "PagePilot",
        description: "Convert web pages to clean, LLM-optimized Markdown with token counting. Works with ChatGPT, Claude, and Gemini.",
        price: "$5.99/mo",
        priceNote: "Lifetime: $39.99",
        url: "/extensions/pagepilot/",
        icon: "/ext-icons/pagepilot.png",
      },
      {
        name: "TimezoneHelper",
        description: "See the current time in 500+ timezones instantly. Hover any date on any page for instant conversion across all your registered timezones.",
        price: "Free / Pro $2.99/mo",
        url: "/extensions/timezonehelper/",
        icon: "/ext-icons/timezonehelper.png",
      },
      {
        name: "GrammarHelper",
        description: "Right-click selected text for instant grammar and spell check via LanguageTool. Color-coded issues, 1-click fix, 8 languages. Free, no API key.",
        price: "Free",
        url: "/extensions/grammarhelper/",
        icon: "/ext-icons/grammarhelper.png",
      },
      {
        name: "TabSnapshot",
        description: "Capture open tabs with screenshots, title, and URL. Export as self-contained HTML or print to PDF. Capture one tab or all tabs at once. Free.",
        price: "Free",
        url: "/extensions/tabsnapshot/",
        icon: "/ext-icons/tabsnapshot.png",
      },
    ],
  },
  {
    title: "E-commerce Tools",
    extensions: [
      {
        name: "Rakuten Sellers Analytics",
        description: "Professional analytics tool for Rakuten sellers to boost sales and market insights.",
        price: "$12.99/mo",
        url: "/extensions/rakuten-sellers-analytics/",
        icon: "/ext-icons/rakuten-sellers-analytics.webp",
      },
      {
        name: "Arbitra",
        description: "Compare prices across Amazon, Mercari, and Yahoo Auctions instantly. Calculate reselling profits with one click.",
        price: "Free",
        priceNote: "Pro: $9.99/mo or $34 lifetime",
        url: "/extensions/arbitra/",
        icon: "/ext-icons/Arbitra.webp",
      },
      {
        name: "PricePulse JP",
        description: "Track price history on Amazon.co.jp, Rakuten, Yahoo! Shopping & Mercari. Get alerts when prices drop. Fully local, no account needed.",
        price: "Free / Pro $4.99/mo",
        url: "/extensions/pricepulse-jp/",
        icon: "/ext-icons/pricepulse-jp.png",
      },
      {
        name: "FurusatoTracker",
        description: "複数ポータルの寄付を一元管理。楽天ふるさと納税・ふるなびの寄付を自動検知し、控除上限の残額をリアルタイムで把握できます。",
        price: "Free / Pro ¥1,480",
        url: "/extensions/furusato-tracker/",
        icon: "/ext-icons/furusato-tracker.png",
      },
      {
        name: "Kaitoki",
        description: "楽天・Yahoo!・Amazonの価格を自動追跡。価格履歴グラフ、EC横断比較、ポイント実質価格計算、値下げアラート機能搭載。",
        price: "Free",
        url: "/extensions/kaitoki/",
        icon: "/ext-icons/Kaitoki.png",
        status: "coming-soon",
      },
    ],
  },
  {
    title: "Real Estate",
    extensions: [
      {
        name: "物件スカウター（購入版）",
        description: "SUUMOの購入物件で坪単価・㎡単価を自動計算。築年数ハイライト、お気に入り比較、価格履歴で賢い物件探し。",
        price: "Free",
        url: "/extensions/bukken-scouter-purchase/",
        icon: "/ext-icons/bukken-scouter-purchase.webp",
      },
    ],
  },
  {
    title: "Media & Entertainment",
    extensions: [
      {
        name: "TVer Plus",
        description: "TVerの視聴体験を向上。2倍速以上の再生、ピクチャインピクチャ、便利なキーボードショートカットに対応。",
        price: "Free / Pro ¥700",
        url: "/extensions/tver-plus/",
        icon: "/ext-icons/tver-plus.webp",
      },
    ],
  },
  {
    title: "SEO Tools",
    extensions: [
      {
        name: "OnPageX",
        description: "Analyze SEO meta tags, headings, schemas, images, and links with one click. Score your on-page SEO instantly.",
        price: "Free / Pro",
        url: "/extensions/onpagex/",
        icon: "/ext-icons/onpagex.png",
      },
    ],
  },
  {
    title: "Social Media",
    extensions: [
      {
        name: "SNSCrossPost",
        description: "Post to X, Threads, Bluesky, and LinkedIn simultaneously. One-click multi-platform publishing.",
        price: "Free",
        url: "/extensions/snscrosspost/",
        icon: "/ext-icons/snscrosspost.png",
        status: "coming-soon",
      },
    ],
  },
  {
    title: "Developer Tools",
    extensions: [
      {
        name: "DomainInfo",
        description: "1-click website inspector: CDN, server, tech stack, security headers scorecard, and DNS records. Free.",
        price: "Free",
        url: "/extensions/domaininfo/",
        icon: "/ext-icons/domaininfo.png",
      },
      {
        name: "MetaPreview",
        description: "Preview how your page looks on Twitter/X, Facebook, LinkedIn, and Slack. Audit OG tags for missing images, wrong ratios, and short descriptions.",
        price: "Free",
        url: "/extensions/metapreview/",
        icon: "/ext-icons/metapreview.png",
      },
      {
        name: "FontExplorer",
        description: "Detect every font on any webpage. Live preview with custom text, 1-click CSS copy, and Google Fonts links. Works with all languages including CJK.",
        price: "Free",
        url: "/extensions/fontexplorer/",
        icon: "/ext-icons/fontexplorer.png",
      },
      {
        name: "SnippetVault",
        description: "Developer-focused code snippet manager. Insert snippets instantly with slash commands in any text field.",
        price: "Free",
        url: "/extensions/snippetvault/",
        icon: "/ext-icons/SnippetVault.png",
        status: "coming-soon",
      },
      {
        name: "TabVault",
        description: "Developer-focused tab session manager with Stash, Quick Switcher, and crash recovery.",
        price: "Free / Pro $5",
        url: "/extensions/tabvault/",
        icon: "/ext-icons/TabVault.png",
      },
      {
        name: "CookieJar",
        description: "EditThisCookie alternative for MV3. Edit, delete, export & import cookies. Privacy-first with smart auto-categorization and privacy scores.",
        price: "Free / Pro $4.99/mo",
        priceNote: "Lifetime: $29.99",
        url: "/extensions/cookiejar/",
        icon: "/ext-icons/cookiejar.png",
      },
    ],
  },
  {
    title: "Image Tools",
    extensions: [
      {
        name: "ReShapic",
        description: "Resize, convert, and optimize images for any platform. Chrome extension with batch processing and freemium Pro plan.",
        price: "Free / Pro $19",
        url: "/extensions/reshapic/",
        icon: "/ext-icons/reshapic.png",
      },
    ],
  },
  {
    title: "Business Tools",
    extensions: [
      {
        name: "請求書よみとり",
        description: "PDF請求書をAI-OCRで自動読み取り。金額・日付・取引先・登録番号を抽出し、CSV/Excelにエクスポート。インボイス制度・電帳法対応。2026年10月改正対応。",
        price: "Free / Pro",
        url: "/extensions/invoice-reader/",
        icon: "/ext-icons/invoice-reader.png",
      },
    ],
  },
  {
    title: "Legal & Compliance Tools",
    extensions: [
      {
        name: "AdLegalCheck",
        description: "EC広告・LPを開くだけで景表法・薬機法・ステマ規制のNGワードをリアルタイム検出。リスクスコアとハイライト表示で広告コンプライアンスを自動チェック。",
        price: "Free / Pro $3.99/mo",
        url: "/extensions/adlegalcheck/",
        icon: "/ext-icons/adlegalcheck.png",
      },
      {
        name: "ToritekiCheck",
        description: "取適法（旧下請法）の取引条件をAIでチェック。支払サイト違反・手形払い・必須記載事項の欠落・禁止行為を右クリック一発で3段階リスク判定。月5回無料。",
        price: "Free / Pro ¥980/mo",
        url: "/extensions/toritekicheck/",
        icon: "/ext-icons/toritekicheck.png",
      },
    ],
  },
  {
    title: "E-Commerce Tools",
    extensions: [
      {
        name: "FurimaPro",
        description: "メルカリ出品を効率化するAIテンプレートツール。カテゴリ別の最適化タイトル・説明文テンプレートで出品作業を大幅短縮。月5件無料。",
        price: "Free / Pro ¥980/mo",
        url: "/extensions/furimapro/",
        icon: "/ext-icons/furimapro.png",
      },
      {
        name: "MeetingLink",
        description: "Auto-detect Zoom, Google Meet & Teams links on any page. Find and save meeting links, join in one click.",
        price: "Free",
        url: "/extensions/meetinglink/",
        icon: "/ext-icons/MeetingLink.png",
      },
      {
        name: "FocusPlaylist",
        description: "Play YouTube playlists as background music while you work. One click to start Lo-Fi, White Noise, or Deep Focus.",
        price: "Free",
        url: "/extensions/focusplaylist/",
        icon: "/ext-icons/FocusPlaylist.png",
      },
      {
        name: "LinkPreview",
        description: "Hover over any link to preview the page title, description, and image — without opening it. Lightweight 10KB.",
        price: "Free",
        url: "/extensions/linkpreview/",
        icon: "/ext-icons/LinkPreview.png",
      },
      {
        name: "DownloadMap",
        description: "Scan any page for downloadable files — PDFs, ZIPs, videos, docs, and more. One-click download or grab them all at once.",
        price: "Free",
        url: "/extensions/downloadmap/",
        icon: "/ext-icons/DownloadMap.png",
      },
      {
        name: "EmojiPicker",
        description: "Search and copy any emoji in seconds. Press Alt+Shift+E to open, type to search, click to copy. Includes recent history.",
        price: "Free",
        url: "/extensions/emojipicker/",
        icon: "/ext-icons/EmojiPicker.png",
      },
      {
        name: "PrivacyGuard",
        description: "See which trackers load on any page — Google Analytics, Facebook Pixel, HotJar & 55+ more. Visualize, not block.",
        price: "Free",
        url: "/extensions/privacyguard/",
        icon: "/ext-icons/PrivacyGuard.png",
      },
      {
        name: "BookmarkHub",
        description: "Browse your bookmarks as visual cards with favicons. Real-time search, folder tabs, one-click open. Free: 50 bookmarks. Pro: unlimited.",
        price: "Free / Pro $3.99/mo",
        url: "/extensions/bookmarkhub/",
        icon: "/ext-icons/BookmarkHub.png",
      },
      {
        name: "SiteMapper",
        description: "Fetch and visualize any site's sitemap.xml. Browse URLs, view last-modified dates and priorities, copy all URLs in one click.",
        price: "Free",
        url: "/extensions/sitemapper/",
        icon: "/ext-icons/SiteMapper.png",
      },
      {
        name: "PasswordStrength",
        description: "Real-time inline password strength meter on any login or signup form. Scores length, variety, and flags common passwords. No popup needed.",
        price: "Free",
        url: "/extensions/password-strength/",
        icon: "/ext-icons/PasswordStrength.png",
      },
    ],
  },
  {
    title: "Productivity (Coming Soon)",
    extensions: [
      {
        name: "QuietHours",
        description: "Block distracting sites automatically during Google Calendar focus events. No manual scheduling — your calendar drives your productivity.",
        price: "Free / Pro $5/mo",
        url: "/extensions/quiethours/",
        icon: "/ext-icons/quiethours.png",
        status: "coming-soon",
      },
      {
        name: "InboxSLA",
        description: "Color-coded SLA badges in Gmail and deadline alerts before client reply windows expire. Set custom SLA hours per client domain.",
        price: "Free / Pro $6/mo",
        url: "/extensions/inboxsla/",
        icon: "/ext-icons/inboxsla.png",
        status: "coming-soon",
      },
      {
        name: "FormFill Vault",
        description: "Autofill addresses, invoices, and business info with encrypted profiles. AES-256 local encryption. No cloud sync.",
        price: "Free / Pro $3.99/mo",
        url: "/extensions/formfill-vault/",
        icon: "/ext-icons/formfill-vault.png",
        status: "coming-soon",
      },
    ],
  },
  {
    title: "Travel",
    extensions: [
      {
        name: "EntryCheck",
        description: "Visa requirements, entry rules, and travel advisories for 190+ countries — right in your browser. Filter by passport nationality.",
        price: "Free / Pro $4/mo",
        url: "/extensions/entrycheck/",
        icon: "/ext-icons/entrycheck.png",
        status: "coming-soon",
      },
    ],
  },
  {
    title: "Career & Job Search",
    extensions: [
      {
        name: "GhostJob",
        description: "Detect fake and abandoned job listings on LinkedIn, Indeed, and Glassdoor before you apply. Real-time ghost job scores with signal breakdown.",
        price: "Free / Pro $5/mo",
        url: "/extensions/ghostjob/",
        icon: "/ext-icons/ghostjob.png",
        status: "coming-soon",
      },
    ],
  },
  {
    title: "Education & Learning",
    extensions: [
      {
        name: "LectureLoop",
        description: "Auto-generate flashcards from YouTube lecture transcripts. Spaced repetition review and Anki export. Works on any video with captions.",
        price: "Free / Pro $7/mo",
        url: "/extensions/lectureloop/",
        icon: "/ext-icons/lectureloop.png",
        status: "coming-soon",
      },
    ],
  },
];
