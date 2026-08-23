"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { usePalette } from "@/lib/theme";
import { muscleLabel } from "@/lib/muscleLabels";
import { useCurrentUser } from "@/lib/useCurrentUser";
import { Dumbbell } from "lucide-react";

const DAILY_KCAL_GOAL = 2200;

function DumbbellRing({ done }: { done: boolean }) {
  const palette = usePalette();
  const size = 46;
  const dotCount = 16;
  const radius = size / 2 - 3;
  const circumference = 2 * Math.PI * radius;
  const dashLength = circumference / dotCount / 2;

  return (
    <div style={{ position: "relative", width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size} style={{ position: "absolute", inset: 0 }}>
        <circle
          cx={size / 2} cy={size / 2} r={radius} fill="none"
          stroke={done ? palette.accent : palette.panelBorder}
          strokeWidth={2.5} strokeDasharray={`${dashLength} ${dashLength}`} strokeLinecap="round"
        />
      </svg>
      <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <Dumbbell size={18} color={done ? palette.accent : palette.inkDim} />
      </div>
    </div>
  );
}

export default function TodayCards({ todaysRoutine }: { todaysRoutine: { id: string; name: string } | null }) {
  const palette = usePalette();
  const supabase = createClient();
  const uid = useCurrentUser();
  const [kcalConsumed, setKcalConsumed] = useState(0);
  const [mode, setMode] = useState<"remaining" | "consumed">("remaining");
  const [done, setDone] = useState(false);
  const [totalSets, setTotalSets] = useState(0);
  const [predictedVolume, setPredictedVolume] = useState(0);
  const [predictedMinutes, setPredictedMinutes] = useState(0);
  const [topMuscle, setTopMuscle] = useState<string | null>(null);

  useEffect(() => {
    if (!uid) return;
    (async () => {
      const today = new Date().toISOString().slice(0, 10);

      const { data: logs } = await supabase.from("nutrition_logs").select("kcal").eq("client_id", uid).gte("date", `${today}T00:00:00`);
      setKcalConsumed((logs ?? []).reduce((s, l) => s + (l.kcal ?? 0), 0));

      if (todaysRoutine) {
        const { data: workoutToday } = await supabase.from("workout_logs").select("id").eq("client_id", uid).eq("routine_id", todaysRoutine.id).gte("date", `${today}T00:00:00`).limit(1);
        setDone((workoutToday ?? []).length > 0);

        const { data: exRows } = await supabase.from("routine_exercises").select("target_sets, exercises(muscle_group)").eq("routine_id", todaysRoutine.id);

        let sets = 0, volume = 0;
        const muscleCounts: Record<string, number> = {};
        (exRows ?? []).forEach((row: any) => {
          const ts = row.target_sets ?? [];
          sets += ts.length;
          ts.forEach((s: any) => { if (s.weight && s.reps) volume += s.weight * s.reps; });
          const mg = row.exercises?.muscle_group;
          if (mg) muscleCounts[mg] = (muscleCounts[mg] ?? 0) + 1;
        });
        setTotalSets(sets);
        setPredictedVolume(volume);
        setPredictedMinutes(Math.round(sets * 2.5));
        const top = Object.entries(muscleCounts).sort((a, b) => b[1] - a[1])[0];
        setTopMuscle(top ? top[0] : null);
      }
    })();
  }, [todaysRoutine?.id, uid]);

  const kcalRemaining = Math.max(0, DAILY_KCAL_GOAL - kcalConsumed);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 24 }}>
      <button
        onClick={() => setMode((m) => (m === "remaining" ? "consumed" : "remaining"))}
        style={{
          textAlign: "left", padding: 18, borderRadius: 18, border: `1px solid ${palette.panelBorder}`,
          background: "rgba(255,255,255,0.03)", backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)",
          cursor: "pointer", width: "100%",
        }}
      >
        <div style={{ fontSize: 11, color: palette.inkDim, marginBottom: 4 }}>
          {mode === "remaining" ? "Calorías restantes" : "Calorías consumidas"}
        </div>
        <div style={{ fontSize: 27, fontWeight: 800 }}>
          {mode === "remaining" ? kcalRemaining.toLocaleString() : kcalConsumed.toLocaleString()}
          <span style={{ fontSize: 13, fontWeight: 600, color: palette.inkDim }}> kcal</span>
        </div>
        <div style={{ fontSize: 10, color: palette.inkDim, marginTop: 2 }}>Toca para cambiar la vista</div>
      </button>

      <Link
        href={todaysRoutine ? `/app/workout/${todaysRoutine.id}` : "/app/routines"}
        style={{
          display: "flex", alignItems: "center", gap: 14, padding: 18, borderRadius: 18,
          border: `1px solid ${done ? palette.accent + "55" : palette.panelBorder}`,
          background: done ? `${palette.accent}12` : "rgba(255,255,255,0.03)",
          backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)", textDecoration: "none", color: palette.ink,
        }}
      >
        <DumbbellRing done={done} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14.5, fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {todaysRoutine ? todaysRoutine.name : "Sin rutina programada hoy"}
          </div>
          {todaysRoutine && (
            <div style={{ fontSize: 10.5, color: palette.inkDim, marginTop: 3 }}>
              {totalSets} series{topMuscle ? ` · ${muscleLabel(topMuscle)}` : ""} · {Math.round(predictedVolume).toLocaleString()} kg · ~{predictedMinutes} min
            </div>
          )}
        </div>
      </Link>
    </div>
  );
}
