import type { createClient } from "@/lib/supabase/client";
import type { LiveExercise } from "@/lib/workoutSession";

type SupabaseClient = ReturnType<typeof createClient>;

export type FinishedWorkout = {
  workoutLogId: string;
  routineName: string;
  volume: number;
  durationSec: number;
  prs: string[];
  breakdown: Record<string, number>;
  exercises: LiveExercise[];
};

/**
 * Persiste una sesión terminada: crea el workout_log, sus set_logs y los récords
 * nuevos, y devuelve el resumen que muestra la tarjeta final.
 * Lanza si algo falla, para que quien llama maneje el reintento offline.
 */
export async function finishWorkoutSession({
  supabase, uid, routineId, routineName, exercises, startedAt,
}: {
  supabase: SupabaseClient;
  uid: string;
  routineId: string | null;
  routineName: string;
  exercises: LiveExercise[];
  startedAt: number;
}): Promise<FinishedWorkout> {
  const durationSec = Math.round((Date.now() - startedAt) / 1000);

  const { data: workoutLog, error: workoutLogError } = await supabase.from("workout_logs").insert({
    client_id: uid, routine_id: routineId, duration_sec: durationSec, total_volume: 0,
  }).select().single();
  if (workoutLogError || !workoutLog) throw workoutLogError ?? new Error("no se pudo crear el registro del entreno");

  const results = await Promise.all(exercises.map(async (ex) => {
    let bestWeight = 0;
    let exVolume = 0;
    const doneSets = ex.sets.filter((s) => s.done);
    const localBreakdown: Record<string, number> = {};
    doneSets.forEach((s) => { localBreakdown[s.set_type] = (localBreakdown[s.set_type] ?? 0) + 1; });

    const rows = doneSets.map((s, i) => {
      if (s.weight && s.reps && s.set_type !== "warmup") {
        exVolume += s.weight * s.reps;
        if (s.weight > bestWeight) bestWeight = s.weight;
      }
      return {
        workout_log_id: workoutLog.id, exercise_id: ex.id, set_number: i + 1,
        weight: s.weight ?? null, reps: s.reps ?? null, time_sec: s.time_sec ?? null,
        distance_m: s.distance_m ?? null, set_type: s.set_type, rpe: s.rpe ?? null,
      };
    });

    if (rows.length > 0) {
      const { error: setLogsError } = await supabase.from("set_logs").insert(rows);
      if (setLogsError) throw setLogsError;
    }

    let prHit: string | null = null;
    if (bestWeight > 0) {
      const { data: prevPr } = await supabase.from("personal_records").select("value").eq("client_id", uid).eq("exercise_id", ex.id).eq("type", "1rm").order("value", { ascending: false }).limit(1).single();
      if (!prevPr || bestWeight > prevPr.value) {
        const { error: prError } = await supabase.from("personal_records").insert({ client_id: uid, exercise_id: ex.id, type: "1rm", value: bestWeight, workout_log_id: workoutLog.id });
        if (prError) throw prError;
        prHit = ex.name;
      }
    }

    return { volume: exVolume, breakdown: localBreakdown, prHit };
  }));

  let totalVolume = 0;
  const prsHit: string[] = [];
  const breakdown: Record<string, number> = { normal: 0, warmup: 0, dropset: 0, failure: 0 };
  for (const r of results) {
    totalVolume += r.volume;
    if (r.prHit) prsHit.push(r.prHit);
    for (const [k, v] of Object.entries(r.breakdown)) breakdown[k] = (breakdown[k] ?? 0) + v;
  }

  const { error: updateError } = await supabase.from("workout_logs").update({ total_volume: totalVolume }).eq("id", workoutLog.id);
  if (updateError) throw updateError;

  return {
    workoutLogId: workoutLog.id, routineName, volume: totalVolume, durationSec,
    prs: prsHit, breakdown, exercises,
  };
}
