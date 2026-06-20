// Local validation helper for the Aviasales / Travelpayouts Data API.
// Requires your own TRAVELPAYOUTS_TOKEN or TP_TOKEN environment variable.
// Never commit real API tokens to this repository.

const token = process.env.TRAVELPAYOUTS_TOKEN || process.env.TP_TOKEN;

const routes = [
  ["LON", "PAR"],
  ["NYC", "LON"],
  ["ICN", "NRT"],
  ["ICN", "KIX"],
  ["GMP", "HND"],
  ["PUS", "FUK"],
  ["ICN", "YVR"],
  ["ICN", "CDG"],
  ["NRT", "ICN"],
  ["KIX", "ICN"],
  ["FUK", "PUS"],
  ["YVR", "ICN"],
];

function getArg(name, fallback) {
  const prefix = `--${name}=`;
  const arg = process.argv.find((item) => item.startsWith(prefix));
  return arg ? arg.slice(prefix.length) : fallback;
}

function nextMonth() {
  const date = new Date();
  date.setUTCMonth(date.getUTCMonth() + 1, 1);
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

function formatOffer(offer) {
  if (!offer) return "no cached offer";

  const parts = [
    `${offer.value ?? offer.price ?? "?"}`,
    offer.depart_date || offer.departure_at ? `depart ${offer.depart_date || offer.departure_at}` : "",
    offer.return_date || offer.return_at ? `return ${offer.return_date || offer.return_at}` : "",
    offer.number_of_changes != null ? `${offer.number_of_changes} stops` : "",
    offer.found_at ? `found ${offer.found_at}` : "",
  ].filter(Boolean);

  return parts.join(" | ");
}

async function fetchRoute([origin, destination], options) {
  const url = new URL("https://api.travelpayouts.com/aviasales/v3/prices_for_dates");
  url.searchParams.set("origin", origin);
  url.searchParams.set("destination", destination);
  url.searchParams.set("departure_at", options.month);
  url.searchParams.set("one_way", "true");
  url.searchParams.set("direct", options.direct);
  url.searchParams.set("currency", options.currency);
  url.searchParams.set("market", options.market);
  url.searchParams.set("sorting", "price");
  url.searchParams.set("limit", "10");
  url.searchParams.set("page", "1");
  url.searchParams.set("token", token);

  const response = await fetch(url, {
    headers: {
      "Accept": "application/json",
      "Accept-Encoding": "gzip, deflate",
    },
  });

  const text = await response.text();
  let body;

  try {
    body = JSON.parse(text);
  } catch {
    body = { success: false, error: text.slice(0, 220), data: [] };
  }

  const data = Array.isArray(body.data) ? body.data : [];
  const cheapest = data
    .slice()
    .sort((a, b) => (a.value ?? a.price ?? Infinity) - (b.value ?? b.price ?? Infinity))[0];

  return {
    route: `${origin}-${destination}`,
    status: response.status,
    success: body.success,
    count: data.length,
    error: body.error || null,
    cheapest: formatOffer(cheapest),
  };
}

async function main() {
  if (!token) {
    console.error("Missing token. Run with TRAVELPAYOUTS_TOKEN=your_api_token or TP_TOKEN=your_api_token.");
    process.exit(1);
  }

  const options = {
    month: getArg("month", nextMonth()),
    currency: getArg("currency", "krw").toLowerCase(),
    market: getArg("market", "kr").toLowerCase(),
    direct: getArg("direct", "false"),
  };

  console.log(`Testing Aviasales Data API for ${options.month}, ${options.currency.toUpperCase()}, market=${options.market}`);
  console.log("Note: empty data can be normal because this API returns cached prices recently found by Aviasales users.\n");

  for (const route of routes) {
    try {
      const result = await fetchRoute(route, options);
      const label = result.success ? "OK" : "FAIL";
      console.log(`${label} ${result.route} | HTTP ${result.status} | ${result.count} offers | ${result.cheapest}`);
      if (result.error) console.log(`   error: ${result.error}`);
    } catch (error) {
      console.log(`FAIL ${route.join("-")} | ${error.message}`);
    }
  }
}

main();
