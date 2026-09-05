/**
 * Da forma a un entrenamiento guardado para la pantalla de detalle.
 *
 * Lo usan dos sitios con permisos distintos: el cliente viendo lo suyo (con su propio
 * cliente de Supabase y su RLS) y el entrenador viendo lo de un cliente (con la service
 * role, después de comprobar que ese cliente es suyo). Por eso recibe el cliente de base
 * de datos en vez de crearlo: la decisión de permisos es de quien llama.
 */
export async function buildWorkoutLogView(db: any, logId: string) {
  const { data: log } = await db
    .from("workout_logs")
    .select("id, client_id, date, duration_sec, total_volume, routine_id, notes, photo_url, routines(name)")
    .eq("id", logId)
    .maybeSingle();

  if (!log) return null;

  const { data: setLogs } = await db
    .from("set_logs")
    .select("id, weight, reps, time_sec, distance_m, set_type, exercise_id, exercises(name, muscle_group, measurement_type)")
    .eq("workout_log_id", logId)
    .order("id", { ascending: true });

  const exerciseOrder: string[] = [];
  const exerciseMap: Record<string, { name: string; measurement_type: string; muscle_group: string | null; sets: any[] }> = {};

  (setLogs ?? []).forEach((s: any) => {
    const exId = s.exercise_id;
    if (!exerciseMap[exId]) {
      exerciseMap[exId] = {
        name: s.exercises?.name || "Ejercicio",
        measurement_type: s.exercises?.measurement_type || "reps_weight",
        muscle_group: s.exercises?.muscle_group ?? null,
        sets: [],
      };
      exerciseOrder.push(exId);
    }
    exerciseMap[exId].sets.push(s);
  });

  const totalSets = (setLogs ?? []).filter((s: any) => s.set_type !== "warmup").length;

  const muscleCounts: Record<string, number> = {};
  (setLogs ?? []).forEach((s: any) => {
    if (s.set_type === "warmup") return;
    const mg = s.exercises?.muscle_group;
    if (mg) muscleCounts[mg] = (muscleCounts[mg] ?? 0) + 1;
  });

  const muscleDistribution = Object.entries(muscleCounts)
    .map(([mg, count]) => ({ muscle: mg, pct: totalSets > 0 ? Math.round((count / totalSets) * 100) : 0 }))
    .sort((a, b) => b.pct - a.pct)
    .slice(0, 6);

  const exercises = exerciseOrder.map((exId) => ({
    id: exId,
    name: exerciseMap[exId].name,
    measurement_type: exerciseMap[exId].measurement_type,
    sets: exerciseMap[exId].sets.map((s: any) => ({
      weight: s.weight, reps: s.reps, time_sec: s.time_sec, distance_m: s.distance_m, set_type: s.set_type,
    })),
  }));

  return {
    id: log.id as string,
    clientId: log.client_id as string,
    routineName: (log as any).routines?.name || "Entreno libre",
    date: log.date as string,
    durationSec: (log.duration_sec ?? 0) as number,
    notes: (log.notes ?? null) as string | null,
    photoUrl: (log.photo_url ?? null) as string | null,
    totalVolume: (log.total_volume ?? 0) as number,
    totalSets,
    muscleDistribution,
    exercises,
  };
}
