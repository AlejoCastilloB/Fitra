"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { usePalette, type Palette } from "@/lib/theme";
import { useCurrentUser } from "@/lib/useCurrentUser";
import Modal from "@/components/Modal";
import { Dumbbell, Utensils, ChevronLeft, ChevronRight } from "lucide-react";

const DOW_LABELS = ["L", "M", "M", "J", "V", "S", "D"];
const DAILY_KCAL_GOAL = 2200;

type DayData = {
  date: string;
  trained: boolean;
  workout?: { name: string; duration_sec: number; total_volume: number; time: string };
  meals: { id: string; food_name: string; kcal: number }[];
  kcalTotal: number;
};

function getMonday(offsetWeeks: number) {
  const d = new Date();
  const day = d.getDay();
  const diffToMonday = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diffToMonday + offsetWeeks * 7);
  d.setHours(0, 0, 0, 0);
  return d;
}

export default function DayStrip() {
  const palette = usePalette();
  const supabase = createClient();
  const uid = useCurrentUser();
  const [weekOffset, setWeekOffset] = useState(0);
  const [days, setDays] = useState<DayData[]>([]);
  const [selectedDay, setSelectedDay] = useState<DayData | null>(null);
  const touchStartX = useRef<number | null>(null);

  useEffect(() => {
    if (!uid) return;
    (async () => {
      const monday = getMonday(weekOffset);
      const sunday = new Date(monday);
      sunday.setDate(sunday.getDate() + 7);

      const [{ data: workouts }, { data: meals }] = await Promise.all([
        supabase.from("workout_logs")
          .select("id, date, duration_sec, total_volume, routines(name)")
          .eq("client_id", uid)
          .gte("date", monday.toISOString())
          .lt("date", sunday.toISOString()),
        supabase.from("nutrition_logs")
          .select("id, date, food_name, kcal")
          .eq("client_id", uid)
          .gte("date", monday.toISOString())
          .lt("date", sunday.toISOString()),
      ]);

      const built: DayData[] = Array.from({ length: 7 }).map((_, i) => {
        const d = new Date(monday);
        d.setDate(d.getDate() + i);
        const dateStr = d.toISOString().slice(0, 10);

        const dayWorkout: any = (workouts ?? []).find((w: any) => w.date?.slice(0, 10) === dateStr);
        const dayMeals = (meals ?? []).filter((m: any) => m.date?.slice(0, 10) === dateStr);
        const kcalTotal = dayMeals.reduce((s: number, m: any) => s + (m.kcal ?? 0), 0);

        return {
          date: dateStr,
          trained: !!dayWorkout,
          workout: dayWorkout ? {
            name: dayWorkout.routines?.name || "Entrenamiento",
            duration_sec: dayWorkout.duration_sec ?? 0,
            total_volume: dayWorkout.total_volume ?? 0,
            time: dayWorkout.date,
          } : undefined,
          meals: dayMeals.map((m: any) => ({ id: m.id, food_name: m.food_name || "Comida", kcal: m.kcal ?? 0 })),
          kcalTotal,
        };
      });

      setDays(built);
    })();
  }, [weekOffset, uid]);

  function handleTouchStart(e: React.TouchEvent) {
    touchStartX.current = e.touches[0].clientX;
  }
  function handleTouchEnd(e: React.TouchEvent) {
    if (touchStartX.current === null) return;
    const delta = e.changedTouches[0].clientX - touchStartX.current;
    if (delta > 50) setWeekOffset((w) => Math.max(w - 1, -8));
    else if (delta < -50) setWeekOffset((w) => Math.min(w + 1, 0));
    touchStartX.current = null;
  }

  const todayStr = new Date().toISOString().slice(0, 10);

  return (
    <div style={{ marginBottom: 22 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
        <button onClick={() => setWeekOffset((w) => Math.max(w - 1, -8))} style={arrowBtn(palette)}><ChevronLeft size={15} /></button>
        <span style={{ fontSize: 11, color: palette.inkDim, fontWeight: 600 }}>
          {weekOffset === 0 ? "Esta semana" : `${Math.abs(weekOffset)} semana${Math.abs(weekOffset) > 1 ? "s" : ""} atrás`}
        </span>
        <button onClick={() => setWeekOffset((w) => Math.min(w + 1, 0))} disabled={weekOffset === 0} style={{ ...arrowBtn(palette), opacity: weekOffset === 0 ? 0.3 : 1 }}>
          <ChevronRight size={15} />
        </button>
      </div>

      <div onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd} style={{ display: "flex", justifyContent: "space-between" }}>
        {days.map((day, i) => {
          const isToday = day.date === todayStr;
          const hasActivity = day.trained || day.meals.length > 0;
          return (
            <button
              key={day.date}
              onClick={() => hasActivity && setSelectedDay(day)}
              style={{
                display: "flex", flexDirection: "column", alignItems: "center", gap: 6,
                background: "none", border: "none", cursor: hasActivity ? "pointer" : "default", padding: 0,
              }}
            >
              <span style={{ fontSize: 10.5, color: palette.inkDim, fontWeight: 600 }}>{DOW_LABELS[i]}</span>
              <div style={{ position: "relative" }}>
                {isToday && (
                  <div style={{
                    position: "absolute", top: "100%", left: "50%", transform: "translateX(-50%)",
                    width: 30, height: 14, borderRadius: "50%", background: palette.accent,
                    filter: "blur(10px)", opacity: 0.45, marginTop: 2, pointerEvents: "none",
                  }} />
                )}
                <span style={{
                  width: 32, height: 32, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 13, fontWeight: 700, position: "relative",
                  background: isToday ? palette.accent : day.trained ? `${palette.accent}22` : "transparent",
                  color: isToday ? palette.bg : palette.ink,
                  border: isToday ? "none" : `1px solid ${day.trained ? palette.accent : palette.panelBorder}`,
                }}>
                  {parseInt(day.date.slice(-2), 10)}
                </span>
              </div>
            </button>
          );
        })}
      </div>

      {selectedDay && (
        <Modal
          title={new Date(selectedDay.date + "T12:00:00").toLocaleDateString("es-CO", { weekday: "long", day: "numeric", month: "long" })}
          onClose={() => setSelectedDay(null)}
        >
          {selectedDay.workout && (
            <div style={{ marginBottom: 16 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                <Dumbbell size={15} color={palette.accent} />
                <span style={{ fontSize: 13, fontWeight: 700 }}>Entrenamiento</span>
              </div>
              <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 2 }}>{selectedDay.workout.name}</div>
              <div style={{ fontSize: 12, color: palette.inkDim }}>
                {new Date(selectedDay.workout.time).toLocaleTimeString("es-CO", { hour: "numeric", minute: "2-digit" })} ·{" "}
                {Math.round(selectedDay.workout.duration_sec / 60)} min · {Math.round(selectedDay.workout.total_volume).toLocaleString("es-CO")} kg
              </div>
            </div>
          )}

          {selectedDay.meals.length > 0 && (
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                <Utensils size={15} color={palette.accent} />
                <span style={{ fontSize: 13, fontWeight: 700 }}>Comidas</span>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 10 }}>
                {selectedDay.meals.map((m) => (
                  <div key={m.id} style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5 }}>
                    <span>{m.food_name}</span>
                    <span style={{ color: palette.inkDim }}>{Math.round(m.kcal)} kcal</span>
                  </div>
                ))}
              </div>
              <div style={{ borderTop: `1px solid ${palette.panelBorder}`, paddingTop: 8, display: "flex", justifyContent: "space-between", fontSize: 12.5, fontWeight: 600 }}>
                <span>Total: {Math.round(selectedDay.kcalTotal)} kcal</span>
                <span style={{ color: palette.inkDim }}>
                  {selectedDay.kcalTotal < DAILY_KCAL_GOAL
                    ? `Faltaron ${Math.round(DAILY_KCAL_GOAL - selectedDay.kcalTotal)} kcal`
                    : `${Math.round(selectedDay.kcalTotal - DAILY_KCAL_GOAL)} kcal de más`}
                </span>
              </div>
            </div>
          )}

          {!selectedDay.workout && selectedDay.meals.length === 0 && (
            <p style={{ fontSize: 13, color: palette.inkDim, textAlign: "center", padding: 12 }}>Sin registros ese día.</p>
          )}
        </Modal>
      )}
    </div>
  );
}

function arrowBtn(palette: Palette): React.CSSProperties {
  return {
    width: 26, height: 26, borderRadius: 8, border: "none", background: "none",
    color: palette.inkDim, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
  };
}
