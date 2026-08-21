import { createClient } from "@/lib/supabase/server";
import { palette } from "@/lib/theme";
import { muscleLabel } from "@/lib/muscleLabels";
import Link from "next/link";
import { ChevronLeft, Clock, Weight, Layers } from "lucide-react";
import WorkoutLogMenu from "@/components/WorkoutLogMenu";

const MUSCLE_COLORS = ["#B9C2CE", "#C77DFF", "#7DD8C6", "#F5A97F", "#7DC4E8", "#F2B8D4"];

export default async function WorkoutLogDetailPage({ params }: { params: { id: string } }) {
  const supabase = await createClient();

  const { data: log } = await supabase
    .from("workout_logs")
    .select("id, date, duration_sec, total_volume, routine_id, routines(name)")
    .eq("id", params.id)
    .single();

  if (!log) {
    return (
      <div style={{ textAlign: "center", padding: 40, color: palette.inkDim }}>
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

  const exercisesForMenu = exerciseOrder.map((exId) => ({
    exercise_id: exId,
    name: exerciseMap[exId].name,
    measurement_type: exerciseMap[exId].measurement_type,
    sets: exerciseMap[exId].sets.map((s: any) => ({ weight: s.weight, reps: s.reps, time_sec: s.time_sec, distance_m: s.distance_m, set_type: s.set_type })),
  }));

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
        <Link href="/app/profile" style={{ color: palette.inkDim, display: "flex" }}><ChevronLeft size={22} /></Link>
        <div style={{ position: "relative" }}>
          <WorkoutLogMenu workoutLogId={log.id} routineName={routineName} exercises={exercisesForMenu} />
        </div>
      </div>

      <h1 style={{ fontSize: 21, fontWeight: 800, marginBottom: 4 }}>{routineName}</h1>
      <p style={{ fontSize: 12.5, color: palette.inkDim, marginBottom: 20 }}>
        {new Date(log.date).toLocaleDateString("es-CO", { weekday: "long", day: "numeric", month: "long", year: "numeric" })} ·{" "}
        {new Date(log.date).toLocaleTimeString("es-CO", { hour: "numeric", minute: "2-digit" })}
      </p>

      <div style={{ display: "flex", justifyContent: "space-around", padding: "14px 0", borderTop: `1px solid ${palette.panelBorder}`, borderBottom: `1px solid ${palette.panelBorder}`, marginBottom: 22 }}>
        <StatItem icon={<Clock size={15} />} value={`${Math.round((log.duration_sec ?? 0) / 60)} min`} label="Duración" />
        <StatItem icon={<Weight size={15} />} value={`${Math.round(log.total_volume ?? 0).toLocaleString()} kg`} label="Volumen" />
        <StatItem icon={<Layers size={15} />} value={`${totalSets}`} label="Series efectivas" />
      </div>

      {muscleDistribution.length > 0 && (
        <div style={{ marginBottom: 26 }}>
          <div style={sectionLabel}>Distribución muscular</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {muscleDistribution.map((m, i) => (
              <div key={m.muscle}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 4 }}>
                  <span>{muscleLabel(m.muscle)}</span>
                  <span style={{ color: palette.inkDim }}>{m.pct}%</span>
                </div>
                <div style={{ height: 6, borderRadius: 4, background: "rgba(255,255,255,0.08)", overflow: "hidden" }}>
                  <div style={{ height: "100%", width: `${m.pct}%`, background: MUSCLE_COLORS[i % MUSCLE_COLORS.length], borderRadius: 4 }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div style={sectionLabel}>Ejercicios</div>
      <div style={{ display: "flex", flexDirection: "column" }}>
        {exerciseOrder.map((exId, exIdx) => {
          const ex = exerciseMap[exId];
          return (
            <div key={exId} style={{ paddingTop: 14, paddingBottom: 14, borderTop: exIdx > 0 ? `1px solid ${palette.panelBorder}` : "none" }}>
              <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 8 }}>{ex.name}</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                {ex.sets.map((s: any, i: number) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12.5, color: palette.inkDim }}>
                    <span style={{
                      width: 18, height: 18, borderRadius: 5, fontSize: 9, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center",
                      color: s.set_type === "warmup" ? "#FBBF24" : s.set_type === "dropset" ? "#C77DFF" : s.set_type === "failure" ? "#F87171" : palette.accent,
                      background: s.set_type === "warmup" ? "#FBBF2422" : s.set_type === "dropset" ? "#C77DFF22" : s.set_type === "failure" ? "#F8717122" : `${palette.accent}22`,
                    }}>
                      {s.set_type === "warmup" ? "C" : s.set_type === "dropset" ? "D" : s.set_type === "failure" ? "F" : i + 1}
                    </span>
                    <span style={{ color: palette.ink }}>
                      {ex.measurement_type === "reps_weight" ? `${s.weight ?? "-"} kg × ${s.reps ?? "-"}` :
                       ex.measurement_type === "distance" ? `${s.distance_m ?? "-"} m` :
                       `${s.time_sec ?? "-"} s`}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function StatItem({ icon, value, label }: { icon: React.ReactNode; value: string; label: string }) {
  return (
    <div style={{ textAlign: "center" }}>
      <div style={{ color: palette.accent, marginBottom: 4, display: "flex", justifyContent: "center" }}>{icon}</div>
      <div style={{ fontSize: 15, fontWeight: 700 }}>{value}</div>
      <div style={{ fontSize: 9.5, color: palette.inkDim, textTransform: "uppercase" }}>{label}</div>
    </div>
  );
}

const sectionLabel: React.CSSProperties = {
  fontSize: 12.5, fontWeight: 700, color: palette.accent, textTransform: "uppercase",
  letterSpacing: "0.04em", marginBottom: 10,
};
