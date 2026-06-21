import { createClient } from "@supabase/supabase-js";

type FareAlert = {
  id: string;
  user_id: string;
  origin_iata: string;
  destination_iata: string;
  trip_type: "one_way" | "round_trip";
  departure_date_from: string;
  return_date_from: string | null;
  target_price_amount: number;
  target_currency: string;
  max_stops: number;
  check_frequency_minutes: number;
};

type ProviderOffer = {
  value?: number;
  price?: number;
  depart_date?: string;
  departure_at?: string;
  return_date?: string;
  return_at?: string;
  number_of_changes?: number;
  found_at?: string;
  link?: string;
  deep_link?: string;
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || Deno.env.get("SUPABASE_SECRET_KEY") || "";
const TRAVELPAYOUTS_TOKEN = Deno.env.get("TRAVELPAYOUTS_TOKEN") || Deno.env.get("TP_TOKEN") || "";
const CRON_SECRET = Deno.env.get("FAREPING_CRON_SECRET") || "";

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: {
    persistSession: false,
  },
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    headers: { "Content-Type": "application/json" },
    status,
  });
}

function monthFromDate(value: string) {
  return value.slice(0, 7);
}

function timestampFromProviderDate(value?: string) {
  if (!value) return null;
  if (value.includes("T")) return value;
  return `${value}T00:00:00Z`;
}

function getPrice(offer: ProviderOffer) {
  return offer.value || offer.price || 0;
}

async function fetchCheapestOffer(alert: FareAlert) {
  const url = new URL("https://api.travelpayouts.com/aviasales/v3/prices_for_dates");
  url.searchParams.set("origin", alert.origin_iata);
  url.searchParams.set("destination", alert.destination_iata);
  url.searchParams.set("departure_at", monthFromDate(alert.departure_date_from));
  url.searchParams.set("one_way", alert.trip_type === "one_way" ? "true" : "false");
  url.searchParams.set("direct", alert.max_stops === 0 ? "true" : "false");
  url.searchParams.set("currency", alert.target_currency.toLowerCase());
  url.searchParams.set("market", "kr");
  url.searchParams.set("sorting", "price");
  url.searchParams.set("limit", "10");
  url.searchParams.set("page", "1");
  url.searchParams.set("token", TRAVELPAYOUTS_TOKEN);

  if (alert.trip_type === "round_trip" && alert.return_date_from) {
    url.searchParams.set("return_at", monthFromDate(alert.return_date_from));
  }

  const response = await fetch(url, {
    headers: {
      Accept: "application/json",
      "Accept-Encoding": "gzip, deflate",
    },
  });
  const body = await response.json().catch(() => ({ data: [], success: false }));
  const offers = Array.isArray(body.data) ? body.data : [];
  const filteredOffers = offers.filter((offer: ProviderOffer) => {
    const stops = offer.number_of_changes ?? 0;
    return stops <= alert.max_stops && getPrice(offer) > 0;
  });
  const cheapest = filteredOffers.sort((a: ProviderOffer, b: ProviderOffer) => getPrice(a) - getPrice(b))[0];

  return {
    cheapest,
    count: offers.length,
    ok: response.ok && body.success !== false,
    providerStatus: response.status,
    rawError: body.error || null,
  };
}

async function processAlert(alert: FareAlert) {
  const { data: job, error: jobError } = await supabase
    .from("fare_search_jobs")
    .insert({
      alert_id: alert.id,
      provider: "aviasales",
      status: "running",
      scheduled_for: new Date().toISOString(),
      started_at: new Date().toISOString(),
      request_fingerprint: `${alert.origin_iata}-${alert.destination_iata}-${alert.departure_date_from}`,
    })
    .select("id")
    .single();

  if (jobError) throw jobError;

  try {
    const result = await fetchCheapestOffer(alert);
    const offer = result.cheapest;

    if (!result.ok) {
      throw new Error(result.rawError || `Provider HTTP ${result.providerStatus}`);
    }

    let observationId: string | null = null;
    const price = offer ? getPrice(offer) : 0;

    if (offer && price > 0) {
      const stopCount = offer.number_of_changes ?? 0;
      const { data: observation, error: observationError } = await supabase
        .from("fare_observations")
        .insert({
          alert_id: alert.id,
          search_job_id: job.id,
          provider: "aviasales",
          origin_iata: alert.origin_iata,
          destination_iata: alert.destination_iata,
          departure_at: timestampFromProviderDate(offer.departure_at || offer.depart_date) ||
            `${alert.departure_date_from}T00:00:00Z`,
          return_at: timestampFromProviderDate(offer.return_at || offer.return_date),
          price_amount: price,
          currency: alert.target_currency,
          is_direct: stopCount === 0,
          stop_count: stopCount,
          booking_url: offer.link || null,
          deep_link_url: offer.deep_link || null,
          raw_offer: offer,
          found_at: timestampFromProviderDate(offer.found_at),
        })
        .select("id")
        .single();

      if (observationError) throw observationError;
      observationId = observation.id;

      if (price <= alert.target_price_amount) {
        await supabase.from("alert_notifications").insert({
          user_id: alert.user_id,
          alert_id: alert.id,
          observation_id: observationId,
          notification_type: "target_met",
          status: "pending",
          title: `${alert.destination_iata} 항공권 목표가 도달`,
          body: `${alert.origin_iata}-${alert.destination_iata} 항공권이 ${price.toLocaleString("ko-KR")} ${alert.target_currency}에 발견되었습니다.`,
          action_url: offer.deep_link || offer.link || null,
        });
      }
    }

    await supabase
      .from("fare_search_jobs")
      .update({
        status: "succeeded",
        finished_at: new Date().toISOString(),
        result_count: result.count,
      })
      .eq("id", job.id);

    await supabase
      .from("fare_alerts")
      .update({
        last_checked_at: new Date().toISOString(),
        next_check_at: new Date(Date.now() + alert.check_frequency_minutes * 60 * 1000).toISOString(),
        triggered_at: price > 0 && price <= alert.target_price_amount ? new Date().toISOString() : null,
      })
      .eq("id", alert.id);

    return { alertId: alert.id, observationId, price };
  } catch (error) {
    await supabase
      .from("fare_search_jobs")
      .update({
        status: "failed",
        finished_at: new Date().toISOString(),
        error_code: "provider_error",
        error_message: error instanceof Error ? error.message : String(error),
      })
      .eq("id", job.id);

    throw error;
  }
}

Deno.serve(async (request) => {
  if (!SUPABASE_URL || !SERVICE_ROLE_KEY || !TRAVELPAYOUTS_TOKEN) {
    return json({ error: "Missing required Edge Function secrets." }, 500);
  }

  if (CRON_SECRET) {
    const token = request.headers.get("Authorization")?.replace(/^Bearer\s+/i, "");
    if (token !== CRON_SECRET) return json({ error: "Unauthorized" }, 401);
  }

  const url = new URL(request.url);
  const limit = Math.min(Number(url.searchParams.get("limit") || 10), 50);
  const now = new Date().toISOString();

  const { data: alerts, error } = await supabase
    .from("fare_alerts")
    .select(
      "id,user_id,origin_iata,destination_iata,trip_type,departure_date_from,return_date_from,target_price_amount,target_currency,max_stops,check_frequency_minutes",
    )
    .eq("status", "active")
    .or(`next_check_at.is.null,next_check_at.lte.${now}`)
    .order("next_check_at", { ascending: true, nullsFirst: true })
    .limit(limit);

  if (error) return json({ error: error.message }, 500);

  const results = [];
  for (const alert of (alerts || []) as FareAlert[]) {
    try {
      results.push(await processAlert(alert));
    } catch (error) {
      results.push({
        alertId: alert.id,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return json({ checked: results.length, results });
});
