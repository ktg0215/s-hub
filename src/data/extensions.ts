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
        description: "Stop wasting time on YouTube Shorts. Hide them completely from your feed.",
        price: "Free",
        url: "/extensions/shorts-killer",
        icon: "/ext-icons/shorts-killer.webp",
      },
      {
        name: "X Detox",
        description: "Clean up your X (Twitter) experience by removing algorithms and distractions.",
        price: "Free / Pro $3",
        url: "/extensions/x-detox",
        icon: "/ext-icons/x-detox.webp",
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
        url: "/extensions/yahoo-kaiteki-mode",
        icon: "/ext-icons/yahoo-kaiteki-mode.webp",
      },
      {
        name: "物件スカウター（賃貸版）",
        description: "SUUMOの賃貸物件を効率比較。㎡単価・初期費用・年間コストを自動計算、AI賃料判定付き。",
        price: "Free",
        url: "/extensions/bukken-scouter-rental",
        icon: "/ext-icons/bukken-scouter-rental.webp",
      },
      {
        name: "PromptStash",
        description: "Efficiently manage and organize your AI prompts for ChatGPT, Claude, and more.",
        price: "$5",
        url: "/extensions/promptstash",
        icon: "/ext-icons/promptstash.webp",
      },
      {
        name: "Japanese Font Finder",
        description: "Instantly detect font information on any webpage. Full support for Japanese fonts.",
        price: "Free",
        url: "/extensions/japanese-font-finder",
        icon: "/ext-icons/japanese-font-finder.webp",
      },
      {
        name: "DataPick",
        description: "Extract data from any website with just a few clicks. Export to CSV, Excel, or Google Sheets.",
        price: "$19",
        url: "/extensions/datapick",
        icon: "/ext-icons/datapick.webp",
      },
      {
        name: "ReadMark",
        description: "Automatically saves your reading position on any webpage. Never lose your place in long articles again.",
        price: "Free / Pro $4.99",
        url: "/extensions/readmark",
        icon: "/ext-icons/ReadMark.webp",
      },
      {
        name: "ZenRead",
        description: "Distraction-free reader mode for any webpage. Remove ads and sidebars, customize themes and fonts for comfortable reading.",
        price: "Free",
        url: "/extensions/zenread",
        icon: "/ext-icons/ZenRead.webp",
        status: "coming-soon",
      },
      {
        name: "PageMemo",
        description: "URL-linked local notes that auto-appear when you revisit pages. Rich text editor with categories and search.",
        price: "Free",
        url: "/extensions/pagememo",
        icon: "/ext-icons/Pagememo.png",
        status: "coming-soon",
      },
      {
        name: "Kawaii Capture",
        description: "The world's cutest screenshot tool! Capture screens with adorable pastel frames, mascot characters, and decorations.",
        price: "Free",
        url: "/extensions/kawaii-capture",
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
        url: "/extensions/rakuten-sellers-analytics",
        icon: "/ext-icons/rakuten-sellers-analytics.webp",
      },
      {
        name: "Arbitra",
        description: "Compare prices across Amazon, Mercari, and Yahoo Auctions instantly. Calculate reselling profits with one click.",
        price: "Free",
        priceNote: "Pro: $9.99/mo or $34 lifetime",
        url: "/extensions/arbitra",
        icon: "/ext-icons/Arbitra.webp",
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
        url: "/extensions/bukken-scouter-purchase",
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
        url: "/extensions/tver-plus",
        icon: "/ext-icons/tver-plus.webp",
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
        url: "/extensions/snippetvault",
        icon: "/ext-icons/SnippetVault.png",
        status: "coming-soon",
      },
      {
        name: "TabVault",
        description: "Smart tab session manager for developers. Stash tabs, quick switch sessions, and auto-recover from crashes.",
        price: "Free",
        url: "/extensions/tabvault",
        icon: "/ext-icons/TabVault.png",
        status: "coming-soon",
      },
    ],
  },
];
