"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { usePalette, type Palette } from "@/lib/theme";
import { muscleLabel } from "@/lib/muscleLabels";
import { ChevronLeft, Dumbbell, Flame, TrendingUp } from "lucide-react";

type MuscleStat = { key: string; volume: number; sets: number; exercises: Set<string> };
type ExerciseStat = { name: string; volume: number; sets: number };

export default function TrainingStatsPage() {
  const palette = usePalette();
  const router = useRouter();
  const supabase = createClient();

  const [loading, setLoading] = useState(true);
  const [muscleStats, setMuscleStats] = useState<{ key: string; volume: number; sets: number; exerciseCount: number }[]>([]);
  const [topExercises, setTopExercises] = useState<ExerciseStat[]>([]);
  const [totals, setTotals] = useState({ workouts: 0, volume: 0, sets: 0 });

  useEffect(() => {
    (async () => {
      const { data: auth } = await supabase.auth.getUser();
      const uid = auth.user!.id;

      const [{ data: setRows }, { count: workoutCount }] = await Promise.all([
        supabase
          .from("set_logs")
          .select("weight, reps, set_type, exercise_id, workout_logs!inner(client_id), exercises(name, muscle_group, parent:exercises!counts_toward_exercise_id(name))")
          .eq("workout_logs.client_id", uid),
        supabase.from("workout_logs").select("id", { count: "exact", head: true }).eq("client_id", uid),
      ]);

      const byMuscle: Record<string, MuscleStat> = {};
      const byExercise: Record<string, ExerciseStat> = {};
      let totalVolume = 0;
      let totalSets = 0;

      (setRows ?? []).forEach((s: any) => {
        if (s.set_type === "warmup") return;
        const vol = s.weight && s.reps ? s.weight * s.reps : 0;
        totalVolume += vol;
        totalSets += 1;

        const muscle = s.exercises?.muscle_group || "otros";
        if (!byMuscle[muscle]) byMuscle[muscle] = { key: muscle, volume: 0, sets: 0, exercises: new Set() };
        byMuscle[muscle].volume += vol;
        byMuscle[muscle].sets += 1;
        if (s.exercise_id) byMuscle[muscle].exercises.add(s.exercise_id);

        const exName = s.exercises?.parent?.name || s.exercises?.name || "Ejercicio";
        if (!byExercise[exName]) byExercise[exName] = { name: exName, volume: 0, sets: 0 };
        byExercise[exName].volume += vol;
        byExercise[exName].sets += 1;
      });

      setMuscleStats(
        Object.values(byMuscle)
          .map((m) => ({ key: m.key, volume: m.volume, sets: m.sets, exerciseCount: m.exercises.size }))
          .sort((a, b) => b.volume - a.volume)
      );
      setTopExercises(Object.values(byExercise).sort((a, b) => b.volume - a.volume).slice(0, 5));
      setTotals({ workouts: workoutCount ?? 0, volume: totalVolume, sets: totalSets });
      setLoading(false);
    })();
  }, []);

  const maxMuscleVolume = Math.max(1, ...muscleStats.map((m) => m.volume));
  const maxExerciseVolume = Math.max(1, ...topExercises.map((e) => e.volume));

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 18 }}>
        <button onClick={() => router.push("/app/profile")} style={{ background: "none", border: "none", color: palette.inkDim, cursor: "pointer", display: "flex" }}>
          <ChevronLeft size={20} />
        </button>
        <h1 style={{ fontSize: 20, fontWeight: 700 }}>Estadísticas de entrenamiento</h1>
      </div>

      {loading ? (
        <p style={{ color: palette.inkDim, fontSize: 13, textAlign: "center", padding: 30 }}>Cargando...</p>
      ) : totals.sets === 0 ? (
        <p style={{ color: palette.inkDim, fontSize: 13, textAlign: "center", padding: 30 }}>
          Todavía no hay series registradas — entrena para ver tus estadísticas acá.
        </p>
      ) : (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8, marginBottom: 24 }}>
            <MiniStat icon={<Dumbbell size={14} />} value={totals.workouts} label="Entrenos" palette={palette} />
            <MiniStat icon={<Flame size={14} />} value={`${Math.round(totals.volume / 1000)}t`} label="Volumen" palette={palette} />
            <MiniStat icon={<TrendingUp size={14} />} value={totals.sets} label="Series" palette={palette} />
          </div>

          <div style={{ fontSize: 12.5, fontWeight: 700, color: palette.accent, textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 12 }}>
            Volumen por grupo muscular
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 26 }}>
            {muscleStats.map((m) => (
              <div key={m.key}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5, marginBottom: 4 }}>
                  <span style={{ fontWeight: 600 }}>{muscleLabel(m.key)}</span>
                  <span style={{ color: palette.inkDim }}>{Math.round(m.volume).toLocaleString("es-CO")} kg · {m.sets} series</span>
                </div>
                <div style={{ height: 7, borderRadius: 4, background: palette.divider, overflow: "hidden" }}>
                  <div style={{
                    height: "100%", width: `${(m.volume / maxMuscleVolume) * 100}%`, borderRadius: 4,
                    background: `linear-gradient(90deg, ${palette.accentDeep}, ${palette.accent})`,
                    transition: "width .6s cubic-bezier(.16,.8,.24,1)",
                  }} />
                </div>
              </div>
            ))}
          </div>

          <div style={{ fontSize: 12.5, fontWeight: 700, color: palette.accent, textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 12 }}>
            Ejercicios con más volumen
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {topExercises.map((e, i) => (
              <div key={e.name} style={{ ...palette.glassPanel, padding: "10px 14px", display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{
                  width: 24, height: 24, borderRadius: 7, background: `${palette.accent}22`, color: palette.accent,
                  display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, flexShrink: 0,
                }}>{i + 1}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12.5, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{e.name}</div>
                  <div style={{ height: 4, borderRadius: 3, background: palette.divider, overflow: "hidden", marginTop: 4 }}>
                    <div style={{ height: "100%", width: `${(e.volume / maxExerciseVolume) * 100}%`, borderRadius: 3, background: palette.accent }} />
                  </div>
                </div>
                <span style={{ fontSize: 11.5, color: palette.inkDim, flexShrink: 0 }}>{Math.round(e.volume).toLocaleString("es-CO")} kg</span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function MiniStat({ icon, value, label, palette }: { icon: React.ReactNode; value: string | number; label: string; palette: Palette }) {
  return (
    <div style={{ ...palette.glassPanel, padding: 12, textAlign: "center" }}>
      <div style={{ color: palette.accent, marginBottom: 4, display: "flex", justifyContent: "center" }}>{icon}</div>
      <div style={{ fontSize: 16, fontWeight: 700 }}>{value}</div>
      <div style={{ fontSize: 9, color: palette.inkDim, marginTop: 1 }}>{label}</div>
    </div>
  );
}
