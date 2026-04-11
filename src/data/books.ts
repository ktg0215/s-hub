export interface BookChapter {
  title: string;
  wordCount: number;
}

export interface Book {
  slug: string;
  title: string;
  subtitle: string;
  tagline: string;
  price: number; // 0 = free
  priceLabel: string;
  status: 'available' | 'coming-soon';
  releaseDate: string;
  releaseLabel: string;
  coverImage: string;
  zennUrl: string;
  totalWords: number;
  targetReaders: string[];
  chapters: BookChapter[];
  sampleUrl: string; // Zenn URL to sample chapter
  relatedSlugs: string[]; // other book slugs
  faq: { q: string; a: string }[];
  color: string; // accent color class for this book
}

export const books: Book[] = [
  {
    slug: 'ai-chrome-extension-intro',
    title: 'AIで始めるChrome拡張 個人開発入門',
    subtitle: 'コードが書けなくても1週間で公開まで',
    tagline: 'Claude/Cursorを使ってChrome拡張の最初の1本を作る。ゼロから公開まですべて解説。',
    price: 0,
    priceLabel: '無料',
    status: 'coming-soon',
    releaseDate: '2026-04-25',
    releaseLabel: '2026年4月下旬公開予定',
    coverImage: '/books/book1-cover.png',
    zennUrl: 'https://zenn.dev/ktg/books/ai-chrome-extension-intro',
    totalWords: 25000,
    targetReaders: [
      'Chrome拡張を作ってみたいが何から始めればいいかわからない方',
      'コードは書けないが、AIを使ってツールを作ってみたい方',
      '副業・個人開発のきっかけを探している会社員の方',
    ],
    chapters: [
      { title: 'はじめに — この本で作れるようになること', wordCount: 600 },
      { title: '第1章 なぜ今「Chrome拡張」なのか', wordCount: 2200 },
      { title: '第2章 AIとの対話でアイデアを形にする', wordCount: 2400 },
      { title: '第3章 開発環境セットアップ（Cursor/Claude Code）', wordCount: 2600 },
      { title: '第4章 初めてのChrome拡張を作る（Manifest V3入門）', wordCount: 2800 },
      { title: '第5章 実例①：タブ管理・ブックマーク系', wordCount: 2400 },
      { title: '第6章 実例②：データ抽出・自動化系', wordCount: 2600 },
      { title: '第7章 Chrome Web Storeに公開する', wordCount: 2800 },
      { title: '第8章 最初の1本を公開した後にやること', wordCount: 2400 },
      { title: 'おわりに — 18本作った先に見えたもの', wordCount: 600 },
    ],
    sampleUrl: 'https://zenn.dev/ktg/books/ai-chrome-extension-intro',
    relatedSlugs: ['chrome-ext-monetization-strategy', 'chrome-ext-dev-mastery', 'indie-dev-mindset'],
    faq: [
      { q: 'プログラミング経験がなくても読めますか？', a: 'はい。AIツール（Claude/Cursor）を使いながら進めるため、コードを一から書く必要はありません。ただし、基本的なPC操作（ファイル操作・テキスト編集）ができれば十分です。' },
      { q: '有料ツールは必要ですか？', a: 'Claude Proなどの有料プランがあると開発が速くなりますが、無料のClaude.aiやGitHub Copilot無料枠でも本書の内容は実践できます。' },
      { q: '本書の内容はいつまで有効ですか？', a: 'Chrome拡張の仕様（Manifest V3）は2026年現在安定しています。内容が古くなった場合は更新します。' },
      { q: '日本語と英語、どちらで書かれていますか？', a: '日本語で書かれています。コードブロック内のコメントも日本語対応しています。' },
      { q: '本書を読んで作った拡張を商用利用できますか？', a: 'はい。本書はMITライセンスに準じており、コードの商用利用は自由です。' },
    ],
    color: 'sky',
  },
  {
    slug: 'chrome-ext-monetization-strategy',
    title: 'Chrome拡張を売るための戦略書',
    subtitle: 'CWS SEO・フリーミアム設計・CVR最大化の実践法',
    tagline: '18本公開して見えた収益化の全戦略。CVR・クロスプロモーション・GA4計測まで体系化。',
    price: 500,
    priceLabel: '¥500',
    status: 'coming-soon',
    releaseDate: '2026-05-09',
    releaseLabel: '2026年5月上旬公開予定',
    coverImage: '/books/book2-cover.png',
    zennUrl: 'https://zenn.dev/ktg/books/chrome-ext-monetization-strategy',
    totalWords: 30000,
    targetReaders: [
      'Chrome拡張を公開済みで収益化を考えている開発者',
      'CWSのCVRを上げたいが何を改善すればいいかわからない方',
      'フリーミアムとサブスクをどう設計すればいいか迷っている方',
    ],
    chapters: [
      { title: 'はじめに — 収益化の前提を整える', wordCount: 600 },
      { title: '第1章 Chrome Web Store SEO完全攻略', wordCount: 3200 },
      { title: '第2章 スクリーンショット・説明文の最適化', wordCount: 3200 },
      { title: '第3章 ローカライズで日本語圏を攻略する', wordCount: 3300 },
      { title: '第4章 フリーミアム設計：境界をどこに引くか', wordCount: 3600 },
      { title: '第5章 ペイウォールのタイミング最適化', wordCount: 3200 },
      { title: '第6章 GA4 Measurement Protocol実装', wordCount: 3400 },
      { title: '第7章 クロスプロモーション設計', wordCount: 3300 },
      { title: 'おわりに — 次の3つのアクション', wordCount: 800 },
    ],
    sampleUrl: 'https://zenn.dev/ktg/books/chrome-ext-monetization-strategy',
    relatedSlugs: ['ai-chrome-extension-intro', 'chrome-ext-dev-mastery', 'indie-dev-mindset'],
    faq: [
      { q: 'Book 1を読んでいないと読めませんか？', a: 'Chrome拡張を1本以上公開した経験があれば、Book 1なしで読めます。Book 1は「作り方」、本書は「売り方」です。' },
      { q: '英語ストア向けの情報も含まれますか？', a: 'はい。第3章のローカライズ章では英語・日本語両ストア向けの最適化を扱います。' },
      { q: 'ExtensionPay以外の決済手段も解説されますか？', a: 'ExtensionPayをメインに解説しますが、Stripe Checkout直接統合についても概要を説明します。' },
      { q: '購入後に内容が更新された場合、追加費用は？', a: '購入後の更新は無料で読めます。Zennの購入は「コンテンツへのアクセス権」です。' },
      { q: '返金対応はありますか？', a: 'Zennの返金ポリシーに従います。購入前にサンプル章をご確認ください。' },
    ],
    color: 'amber',
  },
  {
    slug: 'chrome-ext-dev-mastery',
    title: 'Chrome拡張 開発技術大全',
    subtitle: 'Manifest V3時代の設計・実装・テスト完全ガイド',
    tagline: 'MV3アーキテクチャからWXT・TypeScript・GA4・Playwright E2Eまで。41,400字・全10章のコード付き技術書。',
    price: 980,
    priceLabel: '¥980',
    status: 'coming-soon',
    releaseDate: '2026-06-06',
    releaseLabel: '2026年6月上旬公開予定',
    coverImage: '/books/book3-cover.png',
    zennUrl: 'https://zenn.dev/ktg/books/chrome-ext-dev-mastery',
    totalWords: 41400,
    targetReaders: [
      'TypeScript/React経験者でChrome拡張の設計品質を高めたい方',
      'MV3のService Worker・chrome.storage・コンテンツスクリプトを正しく使いたい方',
      '複数の拡張を量産できる再現性のある設計パターンを習得したい方',
    ],
    chapters: [
      { title: 'はじめに — 本書の使い方とMV3時代の全体像', wordCount: 1500 },
      { title: '第1章 Manifest V3時代のChrome拡張アーキテクチャ', wordCount: 3800 },
      { title: '第2章 ビルドツール選定（WXT・CRXJS・Custom Vite）', wordCount: 3500 },
      { title: '第3章 TypeScript strict modeとchrome.*型定義', wordCount: 3000 },
      { title: '第4章 chrome.storage 3層設計パターン', wordCount: 3400 },
      { title: '第5章 フリーミアム実装（ExtensionPay）', wordCount: 3600 },
      { title: '第6章 GA4 Measurement Protocol完全実装', wordCount: 3600 },
      { title: '第7章 コンテンツスクリプト設計', wordCount: 3500 },
      { title: '第8章 サイドパネル・オフスクリーン', wordCount: 3700 },
      { title: '第9章 Cookie・プライバシー系拡張の実装', wordCount: 3800 },
      { title: '第10章 デバッグ・テスト・リリース自動化', wordCount: 3900 },
      { title: '付録 Gotchas 17選・共通ユーティリティ関数集', wordCount: 3200 },
    ],
    sampleUrl: 'https://zenn.dev/ktg/books/chrome-ext-dev-mastery',
    relatedSlugs: ['chrome-ext-monetization-strategy', 'ai-chrome-extension-intro', 'indie-dev-mindset'],
    faq: [
      { q: 'Book 1・2を読んでいないと読めませんか？', a: 'TypeScript/Reactの基礎知識とChrome拡張の概要（Manifest V3の基本）があれば、Book 1・2なしで読めます。' },
      { q: 'コードはすべてTypeScript strict modeですか？', a: 'はい。anyは一切使用していません。すべてのコードブロックはTypeScript strict modeで動作確認済みです。' },
      { q: 'WXTを使っていない場合でも参考になりますか？', a: 'はい。CRXJS・Custom Viteへの対応方法も章ごとに説明しています。ビルドツールに依存しない設計パターンが中心です。' },
      { q: '今後の内容追加はありますか？', a: 'Chrome APIのアップデートに合わせて章を更新する予定です。購入者は無料で更新版を読めます。' },
      { q: '返金対応はありますか？', a: 'Zennの返金ポリシーに従います。購入前に第1章（サンプル）をご確認ください。' },
    ],
    color: 'emerald',
  },
  {
    slug: 'indie-dev-mindset',
    title: 'AI時代の個人開発マインドセット',
    subtitle: '18本作って気づいたこと、全部話します',
    tagline: '収益化・技術より大事な「続けること」。完璧主義・AI依存・止めどき・コミュニティ——個人開発の本音を全9章で。',
    price: 0,
    priceLabel: '無料',
    status: 'coming-soon',
    releaseDate: '2026-05-16',
    releaseLabel: '2026年5月中旬公開予定',
    coverImage: '/books/book4-cover.png',
    zennUrl: 'https://zenn.dev/ktg/books/indie-dev-mindset',
    totalWords: 20100,
    targetReaders: [
      '個人開発を始めたいが踏み出せない会社員の方',
      '個人開発を始めたが思ったように進まず止まっている方',
      '収益が出ない時期をどう過ごすかわからない方',
    ],
    chapters: [
      { title: 'はじめに — この本を書いた理由', wordCount: 800 },
      { title: '第1章 なぜ今「個人開発」なのか', wordCount: 2000 },
      { title: '第2章 会社員と個人開発者のメンタル差', wordCount: 2200 },
      { title: '第3章 完璧主義を捨てる勇気', wordCount: 2000 },
      { title: '第4章 AIを使いこなす姿勢', wordCount: 2100 },
      { title: '第5章 18本作って見えた「止めどき」', wordCount: 2200 },
      { title: '第6章 失敗の公開と共有の価値', wordCount: 2000 },
      { title: '第7章 収益が出ない時期の過ごし方', wordCount: 2100 },
      { title: '第8章 継続する仕組み（ルーティン）', wordCount: 2000 },
      { title: '第9章 コミュニティとの関わり方', wordCount: 2000 },
      { title: 'おわりに — 明日もコードを書くために', wordCount: 700 },
    ],
    sampleUrl: 'https://zenn.dev/ktg/books/indie-dev-mindset',
    relatedSlugs: ['ai-chrome-extension-intro', 'chrome-ext-monetization-strategy', 'chrome-ext-dev-mastery'],
    faq: [
      { q: 'プログラミング知識がなくても読めますか？', a: 'はい。本書はエッセイ形式です。コードは一行も出てきません。個人開発に興味があれば、エンジニアでなくても読めます。' },
      { q: 'なぜ無料で公開するのですか？', a: '個人開発コミュニティへの恩返しです。マインドセットの知識は、誰でもアクセスできる形で公開するべきと考えました。' },
      { q: 'Chrome拡張以外の個人開発にも参考になりますか？', a: 'はい。本書の内容（完璧主義・継続・コミュニティ）はジャンルを問わず個人開発全般に適用できます。' },
      { q: 'シリーズの他の本は技術書ですが、この本は？', a: '本書だけがエッセイ形式です。技術書シリーズ（Book 1〜3）の「続けるための補完本」として位置づけています。' },
      { q: '更新はありますか？', a: '経験が増えるたびに章を追加・更新する予定です。無料なので更新も無料でご覧いただけます。' },
    ],
    color: 'rose',
  },
];

export function getBook(slug: string): Book | undefined {
  return books.find((b) => b.slug === slug);
}

export function getRelatedBooks(slug: string): Book[] {
  const book = getBook(slug);
  if (!book) return [];
  return book.relatedSlugs
    .map((s) => getBook(s))
    .filter((b): b is Book => b !== undefined);
}
