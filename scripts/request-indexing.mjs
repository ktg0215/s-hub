// Request indexing for all URLs in reshapic sitemap via Google Indexing API
import { google } from 'googleapis';
import https from 'https';

function fetchSitemap(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        const urls = [];
        const re = /<loc>(.*?)<\/loc>/g;
        let m;
        while ((m = re.exec(data)) !== null) {
          urls.push(m[1]);
        }
        resolve(urls);
      });
    }).on('error', reject);
  });
}

async function main() {
  const keyJson = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
  if (!keyJson) {
    console.error('GOOGLE_SERVICE_ACCOUNT_JSON environment variable is required');
    process.exit(1);
  }

  const key = JSON.parse(keyJson);

  // Get URLs from sitemap
  const urls = await fetchSitemap('https://reshapic.dev-tools-hub.xyz/sitemap.xml');
  console.log(`Found ${urls.length} URLs in sitemap:`);
  urls.forEach((u) => console.log(`  ${u}`));

  // Use Indexing API
  const auth = new google.auth.GoogleAuth({
    credentials: key,
    scopes: ['https://www.googleapis.com/auth/indexing'],
  });
  const authClient = await auth.getClient();

  console.log('\nSubmitting indexing requests...');
  let success = 0;
  let failed = 0;

  for (const url of urls) {
    try {
      const res = await authClient.request({
        url: 'https://indexing.googleapis.com/v3/urlNotifications:publish',
        method: 'POST',
        data: {
          url: url,
          type: 'URL_UPDATED',
        },
      });
      const meta = res.data.urlNotificationMetadata;
      console.log(`  OK: ${url}`);
      success++;
    } catch (err) {
      const status = err.response?.status || 'unknown';
      const msg = err.response?.data?.error?.message || err.message;
      console.error(`  FAIL (${status}): ${url} -> ${msg}`);
      failed++;
    }
  }

  console.log(`\nResults: ${success} success, ${failed} failed out of ${urls.length}`);
}

main().catch((err) => {
  console.error('Fatal:', err.message);
  process.exit(1);
});
