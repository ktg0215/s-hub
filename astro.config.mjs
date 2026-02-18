// @ts-check
import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import sitemap from '@astrojs/sitemap';

// https://astro.build/config
export default defineConfig({
  site: 'https://dev-tools-hub.xyz',
  trailingSlash: 'always',
  integrations: [
    sitemap({
      changefreq: 'weekly',
      priority: 0.7,
      lastmod: new Date(),
      filter: (page) => !page.includes('/privacy') && !page.includes('/terms'),
      entryLimit: 50000,
      serialize(item) {
        if (item.url === 'https://dev-tools-hub.xyz/' || item.url === 'https://dev-tools-hub.xyz') {
          item.priority = 1.0;
          item.changefreq = 'daily';
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