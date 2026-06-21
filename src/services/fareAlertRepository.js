import { airportOptions } from "../data/flightData";
import { formatWon, routeName } from "../domain/flightAlerts";
import { supabase } from "./supabaseClient";

const ALERT_SELECT = [
  "id",
  "origin_iata",
  "destination_iata",
  "trip_type",
  "cabin_class",
  "adult_count",
  "child_count",
  "infant_count",
  "departure_date_from",
  "departure_date_to",
  "return_date_from",
  "return_date_to",
  "target_price_amount",
  "target_currency",
  "max_stops",
  "carry_on_bag_count",
  "checked_bag_count",
  "price_drop_threshold_percent",
  "status",
  "created_at",
  "updated_at",
].join(",");

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

function minutesToDuration(minutes) {
  if (typeof minutes !== "number") return "2h 00m";
  const hours = Math.floor(minutes / 60);
  const remaining = minutes % 60;

  return `${hours}h ${String(remaining).padStart(2, "0")}m`;
}

function statusLabel(status) {
  if (status === "triggered") return "도달";
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
    persisted: true,
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
    statusCode: row.status,
    date: dateLabel(row),
    departureDateFrom: row.departure_date_from,
    departureDateTo: row.departure_date_to,
    returnDateFrom: row.return_date_from,
    returnDateTo: row.return_date_to,
    direct: row.max_stops === 0,
    tripType: row.trip_type === "one_way" ? "oneway" : "round",
    cabinClass: row.cabin_class,
    adultCount: row.adult_count,
    childCount: row.child_count,
    infantCount: row.infant_count,
    cabinBags: row.carry_on_bag_count,
    checkedBags: row.checked_bag_count,
    stopCount: row.max_stops,
    layovers: (row.layoverRules || []).map((layover) => ({
      airport: layover.airport_iata || "TPE",
      terminal: layover.terminal_code || "T1",
      duration: minutesToDuration(layover.max_layover_minutes || layover.min_layover_minutes),
    })),
    priceDropThresholdPercent: row.price_drop_threshold_percent,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function attachLayoverRules(rows) {
  if (!supabase || !rows.length) return rows;

  const ids = rows.map((row) => row.id);
  const { data, error } = await supabase
    .from("fare_alert_layover_rules")
    .select("alert_id,sequence,airport_iata,terminal_code,min_layover_minutes,max_layover_minutes")
    .in("alert_id", ids)
    .order("sequence", { ascending: true });

  if (error) throw error;

  return rows.map((row) => ({
    ...row,
    layoverRules: data.filter((rule) => rule.alert_id === row.id),
  }));
}

export async function fetchFareAlerts(userId, airports = airportOptions) {
  if (!supabase || !userId) return [];

  const { data, error } = await supabase
    .from("fare_alerts")
    .select(ALERT_SELECT)
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) throw error;

  const rows = await attachLayoverRules(data);

  return rows.map((row) => mapFareAlertRow(row, airports));
}

function draftToPayload(userId, draft) {
  const isRoundTrip = draft.tripType === "round";

  return {
    user_id: userId,
    origin_iata: draft.origin.code,
    destination_iata: draft.destination.code,
    trip_type: isRoundTrip ? "round_trip" : "one_way",
    cabin_class: draft.cabinClass || "economy",
    adult_count: draft.adultCount || 1,
    child_count: draft.childCount || 0,
    infant_count: draft.infantCount || 0,
    departure_date_from: draft.departureDateFrom || DEFAULT_DEPARTURE_FROM,
    departure_date_to: draft.departureDateTo || DEFAULT_DEPARTURE_TO,
    return_date_from: isRoundTrip ? draft.returnDateFrom || DEFAULT_RETURN_FROM : null,
    return_date_to: isRoundTrip ? draft.returnDateTo || DEFAULT_RETURN_TO : null,
    target_price_amount: draft.targetValue,
    target_currency: "KRW",
    max_stops: draft.stopCount,
    carry_on_bag_count: draft.cabinBags,
    checked_bag_count: draft.checkedBags,
    price_drop_threshold_percent: draft.priceDropThresholdPercent || 5,
    client_note: "Created from FarePing app prototype",
  };
}

async function replaceLayoverRules(alertId, draft) {
  const { error: deleteError } = await supabase.from("fare_alert_layover_rules").delete().eq("alert_id", alertId);
  if (deleteError) throw deleteError;

  const layoverRules = draft.layovers.slice(0, draft.stopCount).map((layover, index) => {
    const minutes = durationToMinutes(layover.duration);

    return {
      alert_id: alertId,
      sequence: index + 1,
      airport_iata: layover.airport,
      terminal_code: layover.terminal,
      min_layover_minutes: minutes,
      max_layover_minutes: minutes,
    };
  });

  if (!layoverRules.length) return;

  const { error: insertError } = await supabase.from("fare_alert_layover_rules").insert(layoverRules);
  if (insertError) throw insertError;
}

async function insertLayoverRules(alertId, draft) {
  const layoverRules = draft.layovers.slice(0, draft.stopCount).map((layover, index) => {
    const minutes = durationToMinutes(layover.duration);

    return {
      alert_id: alertId,
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
}

export async function saveFareAlert(userId, draft, airports = airportOptions) {
  if (!supabase || !userId) return null;

  const payload = draftToPayload(userId, draft);
  const { data, error } = await supabase.from("fare_alerts").insert(payload).select(ALERT_SELECT).single();

  if (error) throw error;

  await insertLayoverRules(data.id, draft);

  const [row] = await attachLayoverRules([data]);

  return mapFareAlertRow(row, airports);
}

export async function updateFareAlert(userId, draft, airports = airportOptions) {
  if (!supabase || !userId || !draft.id) return null;

  const payload = draftToPayload(userId, draft);
  const { data, error } = await supabase
    .from("fare_alerts")
    .update(payload)
    .eq("id", draft.id)
    .eq("user_id", userId)
    .select(ALERT_SELECT)
    .single();

  if (error) throw error;

  await replaceLayoverRules(data.id, draft);

  const [row] = await attachLayoverRules([data]);

  return mapFareAlertRow(row, airports);
}

export async function updateFareAlertStatus(userId, alertId, status, airports = airportOptions) {
  if (!supabase || !userId || !alertId) return null;

  const { data, error } = await supabase
    .from("fare_alerts")
    .update({ status })
    .eq("id", alertId)
    .eq("user_id", userId)
    .select(ALERT_SELECT)
    .single();

  if (error) throw error;

  const [row] = await attachLayoverRules([data]);

  return mapFareAlertRow(row, airports);
}

export async function deleteFareAlert(userId, alertId) {
  if (!supabase || !userId || !alertId) return;

  const { error } = await supabase.from("fare_alerts").delete().eq("id", alertId).eq("user_id", userId);

  if (error) throw error;
}
