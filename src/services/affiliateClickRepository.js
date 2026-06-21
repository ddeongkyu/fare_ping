import { Platform } from "react-native";

import { supabase } from "./supabaseClient";

export async function recordAffiliateClick({ alert, targetUrl, userId }) {
  if (!supabase || !userId || !targetUrl) return;

  const referrer =
    Platform.OS === "web" && typeof document !== "undefined" && document.referrer ? document.referrer : null;
  const userAgent =
    Platform.OS === "web" && typeof navigator !== "undefined" && navigator.userAgent ? navigator.userAgent : null;

  const { error } = await supabase.from("affiliate_clicks").insert({
    user_id: userId,
    alert_id: alert?.persisted ? alert.id : null,
    provider: "aviasales",
    target_url: targetUrl,
    referrer,
    user_agent: userAgent,
    client_platform: Platform.OS,
    metadata: {
      route: alert?.route || null,
      targetPrice: alert?.targetValue || null,
      source: "detail_screen",
    },
  });

  if (error) throw error;
}
