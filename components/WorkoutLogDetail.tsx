"use client";

import { usePalette } from "@/lib/theme";
import { muscleLabel } from "@/lib/muscleLabels";
import Link from "next/link";
import { ChevronLeft, Clock, Weight, Layers } from "lucide-react";
import WorkoutLogMenu from "@/components/WorkoutLogMenu";

const MUSCLE_COLORS = ["#B9C2CE", "#C77DFF", "#7DD8C6", "#F5A97F", "#7DC4E8", "#F2B8D4"];

type SetRow = { weight: number | null; reps: number | null; time_sec: number | null; distance_m: number | null; set_type: string };
type ExerciseGroup = { id: string; name: string; measurement_type: string; sets: SetRow[] };
type MuscleDistItem = { muscle: string; pct: number };

export default function WorkoutLogDetail({
  workoutLogId, routineName, date, durationSec, totalVolume, totalSets, muscleDistribution, exercises, exercisesForMenu,
}: {
  workoutLogId: string; routineName: string; date: string; durationSec: number; totalVolume: number; totalSets: number;
  muscleDistribution: MuscleDistItem[]; exercises: ExerciseGroup[];
  exercisesForMenu: { exercise_id: string; name: string; measurement_type: string; sets: SetRow[] }[];
}) {
  const palette = usePalette();
  const sectionLabel: React.CSSProperties = {
    fontSize: 12.5, fontWeight: 700, color: palette.accent, textTransform: "uppercase",
    letterSpacing: "0.04em", marginBottom: 10,
  };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
        <Link href="/app/profile" style={{ color: palette.inkDim, display: "flex" }}><ChevronLeft size={22} /></Link>
        <div style={{ position: "relative" }}>
          <WorkoutLogMenu workoutLogId={workoutLogId} routineName={routineName} exercises={exercisesForMenu} />
        </div>
      </div>

      <h1 style={{ fontSize: 21, fontWeight: 800, marginBottom: 4 }}>{routineName}</h1>
      <p style={{ fontSize: 12.5, color: palette.inkDim, marginBottom: 20 }}>
        {new Date(date).toLocaleDateString("es-CO", { weekday: "long", day: "numeric", month: "long", year: "numeric" })} ·{" "}
        {new Date(date).toLocaleTimeString("es-CO", { hour: "numeric", minute: "2-digit" })}
      </p>

      <div style={{ display: "flex", justifyContent: "space-around", padding: "14px 0", borderTop: `1px solid ${palette.panelBorder}`, borderBottom: `1px solid ${palette.panelBorder}`, marginBottom: 22 }}>
        <StatItem icon={<Clock size={15} />} value={`${Math.round(durationSec / 60)} min`} label="Duración" />
        <StatItem icon={<Weight size={15} />} value={`${Math.round(totalVolume).toLocaleString()} kg`} label="Volumen" />
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
                <div style={{ height: 6, borderRadius: 4, background: palette.inputBg, overflow: "hidden" }}>
                  <div style={{ height: "100%", width: `${m.pct}%`, background: MUSCLE_COLORS[i % MUSCLE_COLORS.length], borderRadius: 4, transition: "width .5s ease" }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div style={sectionLabel}>Ejercicios</div>
      <div style={{ display: "flex", flexDirection: "column" }}>
        {exercises.map((ex, exIdx) => (
          <div key={ex.id} style={{ paddingTop: 14, paddingBottom: 14, borderTop: exIdx > 0 ? `1px solid ${palette.panelBorder}` : "none" }}>
            <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 8 }}>{ex.name}</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              {ex.sets.map((s, i) => (
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
        ))}
      </div>
    </div>
  );
}

function StatItem({ icon, value, label }: { icon: React.ReactNode; value: string; label: string }) {
  const palette = usePalette();
  return (
    <div style={{ textAlign: "center" }}>
      <div style={{ color: palette.accent, marginBottom: 4, display: "flex", justifyContent: "center" }}>{icon}</div>
      <div style={{ fontSize: 15, fontWeight: 700 }}>{value}</div>
      <div style={{ fontSize: 9.5, color: palette.inkDim, textTransform: "uppercase" }}>{label}</div>
    </div>
  );
}
