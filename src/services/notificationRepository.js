import { supabase } from "./supabaseClient";

function notificationType(type) {
  if (type === "target_met") return "target";
  if (type === "price_drop") return "drop";
  return "watch";
}

export function mapNotificationRow(row, alerts = []) {
  const target = alerts.find((alert) => alert.id === row.alert_id) || null;

  return {
    id: row.id,
    persisted: true,
    type: notificationType(row.notification_type),
    title: row.title,
    subtitle: row.body,
    body: row.body,
    fresh: row.status !== "read" && row.status !== "dismissed" && !row.read_at,
    status: row.status,
    actionUrl: row.action_url,
    target,
    createdAt: row.created_at,
  };
}

export async function fetchAlertNotifications(userId, alerts = []) {
  if (!supabase || !userId) return [];

  const { data, error } = await supabase
    .from("alert_notifications")
    .select("id,alert_id,notification_type,status,title,body,action_url,read_at,dismissed_at,created_at")
    .eq("user_id", userId)
    .neq("status", "dismissed")
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) throw error;

  return data.map((row) => mapNotificationRow(row, alerts));
}

export async function markNotificationRead(userId, notificationId) {
  if (!supabase || !userId || !notificationId) return;

  const { error } = await supabase
    .from("alert_notifications")
    .update({
      status: "read",
      read_at: new Date().toISOString(),
    })
    .eq("id", notificationId)
    .eq("user_id", userId);

  if (error) throw error;
}

export async function dismissNotification(userId, notificationId) {
  if (!supabase || !userId || !notificationId) return;

  const { error } = await supabase
    .from("alert_notifications")
    .update({
      status: "dismissed",
      dismissed_at: new Date().toISOString(),
    })
    .eq("id", notificationId)
    .eq("user_id", userId);

  if (error) throw error;
}
