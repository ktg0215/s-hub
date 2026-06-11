// @ts-check
import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import sitemap from '@astrojs/sitemap';
import { EnumChangefreq } from 'sitemap';

// https://astro.build/config
export default defineConfig({
  site: 'https://dev-tools-hub.xyz',
  trailingSlash: 'always',
  integrations: [
    sitemap({
      changefreq: 'weekly',
      priority: 0.7,
      lastmod: new Date(),
      // M1 ハブの utility ページ (uninstall 着地 / go リダイレクト) は sitemap から除外
      // (両ページは noindex 済・検索インデックス対象外)。
      filter: (page) =>
        !page.includes('/privacy') &&
        !page.includes('/terms') &&
        !page.includes('/uninstall') &&
        !page.includes('/go/'),
      entryLimit: 50000,
      serialize(item) {
        if (item.url === 'https://dev-tools-hub.xyz/' || item.url === 'https://dev-tools-hub.xyz') {
          item.priority = 1.0;
          item.changefreq = EnumChangefreq.DAILY;
        } else if (item.url.includes('/extensions/')) {
          item.priority = 0.8;
        }
        return item;
      },
    }),
  ],
  compressHTML: true,
  build: {
    inlineStylesheets: 'auto',
  },
  vite: {
    plugins: [tailwindcss()]
  }
});