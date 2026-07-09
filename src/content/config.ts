import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

// /blog content collection. Markdown lives in src/content/blog/*.md.
// Astro 5 content layer (glob loader) — entry id = filename slug.
const blog = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/blog' }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    date: z.coerce.date(),
    tags: z.array(z.string()).optional(),
    draft: z.boolean().optional(),
    // hero/OG 画像（ADR 2026-07-08-image-cadence）。任意: 無ければ Layout の
    // デフォルト OG (/images/og-image.png) に fallback（build fail させない・[slug] で warn）。
    image: z.string().optional(),
  }),
});

export const collections = { blog };
