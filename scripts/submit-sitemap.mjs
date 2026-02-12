// Submit sitemap to Google Search Console via API
// Requires GOOGLE_SERVICE_ACCOUNT_JSON env variable (JSON key content)
import { google } from 'googleapis';

const SITES = [
  {
    siteUrl: 'sc-domain:dev-tools-hub.xyz',
    sitemaps: ['https://dev-tools-hub.xyz/sitemap-index.xml'],
  },
  {
    siteUrl: 'sc-domain:reshapic.dev-tools-hub.xyz',
    sitemaps: ['https://reshapic.dev-tools-hub.xyz/sitemap.xml'],
  },
];

async function main() {
  const keyJson = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
  if (!keyJson) {
    console.error('GOOGLE_SERVICE_ACCOUNT_JSON environment variable is required');
    process.exit(1);
  }

  const key = JSON.parse(keyJson);

  const auth = new google.auth.GoogleAuth({
    credentials: key,
    scopes: ['https://www.googleapis.com/auth/webmasters'],
  });

  const searchconsole = google.searchconsole({ version: 'v1', auth });

  // List all accessible sites
  let siteEntries = [];
  try {
    const siteList = await searchconsole.sites.list();
    siteEntries = siteList.data.siteEntry || [];
    console.log('Accessible sites:');
    for (const s of siteEntries) {
      console.log(`  ${s.siteUrl} (${s.permissionLevel})`);
    }
  } catch (err) {
    console.error(`Failed to list sites: ${err.message}`);
    process.exit(1);
  }

  for (const site of SITES) {
    console.log(`\n=== ${site.siteUrl} ===`);

    const registered = siteEntries.find((s) => s.siteUrl === site.siteUrl);
    if (!registered) {
      console.warn('  Not accessible. Skipping.');
      continue;
    }
    console.log(`  Permission: ${registered.permissionLevel}`);

    // Submit each sitemap
    for (const sitemapUrl of site.sitemaps) {
      try {
        await searchconsole.sitemaps.submit({
          siteUrl: site.siteUrl,
          feedpath: sitemapUrl,
        });
        console.log(`  Submitted: ${sitemapUrl}`);
      } catch (err) {
        console.error(`  Failed to submit ${sitemapUrl}: ${err.message}`);
      }
    }

    // List current sitemaps
    try {
      const res = await searchconsole.sitemaps.list({ siteUrl: site.siteUrl });
      const maps = res.data.sitemap || [];
      console.log(`  Current sitemaps (${maps.length}):`);
      for (const m of maps) {
        console.log(`    - ${m.path} [last: ${m.lastSubmitted || 'never'}] errors=${m.errors || 0} warnings=${m.warnings || 0}`);
      }
    } catch (err) {
      console.error(`  Failed to list sitemaps: ${err.message}`);
    }
  }

  console.log('\nDone.');
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
