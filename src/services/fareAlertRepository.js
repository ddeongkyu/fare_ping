import { airportOptions } from "../data/flightData";
import { formatWon, routeName } from "../domain/flightAlerts";
import { supabase } from "./supabaseClient";

const DEFAULT_DEPARTURE_FROM = "2026-09-01";
const DEFAULT_DEPARTURE_TO = "2026-09-30";
const DEFAULT_RETURN_FROM = "2026-09-20";
const DEFAULT_RETURN_TO = "2026-09-30";

function airportsByCode(airports) {
  return (airports.length ? airports : airportOptions).reduce((map, airport) => {
    map[airport.code] = airport;
    return map;
  }, {});
}

function durationToMinutes(duration) {
  const match = /^(\d+)h\s+(\d+)m$/.exec(duration || "");
  if (!match) return null;
  return Number(match[1]) * 60 + Number(match[2]);
}

function statusLabel(status) {
  if (status === "paused") return "일시정지";
  if (status === "expired") return "만료";
  if (status === "archived") return "보관됨";
  return "추적 중";
}

function dateLabel(row) {
  const from = new Date(`${row.departure_date_from}T00:00:00+09:00`);
  const to = new Date(`${row.departure_date_to}T00:00:00+09:00`);
  const fromLabel = `${from.getMonth() + 1}월 ${from.getDate()}일`;
  const toLabel = `${to.getMonth() + 1}월 ${to.getDate()}일`;

  return row.departure_date_from === row.departure_date_to ? fromLabel : `${fromLabel} - ${toLabel}`;
}

export function mapFareAlertRow(row, airports = airportOptions) {
  const airportMap = airportsByCode(airports);
  const origin = airportMap[row.origin_iata] || {
    code: row.origin_iata,
    city: row.origin_iata,
    country: "",
    name: row.origin_iata,
  };
  const destination = airportMap[row.destination_iata] || {
    code: row.destination_iata,
    city: row.destination_iata,
    country: "",
    name: row.destination_iata,
  };
  const route = routeName(origin, destination);

  return {
    id: row.id,
    from: origin.code,
    to: destination.code,
    city: destination.city,
    route,
    price: "확인 대기",
    priceValue: null,
    target: formatWon(row.target_price_amount),
    targetValue: row.target_price_amount,
    note: "Supabase에 저장된 알림",
    status: statusLabel(row.status),
    date: dateLabel(row),
    direct: row.max_stops === 0,
    tripType: row.trip_type === "one_way" ? "oneway" : "round",
    cabinBags: row.carry_on_bag_count,
    checkedBags: row.checked_bag_count,
    stopCount: row.max_stops,
    createdAt: row.created_at,
  };
}

export async function fetchFareAlerts(userId, airports = airportOptions) {
  if (!supabase || !userId) return [];

  const { data, error } = await supabase
    .from("fare_alerts")
    .select(
      [
        "id",
        "origin_iata",
        "destination_iata",
        "trip_type",
        "departure_date_from",
        "departure_date_to",
        "return_date_from",
        "return_date_to",
        "target_price_amount",
        "target_currency",
        "max_stops",
        "carry_on_bag_count",
        "checked_bag_count",
        "status",
        "created_at",
      ].join(","),
    )
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) throw error;

  return data.map((row) => mapFareAlertRow(row, airports));
}

export async function saveFareAlert(userId, draft, airports = airportOptions) {
  if (!supabase || !userId) return null;

  const isRoundTrip = draft.tripType === "round";
  const payload = {
    user_id: userId,
    origin_iata: draft.origin.code,
    destination_iata: draft.destination.code,
    trip_type: isRoundTrip ? "round_trip" : "one_way",
    cabin_class: "economy",
    adult_count: 1,
    child_count: 0,
    infant_count: 0,
    departure_date_from: draft.departureDateFrom || DEFAULT_DEPARTURE_FROM,
    departure_date_to: draft.departureDateTo || DEFAULT_DEPARTURE_TO,
    return_date_from: isRoundTrip ? draft.returnDateFrom || DEFAULT_RETURN_FROM : null,
    return_date_to: isRoundTrip ? draft.returnDateTo || DEFAULT_RETURN_TO : null,
    target_price_amount: draft.targetValue,
    target_currency: "KRW",
    max_stops: draft.stopCount,
    carry_on_bag_count: draft.cabinBags,
    checked_bag_count: draft.checkedBags,
    client_note: "Created from FarePing app prototype",
  };

  const { data, error } = await supabase.from("fare_alerts").insert(payload).select("*").single();

  if (error) throw error;

  const layoverRules = draft.layovers.slice(0, draft.stopCount).map((layover, index) => {
    const minutes = durationToMinutes(layover.duration);

    return {
      alert_id: data.id,
      sequence: index + 1,
      airport_iata: layover.airport,
      terminal_code: layover.terminal,
      min_layover_minutes: minutes,
      max_layover_minutes: minutes,
    };
  });

  if (layoverRules.length) {
    const { error: layoverError } = await supabase.from("fare_alert_layover_rules").insert(layoverRules);
    if (layoverError) throw layoverError;
  }

  return mapFareAlertRow(data, airports);
}
