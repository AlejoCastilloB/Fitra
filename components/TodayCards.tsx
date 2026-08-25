"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { usePalette, type Palette } from "@/lib/theme";
import { muscleLabel } from "@/lib/muscleLabels";
import { useCurrentUser } from "@/lib/useCurrentUser";
import { DAILY_GOALS } from "@/lib/nutritionGoals";
import { Dumbbell } from "lucide-react";

function MacroChip({ letter, value, color, palette }: { letter: string; value: number; color: string; palette: Palette }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
      <span style={{
        width: 18, height: 18, borderRadius: 6, background: `${color}2a`, color,
        fontSize: 9.5, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
      }}>{letter}</span>
      <span style={{ fontSize: 11.5, fontWeight: 700, color: palette.ink }}>{value}<span style={{ fontSize: 9, fontWeight: 600, color: palette.inkDim }}>g</span></span>
    </div>
  );
}

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
  const [proteinConsumed, setProteinConsumed] = useState(0);
  const [carbsConsumed, setCarbsConsumed] = useState(0);
  const [fatConsumed, setFatConsumed] = useState(0);
  const [mode, setMode] = useState<"remaining" | "consumed">("remaining");
  const [done, setDone] = useState(false);
  const [totalSets, setTotalSets] = useState(0);
  const [predictedVolume, setPredictedVolume] = useState(0);
  const [predictedMinutes, setPredictedMinutes] = useState(0);
  const [topMuscle, setTopMuscle] = useState<string | null>(null);
  const [goals, setGoals] = useState(DAILY_GOALS);

  useEffect(() => {
    if (!uid) return;
    (async () => {
      const today = new Date().toISOString().slice(0, 10);

      const { data: logs } = await supabase.from("nutrition_logs").select("kcal, protein, carbs, fat").eq("client_id", uid).gte("date", `${today}T00:00:00`);
      setKcalConsumed((logs ?? []).reduce((s, l) => s + (l.kcal ?? 0), 0));
      setProteinConsumed((logs ?? []).reduce((s, l) => s + (l.protein ?? 0), 0));
      setCarbsConsumed((logs ?? []).reduce((s, l) => s + (l.carbs ?? 0), 0));
      setFatConsumed((logs ?? []).reduce((s, l) => s + (l.fat ?? 0), 0));

      const { data: clientRow } = await supabase.from("clients").select("daily_kcal_goal, daily_protein_goal, daily_carbs_goal, daily_fat_goal").eq("user_id", uid).single();
      if (clientRow?.daily_kcal_goal) {
        setGoals({ kcal: clientRow.daily_kcal_goal, protein: clientRow.daily_protein_goal, carbs: clientRow.daily_carbs_goal, fat: clientRow.daily_fat_goal });
      }

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

  const kcalRemaining = Math.max(0, goals.kcal - kcalConsumed);
  const macroValue = (consumed: number, goal: number) => (mode === "remaining" ? Math.max(0, Math.round(goal - consumed)) : Math.round(consumed));

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 24 }}>
      <button
        onClick={() => setMode((m) => (m === "remaining" ? "consumed" : "remaining"))}
        style={{
          textAlign: "left", padding: 18, borderRadius: 18, border: `1px solid ${palette.panelBorder}`,
          background: palette.panel, backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)",
          cursor: "pointer", width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12,
        }}
      >
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 11, color: palette.inkDim, marginBottom: 4 }}>
            {mode === "remaining" ? "Calorías restantes" : "Calorías consumidas"}
          </div>
          <div style={{ fontSize: 27, fontWeight: 800 }}>
            {mode === "remaining" ? kcalRemaining.toLocaleString("es-CO") : kcalConsumed.toLocaleString("es-CO")}
            <span style={{ fontSize: 13, fontWeight: 600, color: palette.inkDim }}> kcal</span>
          </div>
          <div style={{ fontSize: 10, color: palette.inkDim, marginTop: 2 }}>Toca para cambiar la vista</div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 6, flexShrink: 0 }}>
          <MacroChip letter="P" value={macroValue(proteinConsumed, goals.protein)} color="#5EBBA0" palette={palette} />
          <MacroChip letter="C" value={macroValue(carbsConsumed, goals.carbs)} color="#D19A4A" palette={palette} />
          <MacroChip letter="G" value={macroValue(fatConsumed, goals.fat)} color="#C56767" palette={palette} />
        </div>
      </button>

      <Link
        href={todaysRoutine ? `/app/workout/${todaysRoutine.id}` : "/app/routines"}
        style={{
          display: "flex", alignItems: "center", gap: 14, padding: 18, borderRadius: 18,
          border: `1px solid ${done ? palette.accent + "55" : palette.panelBorder}`,
          background: done ? `${palette.accent}12` : palette.panel,
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
              {totalSets} series{topMuscle ? ` · ${muscleLabel(topMuscle)}` : ""} · {Math.round(predictedVolume).toLocaleString("es-CO")} kg · ~{predictedMinutes} min
            </div>
          )}
        </div>
      </Link>
    </div>
  );
}
