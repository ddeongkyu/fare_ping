import { airportOptions } from "../data/flightData";
import { supabase } from "./supabaseClient";

const COUNTRY_NAMES = {
  CA: "캐나다",
  FR: "프랑스",
  GB: "영국",
  HK: "홍콩",
  JP: "일본",
  KR: "대한민국",
  SG: "싱가포르",
  TW: "대만",
  US: "미국",
};

function mapAirportRow(row) {
  return {
    code: row.iata_code,
    name: row.name_ko,
    city: row.city_ko,
    country: COUNTRY_NAMES[row.country_iso2] || row.country_iso2,
  };
}

export async function fetchAirportOptions() {
  if (!supabase) return airportOptions;

  const { data, error } = await supabase
    .from("airports")
    .select("iata_code,name_ko,city_ko,country_iso2")
    .eq("is_active", true)
    .order("country_iso2", { ascending: true })
    .order("city_ko", { ascending: true });

  if (error) throw error;

  return data.map(mapAirportRow);
}
