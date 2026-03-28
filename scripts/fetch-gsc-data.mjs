// Fetch Google Search Console performance data for dev-tools-hub.xyz
// Usage: node scripts/fetch-gsc-data.mjs
// Requires: service account key file or GOOGLE_SERVICE_ACCOUNT_JSON env variable

import { google } from 'googleapis';
import fs from 'fs';

const SITE_URL = 'sc-domain:dev-tools-hub.xyz';
const KEY_FILE_PATH = 'c:/Users/ktgsh/Downloads/summer-topic-483804-c6-4a9b654436b1.json';

function formatDate(date) {
  return date.toISOString().split('T')[0];
}

function getDateRange() {
  const end = new Date();
  end.setDate(end.getDate() - 1);
  const start = new Date();
  start.setDate(start.getDate() - 30);
  return { startDate: formatDate(start), endDate: formatDate(end) };
}

function fmtNum(n) {
  return n != null ? n.toLocaleString('en-US') : '0';
}

function fmtCtr(n) {
  return n != null ? (n * 100).toFixed(2) + '%' : '0.00%';
}

function fmtPos(n) {
  return n != null ? n.toFixed(1) : '0.0';
}

function padR(str, len) {
  return String(str).padEnd(len);
}

function padL(str, len) {
  return String(str).padStart(len);
}

function ln(char, len) {
  return (char || '-').repeat(len || 90);
}

async function main() {
  let credentials;
  if (process.env.GOOGLE_SERVICE_ACCOUNT_JSON) {
    credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON);
  } else if (fs.existsSync(KEY_FILE_PATH)) {
    credentials = JSON.parse(fs.readFileSync(KEY_FILE_PATH, 'utf8'));
  } else {
    console.error('No credentials found.');
    process.exit(1);
  }

  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/webmasters.readonly'],
  });

  const webmasters = google.webmasters({ version: 'v3', auth });
  const { startDate, endDate } = getDateRange();

  console.log('');
  console.log('==========================================================');
  console.log('  Google Search Console Performance Report');
  console.log('  Site: ' + SITE_URL);
  console.log('  Period: ' + startDate + ' ~ ' + endDate + ' (last 30 days)');
  console.log('==========================================================');
  console.log('');

  // 1. Overall totals
  try {
    const res = await webmasters.searchanalytics.query({
      siteUrl: SITE_URL,
      requestBody: {
        startDate,
        endDate,
        dimensions: [],
        rowLimit: 1,
      },
    });
    const rows = res.data.rows || [];
    if (rows.length > 0) {
      const r = rows[0];
      console.log('[ Overall Performance ]');
      console.log(ln('-', 50));
      console.log('  Total Clicks:       ' + fmtNum(r.clicks));
      console.log('  Total Impressions:  ' + fmtNum(r.impressions));
      console.log('  Average CTR:        ' + fmtCtr(r.ctr));
      console.log('  Average Position:   ' + fmtPos(r.position));
      console.log(ln('-', 50));
    } else {
      console.log('[ Overall Performance ] No data available.');
    }
  } catch (err) {
    console.error('Failed to fetch overall data: ' + err.message);
  }

  console.log('');

  // 2. Top Queries (by clicks, limit 30)
  try {
    const res = await webmasters.searchanalytics.query({
      siteUrl: SITE_URL,
      requestBody: {
        startDate,
        endDate,
        dimensions: ['query'],
        rowLimit: 30,
      },
    });
    const rows = res.data.rows || [];
    console.log('[ Top Queries ] (' + rows.length + ' results)');
    console.log(ln('-', 90));
    console.log('  ' + padR('#', 4) + padR('Query', 45) + padL('Clicks', 8) + padL('Impr.', 9) + padL('CTR', 9) + padL('Pos.', 7));
    console.log(ln('-', 90));
    rows.forEach(function(row, i) {
      const q = row.keys[0];
      const qd = q.length > 44 ? q.slice(0, 41) + '...' : q;
      console.log('  ' + padR(i + 1, 4) + padR(qd, 45) + padL(fmtNum(row.clicks), 8) + padL(fmtNum(row.impressions), 9) + padL(fmtCtr(row.ctr), 9) + padL(fmtPos(row.position), 7));
    });
    if (rows.length === 0) console.log('  No query data available.');
    console.log(ln('-', 90));
  } catch (err) {
    console.error('Failed to fetch query data: ' + err.message);
  }

  console.log('');

  // 3. Top Pages (by clicks, limit 20)
  try {
    const res = await webmasters.searchanalytics.query({
      siteUrl: SITE_URL,
      requestBody: {
        startDate,
        endDate,
        dimensions: ['page'],
        rowLimit: 20,
      },
    });
    const rows = res.data.rows || [];
    console.log('[ Top Pages ] (' + rows.length + ' results)');
    console.log(ln('-', 100));
    console.log('  ' + padR('#', 4) + padR('Page URL', 58) + padL('Clicks', 8) + padL('Impr.', 9) + padL('CTR', 9) + padL('Pos.', 7));
    console.log(ln('-', 100));
    rows.forEach(function(row, i) {
      let page = row.keys[0].replace('https://dev-tools-hub.xyz', '');
      if (!page) page = '/';
      const pd = page.length > 57 ? page.slice(0, 54) + '...' : page;
      console.log('  ' + padR(i + 1, 4) + padR(pd, 58) + padL(fmtNum(row.clicks), 8) + padL(fmtNum(row.impressions), 9) + padL(fmtCtr(row.ctr), 9) + padL(fmtPos(row.position), 7));
    });
    if (rows.length === 0) console.log('  No page data available.');
    console.log(ln('-', 100));
  } catch (err) {
    console.error('Failed to fetch page data: ' + err.message);
  }

  console.log('');

  // 4. Performance by Device
  try {
    const res = await webmasters.searchanalytics.query({
      siteUrl: SITE_URL,
      requestBody: {
        startDate,
        endDate,
        dimensions: ['device'],
        rowLimit: 10,
      },
    });
    const rows = res.data.rows || [];
    console.log('[ Performance by Device ]');
    console.log(ln('-', 65));
    console.log('  ' + padR('Device', 15) + padL('Clicks', 10) + padL('Impressions', 13) + padL('CTR', 10) + padL('Avg Pos.', 10));
    console.log(ln('-', 65));
    rows.forEach(function(row) {
      console.log('  ' + padR(row.keys[0], 15) + padL(fmtNum(row.clicks), 10) + padL(fmtNum(row.impressions), 13) + padL(fmtCtr(row.ctr), 10) + padL(fmtPos(row.position), 10));
    });
    if (rows.length === 0) console.log('  No device data available.');
    console.log(ln('-', 65));
  } catch (err) {
    console.error('Failed to fetch device data: ' + err.message);
  }

  console.log('');

  // 5. Performance by Country (top 10)
  try {
    const res = await webmasters.searchanalytics.query({
      siteUrl: SITE_URL,
      requestBody: {
        startDate,
        endDate,
        dimensions: ['country'],
        rowLimit: 10,
      },
    });
    const rows = res.data.rows || [];
    console.log('[ Performance by Country ] (top ' + rows.length + ')');
    console.log(ln('-', 68));
    console.log('  ' + padR('#', 4) + padR('Country', 12) + padL('Clicks', 10) + padL('Impressions', 13) + padL('CTR', 10) + padL('Avg Pos.', 10));
    console.log(ln('-', 68));
    rows.forEach(function(row, i) {
      console.log('  ' + padR(i + 1, 4) + padR(row.keys[0], 12) + padL(fmtNum(row.clicks), 10) + padL(fmtNum(row.impressions), 13) + padL(fmtCtr(row.ctr), 10) + padL(fmtPos(row.position), 10));
    });
    if (rows.length === 0) console.log('  No country data available.');
    console.log(ln('-', 68));
  } catch (err) {
    console.error('Failed to fetch country data: ' + err.message);
  }

  console.log('');
  console.log('Report generated at: ' + new Date().toISOString());
  console.log('');
}

main().catch(function(err) {
  console.error('Fatal error:', err);
  process.exit(1);
});
