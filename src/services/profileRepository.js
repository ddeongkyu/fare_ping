import { supabase } from "./supabaseClient";

export async function ensureUserProfile(user) {
  if (!supabase || !user?.id) return;

  const displayName = user.email ? user.email.split("@")[0] : null;
  const { error } = await supabase.from("profiles").upsert(
    {
      id: user.id,
      display_name: displayName,
      locale: "ko-KR",
      timezone: "Asia/Seoul",
      preferred_currency: "KRW",
    },
    { onConflict: "id" },
  );

  if (error) throw error;
}
