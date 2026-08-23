import { createClient } from "@/lib/supabase/server";
import WorkoutLogDetail from "@/components/WorkoutLogDetail";

export default async function WorkoutLogDetailPage({ params }: { params: { id: string } }) {
  const supabase = await createClient();

  const { data: log } = await supabase
    .from("workout_logs")
    .select("id, date, duration_sec, total_volume, routine_id, routines(name)")
    .eq("id", params.id)
    .single();

  if (!log) {
    return (
      <div style={{ textAlign: "center", padding: 40, color: "#8A93A0" }}>
        No encontramos este entrenamiento.
      </div>
    );
  }

  const { data: setLogs } = await supabase
    .from("set_logs")
    .select("id, weight, reps, time_sec, distance_m, set_type, exercise_id, exercises(name, muscle_group, measurement_type)")
    .eq("workout_log_id", params.id)
    .order("id", { ascending: true });

  const routineName = (log as any).routines?.name || "Entrenamiento";

  const exerciseOrder: string[] = [];
  const exerciseMap: Record<string, { name: string; measurement_type: string; muscle_group: string | null; sets: any[] }> = {};
  (setLogs ?? []).forEach((s: any) => {
    const exId = s.exercise_id;
    if (!exerciseMap[exId]) {
      exerciseMap[exId] = { name: s.exercises?.name || "Ejercicio", measurement_type: s.exercises?.measurement_type || "reps_weight", muscle_group: s.exercises?.muscle_group ?? null, sets: [] };
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
    sets: exerciseMap[exId].sets.map((s: any) => ({ weight: s.weight, reps: s.reps, time_sec: s.time_sec, distance_m: s.distance_m, set_type: s.set_type })),
  }));

  return (
    <WorkoutLogDetail
      workoutLogId={log.id}
      routineName={routineName}
      date={log.date}
      durationSec={log.duration_sec ?? 0}
      totalVolume={log.total_volume ?? 0}
      totalSets={totalSets}
      muscleDistribution={muscleDistribution}
      exercises={exercises}
      exercisesForMenu={exercises.map((ex) => ({ exercise_id: ex.id, name: ex.name, measurement_type: ex.measurement_type, sets: ex.sets }))}
    />
  );
}
