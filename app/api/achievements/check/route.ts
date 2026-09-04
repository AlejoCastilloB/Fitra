import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { ACHIEVEMENTS, computeUnlockedKeys, type AchievementStats } from "@/lib/achievements";
import { computeStreakFromDates } from "@/lib/streak";

/** Fecha, hora y día de la semana en la zona horaria del usuario, no en la del servidor. */
function localParts(timeZone: string, date: Date) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone, hour12: false, weekday: "short",
    year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit",
  }).formatToParts(date);
  const get = (type: string) => parts.find((p) => p.type === type)!.value;
  return {
    dateKey: `${get("year")}-${get("month")}-${get("day")}`,
    hour: get("hour") === "24" ? 0 : +get("hour"),
    weekday: get("weekday"), // "Mon" … "Sun"
  };
}

/** Lunes de la semana a la que pertenece una fecha "YYYY-MM-DD", como clave agrupable. */
function weekKey(dateKey: string): string {
  const d = new Date(`${dateKey}T12:00:00Z`);
  const dow = d.getUTCDay(); // 0 = domingo
  d.setUTCDate(d.getUTCDate() - (dow === 0 ? 6 : dow - 1));
  return d.toISOString().slice(0, 10);
}

export async function POST() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "no autenticado" }, { status: 401 });
  const uid = user.id;

  const [
    { count: totalPRs },
    { data: workoutRows },
    { count: totalFoodLogs },
    { count: waterCount },
    { count: photoCount },
    { count: routineCount },
    { data: setRows },
    { data: userRow },
    { data: existing },
  ] = await Promise.all([
    supabase.from("personal_records").select("id", { count: "exact", head: true }).eq("client_id", uid),
    supabase.from("workout_logs").select("id, total_volume, date, duration_sec").eq("client_id", uid),
    supabase.from("nutrition_logs").select("id", { count: "exact", head: true }).eq("client_id", uid),
    supabase.from("water_logs").select("client_id", { count: "exact", head: true }).eq("client_id", uid),
    supabase.from("progress_photos").select("id", { count: "exact", head: true }).eq("client_id", uid),
    supabase.from("routines").select("id", { count: "exact", head: true }).eq("created_by", uid).eq("source", "client"),
    supabase.from("set_logs").select("exercise_id, workout_logs!inner(client_id)").eq("workout_logs.client_id", uid),
    supabase.from("users").select("timezone").eq("id", uid).single(),
    supabase.from("user_achievements").select("achievement_key").eq("client_id", uid),
  ]);

  const workouts = workoutRows ?? [];
  const timezone = userRow?.timezone || "UTC";

  let totalVolume = 0;
  let bestSessionVolume = 0;
  let totalTrainingSec = 0;
  let longestSessionSec = 0;
  let earlyWorkouts = 0;
  let nightWorkouts = 0;
  let weekendWorkouts = 0;
  const trainingDays = new Set<string>();
  const perWeek: Record<string, number> = {};

  for (const w of workouts) {
    const volume = w.total_volume ?? 0;
    totalVolume += volume;
    if (volume > bestSessionVolume) bestSessionVolume = volume;

    const duration = w.duration_sec ?? 0;
    totalTrainingSec += duration;
    if (duration > longestSessionSec) longestSessionSec = duration;

    if (!w.date) continue;
    let local;
    try {
      local = localParts(timezone, new Date(w.date));
    } catch {
      continue;
    }
    trainingDays.add(local.dateKey);
    perWeek[weekKey(local.dateKey)] = (perWeek[weekKey(local.dateKey)] ?? 0) + 1;
    if (local.hour < 7) earlyWorkouts++;
    if (local.hour >= 21) nightWorkouts++;
    if (local.weekday === "Sat" || local.weekday === "Sun") weekendWorkouts++;
  }

  const sets = setRows ?? [];

  const stats: AchievementStats = {
    totalWorkouts: workouts.length,
    currentStreak: computeStreakFromDates(workouts.map((r: any) => r.date)),
    totalPRs: totalPRs ?? 0,
    totalVolume,
    totalSets: sets.length,
    bestSessionVolume,
    totalTrainingSec,
    longestSessionSec,
    earlyWorkouts,
    nightWorkouts,
    weekendWorkouts,
    bestWorkoutsInAWeek: Math.max(0, ...Object.values(perWeek)),
    distinctTrainingDays: trainingDays.size,
    distinctExercises: new Set(sets.map((s: any) => s.exercise_id)).size,
    totalFoodLogs: totalFoodLogs ?? 0,
    waterLogs: waterCount ?? 0,
    photoCount: photoCount ?? 0,
    ownRoutines: routineCount ?? 0,
    emailConfirmed: !!user.email_confirmed_at,
  };

  const unlockedKeys = computeUnlockedKeys(stats);

  const alreadyUnlocked = new Set((existing ?? []).map((e: any) => e.achievement_key));
  const newKeys = unlockedKeys.filter((k) => !alreadyUnlocked.has(k));

  if (newKeys.length > 0) {
    await supabase.from("user_achievements").insert(newKeys.map((key) => ({ client_id: uid, achievement_key: key, seen: false })));
  }

  const newAchievements = ACHIEVEMENTS.filter((a) => newKeys.includes(a.key));
  return NextResponse.json({ newAchievements });
}
