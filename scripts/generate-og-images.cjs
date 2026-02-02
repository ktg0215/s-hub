const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

const extensions = [
  {
    slug: 'yahoo-kaiteki-mode',
    name: 'Yahoo快適モード',
    category: 'WELLBEING',
    tagline: 'Yahoo!ニュースフィルター',
    description: 'もう「こたつ記事」にイライラしない。Yahoo!ニュースを快適に。',
    price: 'FREE',
    icon: 'yahoo-kaiteki-mode.webp',
  },
  {
    slug: 'japanese-font-finder',
    name: 'Japanese Font Finder',
    category: 'PRODUCTIVITY',
    tagline: 'Font Detection Tool',
    description: 'Instantly detect font information on any webpage. Full Japanese font support.',
    price: 'FREE',
    icon: 'japanese-font-finder.webp',
  },
  {
    slug: 'datapick',
    name: 'DataPick',
    category: 'PRODUCTIVITY',
    tagline: 'No-code Web Scraping',
    description: 'Extract data from any website without writing a single line of code.',
    price: '$19',
    icon: 'datapick.webp',
  },
  {
    slug: 'readmark',
    name: 'ReadMark',
    category: 'PRODUCTIVITY',
    tagline: 'Reading Position Saver',
    description: 'Never lose your place again. Continue reading exactly where you left off.',
    price: 'FREE',
    icon: 'ReadMark.webp',
  },
  {
    slug: 'zenread',
    name: 'ZenRead',
    category: 'PRODUCTIVITY',
    tagline: 'Distraction-Free Reader',
    description: 'Remove clutter and read any article in a clean, customizable reader view.',
    price: 'FREE',
    icon: 'ZenRead.webp',
  },
  {
    slug: 'pagememo',
    name: 'PageMemo',
    category: 'PRODUCTIVITY',
    tagline: 'URL-Linked Notes',
    description: 'Take notes linked to any URL. Auto-appear when you revisit the page.',
    price: 'FREE',
    icon: 'Pagememo.png',
  },
  {
    slug: 'bukken-scouter-purchase',
    name: '物件スカウター',
    category: 'REAL ESTATE',
    tagline: '購入物件の坪単価計算',
    description: '坪単価がわかれば、物件選びが変わる。SUUMOの購入物件を効率比較。',
    price: 'FREE',
    icon: 'bukken-scouter-purchase.webp',
  },
  {
    slug: 'tver-plus',
    name: 'TVer Plus',
    category: 'MEDIA',
    tagline: '再生速度変更・PiP対応',
    description: 'TVerの視聴体験を向上。2倍速以上の再生、PiP、ショートカット対応。',
    price: 'FREE',
    icon: 'tver-plus.webp',
  },
  {
    slug: 'snippetvault',
    name: 'SnippetVault',
    category: 'DEV TOOLS',
    tagline: 'Code Snippet Manager',
    description: 'Insert code snippets instantly with slash commands in any text field.',
    price: 'FREE',
    icon: 'SnippetVault.png',
  },
  {
    slug: 'tabvault',
    name: 'TabVault',
    category: 'DEV TOOLS',
    tagline: 'Tab Session Manager',
    description: 'Stash tabs, quick switch sessions, and auto-recover from crashes.',
    price: 'FREE / Pro $5',
    icon: 'TabVault.png',
  },
];

function generateHTML(ext, iconBase64) {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');

    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      width: 1200px;
      height: 630px;
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
      background: linear-gradient(135deg, #1a1d2e 0%, #0f1119 100%);
      position: relative;
      overflow: hidden;
    }

    .bg-circle-1 {
      position: absolute;
      width: 600px;
      height: 600px;
      border-radius: 50%;
      background: rgba(30, 35, 50, 0.6);
      right: -200px;
      top: -200px;
    }

    .bg-circle-2 {
      position: absolute;
      width: 400px;
      height: 400px;
      border-radius: 50%;
      background: rgba(30, 35, 50, 0.4);
      right: 100px;
      bottom: -150px;
    }

    .container {
      display: flex;
      align-items: center;
      padding: 60px 80px;
      height: 100%;
      position: relative;
      z-index: 1;
    }

    .icon-wrapper {
      width: 200px;
      height: 200px;
      background: #2a2d3e;
      border-radius: 32px;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
    }

    .icon-wrapper img {
      width: 140px;
      height: 140px;
      object-fit: contain;
    }

    .content {
      margin-left: 60px;
      flex: 1;
    }

    .category {
      display: inline-block;
      background: rgba(16, 185, 129, 0.15);
      color: #10b981;
      padding: 8px 20px;
      border-radius: 20px;
      font-size: 14px;
      font-weight: 600;
      letter-spacing: 0.5px;
      margin-bottom: 20px;
    }

    .name {
      font-size: 52px;
      font-weight: 700;
      color: #ffffff;
      margin-bottom: 12px;
      line-height: 1.1;
    }

    .tagline {
      font-size: 24px;
      color: #10b981;
      margin-bottom: 20px;
      font-weight: 500;
    }

    .description {
      font-size: 18px;
      color: #9ca3af;
      line-height: 1.5;
      max-width: 550px;
      margin-bottom: 30px;
    }

    .meta {
      display: flex;
      align-items: center;
      gap: 20px;
    }

    .price {
      display: inline-block;
      border: 2px solid #10b981;
      color: #10b981;
      padding: 10px 24px;
      border-radius: 8px;
      font-size: 16px;
      font-weight: 600;
    }

    .platform {
      color: #9ca3af;
      font-size: 16px;
    }

    .logo {
      position: absolute;
      right: 60px;
      bottom: 40px;
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .logo-icon {
      width: 40px;
      height: 40px;
      background: #3b82f6;
      border-radius: 10px;
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-weight: 700;
      font-size: 20px;
    }

    .logo-text {
      color: #ffffff;
      font-size: 20px;
      font-weight: 600;
    }
  </style>
</head>
<body>
  <div class="bg-circle-1"></div>
  <div class="bg-circle-2"></div>

  <div class="container">
    <div class="icon-wrapper">
      <img src="${iconBase64}" alt="${ext.name}">
    </div>

    <div class="content">
      <div class="category">${ext.category}</div>
      <h1 class="name">${ext.name}</h1>
      <p class="tagline">${ext.tagline}</p>
      <p class="description">${ext.description}</p>

      <div class="meta">
        <span class="price">${ext.price}</span>
        <span class="platform">Chrome & Edge</span>
      </div>
    </div>
  </div>

  <div class="logo">
    <div class="logo-icon">S</div>
    <span class="logo-text">S-HUB</span>
  </div>
</body>
</html>`;
}

async function generateOGImages() {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const outputDir = path.join(__dirname, '../public/images');

  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  for (const ext of extensions) {
    console.log(`Generating OG image for ${ext.name}...`);

    // Read icon and convert to base64
    const iconPath = path.join(__dirname, '../public/ext-icons', ext.icon);
    let iconBase64 = '';

    if (fs.existsSync(iconPath)) {
      const iconBuffer = fs.readFileSync(iconPath);
      const mimeType = ext.icon.endsWith('.png') ? 'image/png' : 'image/webp';
      iconBase64 = `data:${mimeType};base64,${iconBuffer.toString('base64')}`;
    } else {
      console.warn(`  Icon not found: ${iconPath}`);
      // Use placeholder
      iconBase64 = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTQwIiBoZWlnaHQ9IjE0MCIgdmlld0JveD0iMCAwIDE0MCAxNDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHJlY3Qgd2lkdGg9IjE0MCIgaGVpZ2h0PSIxNDAiIHJ4PSIyMCIgZmlsbD0iIzNiODJmNiIvPjx0ZXh0IHg9IjcwIiB5PSI4MCIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZmlsbD0id2hpdGUiIGZvbnQtc2l6ZT0iNDAiIGZvbnQtZmFtaWx5PSJzYW5zLXNlcmlmIj4/PC90ZXh0Pjwvc3ZnPg==';
    }

    const html = generateHTML(ext, iconBase64);

    const page = await browser.newPage();
    await page.setViewport({ width: 1200, height: 630 });
    await page.setContent(html, { waitUntil: 'networkidle0' });

    // Wait for fonts to load
    await page.evaluate(() => document.fonts.ready);
    await new Promise(resolve => setTimeout(resolve, 500));

    const pngPath = path.join(outputDir, `og-${ext.slug}.png`);
    const webpPath = path.join(outputDir, `og-${ext.slug}.webp`);

    // Save as PNG
    await page.screenshot({ path: pngPath, type: 'png' });
    console.log(`  Created: ${pngPath}`);

    // Save as WebP
    await page.screenshot({ path: webpPath, type: 'webp', quality: 90 });
    console.log(`  Created: ${webpPath}`);

    await page.close();
  }

  await browser.close();
  console.log('\nAll OG images generated successfully!');
}

generateOGImages().catch(console.error);
