import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { ACHIEVEMENTS, computeUnlockedKeys } from "@/lib/achievements";

export async function POST() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "no autenticado" }, { status: 401 });
  const uid = user.id;

  const [
    { count: totalWorkouts },
    { data: streakRow },
    { count: totalPRs },
    { data: volumeRows },
    { count: totalFoodLogs },
    { count: waterCount },
    { count: photoCount },
    { count: routineCount },
    { data: existing },
  ] = await Promise.all([
    supabase.from("workout_logs").select("id", { count: "exact", head: true }).eq("client_id", uid),
    supabase.from("streaks").select("current_weeks").eq("client_id", uid).single(),
    supabase.from("personal_records").select("id", { count: "exact", head: true }).eq("client_id", uid),
    supabase.from("workout_logs").select("total_volume").eq("client_id", uid),
    supabase.from("nutrition_logs").select("id", { count: "exact", head: true }).eq("client_id", uid),
    supabase.from("water_logs").select("client_id", { count: "exact", head: true }).eq("client_id", uid),
    supabase.from("progress_photos").select("id", { count: "exact", head: true }).eq("client_id", uid),
    supabase.from("routines").select("id", { count: "exact", head: true }).eq("created_by", uid).eq("source", "client"),
    supabase.from("user_achievements").select("achievement_key").eq("client_id", uid),
  ]);

  const totalVolume = (volumeRows ?? []).reduce((s, r) => s + (r.total_volume ?? 0), 0);

  const unlockedKeys = computeUnlockedKeys({
    totalWorkouts: totalWorkouts ?? 0,
    currentStreak: streakRow?.current_weeks ?? 0,
    totalPRs: totalPRs ?? 0,
    totalVolume,
    totalFoodLogs: totalFoodLogs ?? 0,
    hasWater: (waterCount ?? 0) > 0,
    hasPhoto: (photoCount ?? 0) > 0,
    hasOwnRoutine: (routineCount ?? 0) > 0,
  });

  const alreadyUnlocked = new Set((existing ?? []).map((e: any) => e.achievement_key));
  const newKeys = unlockedKeys.filter((k) => !alreadyUnlocked.has(k));

  if (newKeys.length > 0) {
    await supabase.from("user_achievements").insert(newKeys.map((key) => ({ client_id: uid, achievement_key: key, seen: false })));
  }

  const newAchievements = ACHIEVEMENTS.filter((a) => newKeys.includes(a.key));
  return NextResponse.json({ newAchievements });
}
