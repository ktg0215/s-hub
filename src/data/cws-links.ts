// CWS (Chrome Web Store) detail-page URL map for the core extensions.
//
// IMPORTANT: the slugs here MUST match the slug passed to the @shub helper
//   setShubUninstallUrl('<slug>')   (packages/shared/review-prompt/src/uninstall.ts)
// and the slug used by the marketing attribution links (/go/<slug>).
// Keep them identical across extension code, /go/[slug], and /uninstall.
//
// CWS detail URL format: https://chromewebstore.google.com/detail/{id}

export type CwsSlug =
  | 'procshot'
  | 'readmark'
  | 'promptstash'
  | 'rakuten'
  | 'jff';

/** Chrome Web Store extension IDs keyed by S-Hub slug. */
export const cwsIds: Record<CwsSlug, string> = {
  procshot: 'ieblehdloggcpmkncplccjofeoakhkll',
  readmark: 'inejhohffndeacbihghjcobndpoejdfn',
  promptstash: 'ocgkponbnolpgobllplcamfobolbjbcj',
  rakuten: 'dlldcmoekdpakieophgmngnalkiljndc',
  jff: 'ageolfjmheacenbkgiahlkhkogcnocip',
};

const CWS_BASE = 'https://chromewebstore.google.com/detail';

/** slug -> full CWS detail URL. */
export const cwsLinks: Record<CwsSlug, string> = Object.fromEntries(
  (Object.keys(cwsIds) as CwsSlug[]).map((slug) => [slug, `${CWS_BASE}/${cwsIds[slug]}`]),
) as Record<CwsSlug, string>;

/** All known slugs (handy for getStaticPaths). */
export const cwsSlugs: CwsSlug[] = Object.keys(cwsIds) as CwsSlug[];

/**
 * Resolve a slug to its CWS detail URL.
 * Returns undefined for unknown slugs so callers can decide how to fall back.
 */
export function getCwsUrl(slug: string): string | undefined {
  return (cwsLinks as Record<string, string>)[slug];
}
