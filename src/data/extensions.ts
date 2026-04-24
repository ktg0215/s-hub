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
        icon: "/ext-icons/snapreply.png",
        status: "coming-soon",
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
        status: "published",
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
