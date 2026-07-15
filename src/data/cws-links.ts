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

/** UTM params forwarded by the /go attribution hub to GA4 (`outbound_to_cws`). */
export interface GoUtm {
  source?: string;
  medium?: string;
  campaign?: string;
}

/**
 * Build an attribution-hub URL (/go/<slug>?utm_*) for a known slug.
 * The /go page fires GA4 `outbound_to_cws` then redirects to the CWS detail URL.
 * Returns undefined for unknown slugs so callers can fall back to the raw CWS URL.
 */
export function getGoUrl(slug: string, utm: GoUtm = {}): string | undefined {
  if (!(slug in cwsLinks)) return undefined;
  const params = new URLSearchParams();
  if (utm.source) params.set('utm_source', utm.source);
  if (utm.medium) params.set('utm_medium', utm.medium);
  if (utm.campaign) params.set('utm_campaign', utm.campaign);
  const qs = params.toString();
  return `/go/${slug}${qs ? `?${qs}` : ''}`;
}

/**
 * ③v2 LP attribution: CTA リンクを s-hub-dashboard /api/track/install 経由にルーティング。
 * server-side で lp_install_clicks に記録 → CWS へ 302 リダイレクト。
 * 不明 slug や本番 URL 未設定時は undefined を返す (呼び元は getGoUrl / chromeUrl にフォールバック)。
 *
 * 拡張コード・決済導線 無変更。
 */
const TRACK_BASE = 'https://s-hub-dashboard-beta.vercel.app/api/track/install';

export interface TrackParams {
  channel?: string;   // default 'lp'
  campaign?: string;
  ref?: string;       // referrer path (PII-free)
  // ③v2 UTM: 着地元 UTM。SSG では build 時に不明なため通常は空 →
  // クライアント側 utm-forward スクリプトが着地 URL から実行時に付与する。
  // 明示的に build 時に既知の UTM を持つ呼び元向けに forward も可能にしておく。
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
}

export function getTrackUrl(slug: string, trackParams: TrackParams = {}): string | undefined {
  if (!(slug in cwsLinks)) return undefined;
  const params = new URLSearchParams({ ext: slug });
  if (trackParams.channel) params.set('channel', trackParams.channel);
  if (trackParams.campaign) params.set('campaign', trackParams.campaign);
  if (trackParams.ref) params.set('ref', trackParams.ref);
  if (trackParams.utmSource) params.set('utm_source', trackParams.utmSource);
  if (trackParams.utmMedium) params.set('utm_medium', trackParams.utmMedium);
  if (trackParams.utmCampaign) params.set('utm_campaign', trackParams.utmCampaign);
  return `${TRACK_BASE}?${params.toString()}`;
}
