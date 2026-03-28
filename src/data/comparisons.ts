export interface ComparisonRow {
  feature: string;
  ours: string;
  theirs: string;
  highlight?: boolean; // true = row where S-Hub wins
}

export interface ComparisonProduct {
  name: string;
  icon: string;
  chromeUrl: string;
  users: string;
  rating: string;
  price: string;
  badge?: string;
  extensionPageUrl?: string; // S-Hub拡張のページURL（例: /extensions/datapick/）
}

export interface ComparisonFaq {
  question: string;
  answer: string;
}

export interface ComparisonData {
  slug: string;
  seoTitle: string;
  seoDescription: string;
  seoKeywords: string;
  h1: string;
  intro: string;
  ours: ComparisonProduct;
  theirs: ComparisonProduct;
  rows: ComparisonRow[];
  ourAdvantages: { title: string; desc: string }[];
  theirAdvantages: { title: string; desc: string }[];
  verdict: string;
  faq: ComparisonFaq[];
}
