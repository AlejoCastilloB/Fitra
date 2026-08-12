"use client";

import { useState } from "react";
import { palette } from "@/lib/theme";
import { Flame } from "lucide-react";

const DOW_LABELS = ["D", "L", "M", "M", "J", "V", "S"];

export type DaySummary = { date: string; trained: boolean; kcal: number };

export default function DayStrip({ days }: { days: DaySummary[] }) {
  const [selected, setSelected] = useState(days.length - 1);

  const active = days[selected];
  const isToday = selected === days.length - 1;
  const d = new Date(active.date + "T12:00:00");

  return (
    <div style={{ marginBottom: 22 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
        {days.map((day, i) => {
          const dt = new Date(day.date + "T12:00:00");
          const isSelected = i === selected;
          return (
            <button
              key={day.date}
              onClick={() => setSelected(i)}
              style={{
                display: "flex", flexDirection: "column", alignItems: "center", gap: 6,
                background: "none", border: "none", cursor: "pointer", padding: 0,
              }}
            >
              <span style={{ fontSize: 10.5, color: palette.inkDim, fontWeight: 600 }}>{DOW_LABELS[dt.getDay()]}</span>
              <span style={{
                width: 32, height: 32, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 13, fontWeight: 700,
                background: isSelected ? palette.accent : day.trained ? `${palette.accent}22` : "transparent",
                color: isSelected ? "#0A0C10" : palette.ink,
                border: isSelected ? "none" : `1px solid ${day.trained ? palette.accent : palette.panelBorder}`,
                transition: "all .2s ease",
              }}>
                {dt.getDate()}
              </span>
            </button>
          );
        })}
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 12.5, color: palette.inkDim, padding: "2px 2px" }}>
        <span style={{ fontWeight: 600, color: palette.ink }}>
          {isToday ? "Hoy" : d.toLocaleDateString("es-CO", { weekday: "long", day: "numeric", month: "short" })}
        </span>
        <span>·</span>
        <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
          <Flame size={12} color={active.trained ? palette.accent : palette.inkDim} />
          {active.trained ? "Entrenó" : "No entrenó"}
        </span>
        {active.kcal > 0 && <><span>·</span><span>{Math.round(active.kcal)} kcal</span></>}
      </div>
    </div>
  );
}
