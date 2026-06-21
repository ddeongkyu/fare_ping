import "react-native-url-polyfill/auto";

import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";
import { createClient } from "@supabase/supabase-js";

const rawSupabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || "";
const supabaseUrl = rawSupabaseUrl.replace(/\/rest\/v1\/?$/, "").replace(/\/+$/, "");
const supabaseKey =
  process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || "";

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseKey);

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseKey, {
      auth: {
        autoRefreshToken: true,
        detectSessionInUrl: Platform.OS === "web",
        persistSession: true,
        storage: Platform.OS === "web" ? undefined : AsyncStorage,
      },
    })
  : null;

export function getSupabaseStatusLabel() {
  if (!isSupabaseConfigured) return "로컬 모드";
  return "Supabase 연결";
}
