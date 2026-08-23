"use client";

import { usePalette } from "@/lib/theme";
import Link from "next/link";
import { Play } from "lucide-react";
import DayStrip from "@/components/DayStrip";
import TodayCards from "@/components/TodayCards";

type RoutineSummary = { id: string; name: string; source: string };

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Buenos días";
  if (hour < 19) return "Buenas tardes";
  return "Buenas noches";
}

export default function TodayScreen({
  displayName, todaysRoutine, otherRoutines,
}: {
  displayName: string | null;
  todaysRoutine: RoutineSummary | null;
  otherRoutines: RoutineSummary[];
}) {
  const palette = usePalette();
  const firstName = displayName?.trim().split(" ")[0] || null;

  return (
    <div>
      <div style={{ marginBottom: 18 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 2 }}>
          {getGreeting()}{firstName ? `, ${firstName}` : ""}
        </h1>
        <p style={{ color: palette.inkDim, fontSize: 14 }}>Listo para entrenar</p>
      </div>

      <DayStrip />

      <TodayCards todaysRoutine={todaysRoutine ? { id: todaysRoutine.id, name: todaysRoutine.name } : null} />

      <h2 style={{ fontSize: 12.5, fontWeight: 700, color: palette.accent, textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 10, marginTop: 4 }}>
        {todaysRoutine ? "Otras rutinas" : "Tus rutinas"}
      </h2>

      {otherRoutines.length === 0 && !todaysRoutine ? (
        <p style={{ fontSize: 13, color: palette.inkDim, padding: "12px 4px" }}>Todavía no tienes rutinas disponibles.</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column" }}>
          {otherRoutines.map((r, i) => (
            <RoutineRow key={r.id} routine={r} isLast={i === otherRoutines.length - 1} />
          ))}
        </div>
      )}
    </div>
  );
}

function RoutineRow({ routine, isLast }: { routine: RoutineSummary; isLast: boolean }) {
  const palette = usePalette();
  return (
    <Link href={`/app/workout/${routine.id}`} style={{
      display: "flex", alignItems: "center", justifyContent: "space-between",
      padding: "13px 4px", textDecoration: "none", color: palette.ink,
      borderBottom: isLast ? "none" : `1px solid ${palette.panelBorder}`,
      transition: "background .15s ease",
    }}>
      <div>
        <div style={{ fontSize: 14, fontWeight: 600 }}>{routine.name}</div>
        <div style={{ fontSize: 11, color: palette.inkDim, marginTop: 2 }}>
          {routine.source === "platform" ? "Sugerida por FitTrack" : routine.source === "client" ? "Creada por ti" : "Asignada por tu coach"}
        </div>
      </div>
      <Play size={15} color={palette.inkDim} />
    </Link>
  );
}
