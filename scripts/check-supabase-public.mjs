import fs from "node:fs";
import path from "node:path";

function readDotenv() {
  const envPath = path.join(process.cwd(), ".env");
  if (!fs.existsSync(envPath)) return {};

  return Object.fromEntries(
    fs
      .readFileSync(envPath, "utf8")
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith("#") && line.includes("="))
      .map((line) => {
        const index = line.indexOf("=");
        return [line.slice(0, index), line.slice(index + 1).replace(/^["']|["']$/g, "")];
      }),
  );
}

const dotenv = readDotenv();
const rawUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || dotenv.EXPO_PUBLIC_SUPABASE_URL || "";
const key =
  process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ||
  dotenv.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  dotenv.EXPO_PUBLIC_SUPABASE_ANON_KEY ||
  "";

const supabaseUrl = rawUrl.replace(/\/rest\/v1\/?$/, "").replace(/\/+$/, "");

if (!supabaseUrl || !key) {
  console.error("Missing EXPO_PUBLIC_SUPABASE_URL or EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY.");
  process.exit(1);
}

async function request(pathname) {
  const response = await fetch(`${supabaseUrl}/rest/v1/${pathname}`, {
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
    },
  });
  const body = await response.text();

  return { body, response };
}

console.log("Checking Supabase public client configuration");
console.log(`Project: ${supabaseUrl}`);

const airports = await request("airports?select=iata_code,name_ko&limit=5");
if (!airports.response.ok) {
  console.error(`FAIL airports read | HTTP ${airports.response.status} | ${airports.body}`);
  process.exit(1);
}

const airportRows = JSON.parse(airports.body);
console.log(`OK airports read | ${airportRows.length} rows | ${airportRows.map((row) => row.iata_code).join(", ")}`);

const alerts = await request("fare_alerts?select=id&limit=1");
if (alerts.response.ok) {
  const rows = JSON.parse(alerts.body);
  if (rows.length === 0) {
    console.log("OK fare_alerts anon read returned 0 rows under RLS.");
  } else {
    console.log(`WARN fare_alerts anon read returned HTTP 200 with ${rows.length} rows.`);
    console.log("Expected zero rows or an authorization error unless an authenticated user token is supplied.");
  }
} else {
  console.log(`OK fare_alerts protected from anon reads | HTTP ${alerts.response.status}`);
}

console.log("Supabase public smoke test complete.");
