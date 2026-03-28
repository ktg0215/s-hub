/**
 * fetch-ga4-data.mjs
 *
 * Fetches GA4 event data for Chrome extensions.
 * Usage: node scripts/fetch-ga4-data.mjs
 */

import { google } from "googleapis";
import { readFileSync } from "fs";

const TARGET_MEASUREMENT_ID = "G-H97K0NSECJ";
const SERVICE_ACCOUNT_KEY_PATH = "C:/Users/ktgsh/Downloads/summer-topic-483804-c6-4a9b654436b1.json";
const SERVICE_ACCOUNT_EMAIL = "search-console-bo@summer-topic-483804-c6.iam.gserviceaccount.com";
const TARGET_EVENTS = ["review_prompt_shown", "review_prompt_clicked", "review_prompt_dismissed"];

function getAuthClient() {
  let keyData;
  if (process.env.GOOGLE_SERVICE_ACCOUNT_JSON) {
    keyData = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON);
  } else {
    keyData = JSON.parse(readFileSync(SERVICE_ACCOUNT_KEY_PATH, "utf-8"));
  }
  return new google.auth.GoogleAuth({
    credentials: keyData,
    scopes: [
      "https://www.googleapis.com/auth/analytics.readonly",
      "https://www.googleapis.com/auth/analytics.edit",
    ],
  });
}

async function findPropertyId(auth) {
  console.log("=".repeat(70));
  console.log("Step 1: Discovering GA4 properties via Analytics Admin API");
  console.log("=".repeat(70));
  console.log("Target measurement ID: " + TARGET_MEASUREMENT_ID);
  console.log("Service account: " + SERVICE_ACCOUNT_EMAIL + "\n");

  const analyticsadmin = google.analyticsadmin({ version: "v1beta", auth });

  try {
    console.log("Calling analyticsadmin.properties.list ...");
    const res = await analyticsadmin.properties.list({
      filter: "ancestor:accounts/-",
      pageSize: 200,
    });

    const properties = res.data.properties || [];
    console.log("Found " + properties.length + " GA4 property(ies) accessible.\n");

    if (properties.length === 0) {
      return null;
    }

    for (const prop of properties) {
      console.log(
        "  - " + prop.name + "  displayName=" + JSON.stringify(prop.displayName) +
        "  parent=" + prop.parent
      );
    }
    console.log();
    for (const prop of properties) {
      const propertyId = prop.name;
      try {
        const streamsRes = await analyticsadmin.properties.dataStreams.list({
          parent: propertyId,
        });
        const streams = streamsRes.data.dataStreams || [];
        for (const stream of streams) {
          if (
            stream.webStreamData &&
            stream.webStreamData.measurementId === TARGET_MEASUREMENT_ID
          ) {
            const numericId = propertyId.replace("properties/", "");
            console.log(
              "MATCH FOUND: property " + numericId +
              " (" + JSON.stringify(prop.displayName) +
              ") has measurement ID " + TARGET_MEASUREMENT_ID
            );
            return numericId;
          }
        }
      } catch (streamErr) {
        console.log(
          "  (Could not list data streams for " + propertyId + ": " + streamErr.message + ")"
        );
      }
    }

    console.log("No property found with measurement ID " + TARGET_MEASUREMENT_ID + ".");
    return null;
  } catch (err) {
    console.error("Admin API error: " + err.message);
    if (err.code === 403 || err.code === 401) {
      console.log("\nThe service account does not have access to the Analytics Admin API.");
      console.log("This likely means the service account has not been added to the GA4 property.\n");
    }
    return null;
  }
}

async function fetchEventData(auth, propertyId) {
  console.log("\n" + "=".repeat(70));
  console.log("Step 2: Fetching event data for property " + propertyId + " (last 30 days)");
  console.log("=".repeat(70) + "\n");

  const analyticsdata = google.analyticsdata({ version: "v1beta", auth });
  const property = "properties/" + propertyId;

  console.log("Report A: Event counts grouped by event_name & extension_name\n");
  try {
    const reportA = await analyticsdata.properties.runReport({
      property,
      requestBody: {
        dateRanges: [{ startDate: "30daysAgo", endDate: "today" }],
        dimensions: [
          { name: "eventName" },
          { name: "customEvent:extension_name" },
        ],
        metrics: [{ name: "eventCount" }],
        orderBys: [{ metric: { metricName: "eventCount" }, desc: true }],
        limit: 100,
      },
    });
    printReport(reportA.data, ["Event Name", "Extension Name", "Event Count"]);
  } catch (err) {
    console.error("Report A failed: " + err.message + "\n");
    console.log("Retrying without custom dimension (extension_name) ...\n");
    try {
      const reportA2 = await analyticsdata.properties.runReport({
        property,
        requestBody: {
          dateRanges: [{ startDate: "30daysAgo", endDate: "today" }],
          dimensions: [{ name: "eventName" }],
          metrics: [{ name: "eventCount" }],
          orderBys: [{ metric: { metricName: "eventCount" }, desc: true }],
          limit: 100,
        },
      });
      printReport(reportA2.data, ["Event Name", "Event Count"]);
    } catch (err2) {
      console.error("Fallback report also failed: " + err2.message + "\n");
    }
  }

  console.log("\nReport B: Review-prompt events (" + TARGET_EVENTS.join(", ") + ")\n");
  try {
    const reportB = await analyticsdata.properties.runReport({
      property,
      requestBody: {
        dateRanges: [{ startDate: "30daysAgo", endDate: "today" }],
        dimensions: [
          { name: "eventName" },
          { name: "customEvent:extension_name" },
          { name: "date" },
        ],
        metrics: [{ name: "eventCount" }],
        dimensionFilter: {
          filter: {
            fieldName: "eventName",
            inListFilter: { values: TARGET_EVENTS },
          },
        },
        orderBys: [{ dimension: { dimensionName: "date" }, desc: true }],
        limit: 200,
      },
    });
    printReport(reportB.data, ["Event Name", "Extension Name", "Date", "Event Count"]);
  } catch (err) {
    console.error("Report B failed: " + err.message);
    console.log("Retrying without custom dimension ...\n");
    try {
      const reportB2 = await analyticsdata.properties.runReport({
        property,
        requestBody: {
          dateRanges: [{ startDate: "30daysAgo", endDate: "today" }],
          dimensions: [{ name: "eventName" }, { name: "date" }],
          metrics: [{ name: "eventCount" }],
          dimensionFilter: {
            filter: {
              fieldName: "eventName",
              inListFilter: { values: TARGET_EVENTS },
            },
          },
          orderBys: [{ dimension: { dimensionName: "date" }, desc: true }],
          limit: 200,
        },
      });
      printReport(reportB2.data, ["Event Name", "Date", "Event Count"]);
    } catch (err2) {
      console.error("Fallback report B also failed: " + err2.message + "\n");
    }
  }
}

function printReport(data, headers) {
  const rows = data.rows || [];
  if (rows.length === 0) {
    console.log("  (no data returned)\n");
    return;
  }

  const colWidths = headers.map((h) => h.length);
  const tableRows = rows.map((row) => {
    const dims = (row.dimensionValues || []).map((d) => d.value || "(not set)");
    const mets = (row.metricValues || []).map((m) => m.value || "0");
    const cells = [...dims, ...mets];
    cells.forEach((c, i) => {
      if (i < colWidths.length) {
        colWidths[i] = Math.max(colWidths[i], c.length);
      }
    });
    return cells;
  });

  const headerLine = headers.map((h, i) => h.padEnd(colWidths[i])).join("  |  ");
  console.log("  " + headerLine);
  console.log("  " + colWidths.map((w) => "-".repeat(w)).join("--+--"));

  for (const cells of tableRows) {
    const line = cells.map((c, i) => c.padEnd(colWidths[i] || 0)).join("  |  ");
    console.log("  " + line);
  }

  console.log("\n  Total rows: " + rows.length);
  if (data.rowCount) {
    console.log("  Row count (server): " + data.rowCount);
  }
  console.log();
}

async function main() {
  console.log("GA4 Data Fetcher for Chrome Extensions");
  console.log("=".repeat(70) + "\n");

  const auth = getAuthClient();
  let propertyId = await findPropertyId(auth);

  if (!propertyId) {
    console.log("\n" + "=".repeat(70));
    console.log("RESULT: Could not find or access the GA4 property.");
    console.log("=".repeat(70));
    console.log("\nTo grant access, the GA4 property owner needs to:");
    console.log("\n  1. Go to Google Analytics (https://analytics.google.com)");
    console.log("  2. Open the property with measurement ID " + TARGET_MEASUREMENT_ID);
    console.log("  3. Go to Admin > Property Access Management");
    console.log("  4. Click the + button and add the service account email:");
    console.log("     " + SERVICE_ACCOUNT_EMAIL);
    console.log("  5. Grant at least Viewer role (for read-only access)");
    console.log("\nAfter that, re-run this script.");
    console.log("\nAlternatively, if you know the numeric GA4 property ID, set it");
    console.log("as an environment variable and re-run:\n");
    console.log("  GA4_PROPERTY_ID=123456789 node scripts/fetch-ga4-data.mjs\n");

    if (process.env.GA4_PROPERTY_ID) {
      propertyId = process.env.GA4_PROPERTY_ID;
      console.log("Using GA4_PROPERTY_ID from environment: " + propertyId + "\n");
    } else {
      return;
    }
  }

  await fetchEventData(auth, propertyId);
}

main().catch((err) => {
  console.error("Unhandled error:", err);
  process.exit(1);
});
