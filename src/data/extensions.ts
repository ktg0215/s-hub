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
        icon: "/icons/shorts-killer.png",
      },
      {
        name: "X Detox",
        description: "Clean up your X (Twitter) experience by removing algorithms and distractions.",
        price: "Free / Pro $3",
        url: "/extensions/x-detox",
        icon: "/icons/x-detox.png",
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
        icon: "/icons/yahoo-kaiteki-mode.png",
      },
      {
        name: "物件スカウター（賃貸版）",
        description: "SUUMOの賃貸物件を効率比較。㎡単価・初期費用・年間コストを自動計算、AI賃料判定付き。",
        price: "Free",
        url: "/extensions/bukken-scouter-rental",
        icon: "/icons/bukken-scouter-rental.png",
      },
      {
        name: "PromptStash",
        description: "Efficiently manage and organize your AI prompts for ChatGPT, Claude, and more.",
        price: "$5",
        url: "/extensions/promptstash",
        icon: "/icons/promptstash.png",
      },
      {
        name: "Japanese Font Finder",
        description: "Instantly detect font information on any webpage. Full support for Japanese fonts.",
        price: "Free",
        url: "/extensions/japanese-font-finder",
        icon: "/icons/japanese-font-finder.png",
      },
      {
        name: "DataPick",
        description: "Extract data from any website with just a few clicks. Export to CSV, Excel, or Google Sheets.",
        price: "$19",
        url: "/extensions/datapick",
        icon: "/icons/datapick.png",
      },
      {
        name: "ReadMark",
        description: "Automatically saves your reading position on any webpage. Never lose your place in long articles again.",
        price: "Free / Pro $4.99",
        url: "/extensions/readmark",
        icon: "/icons/ReadMark.png",
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
        icon: "/icons/rakuten-sellers-analytics.png",
      },
      {
        name: "Arbitra",
        description: "Compare prices across Amazon, Mercari, and Yahoo Auctions instantly. Calculate reselling profits with one click.",
        price: "Free",
        priceNote: "Pro: $9.99/mo or $34 lifetime",
        url: "/extensions/arbitra",
        icon: "/icons/Arbitra.png",
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
        icon: "/icons/bukken-scouter-purchase.png",
      },
    ],
  },
];
