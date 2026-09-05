"use client";

import Link from "next/link";
import { usePalette, type Palette } from "@/lib/theme";
import { formatDurationLabel } from "@/lib/formatDuration";
import type { CoachWorkoutRow } from "@/lib/coachClientWorkouts";
import { ChevronLeft, ChevronRight, Clock, Dumbbell, Weight } from "lucide-react";

export default function CoachClientWorkoutsContent({
  clientId, clientName, workouts,
}: { clientId: string; clientName: string; workouts: CoachWorkoutRow[] }) {
  const palette = usePalette();

  const totalSeconds = workouts.reduce((s, w) => s + w.durationSec, 0);
  const totalVolume = workouts.reduce((s, w) => s + w.totalVolume, 0);

  return (
    <div style={{ maxWidth: 720 }}>
      <Link href={`/coach/clients/${clientId}`} style={{ display: "inline-flex", alignItems: "center", gap: 6, color: palette.inkDim, textDecoration: "none", fontSize: 13.5, marginBottom: 18 }}>
        <ChevronLeft size={16} /> {clientName}
      </Link>

      <h1 style={{ fontSize: 20, fontWeight: 700, marginBottom: 4 }}>Entrenamientos</h1>
      <p style={{ fontSize: 13, color: palette.inkDim, marginBottom: 20 }}>
        {workouts.length === 0
          ? "Todavía no hay ninguno registrado."
          : `${workouts.length} ${workouts.length === 1 ? "sesión registrada" : "sesiones registradas"} · ${formatDurationLabel(totalSeconds)} en total · ${Math.round(totalVolume).toLocaleString("es-CO")} kg`}
      </p>

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {workouts.map((w) => (
          <Link
            key={w.id}
            href={`/coach/clients/${clientId}/workouts/${w.id}`}
            style={{ ...palette.glassPanel, padding: 16, display: "flex", alignItems: "center", gap: 12, textDecoration: "none", color: palette.ink }}
          >
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 14.5, fontWeight: 700, marginBottom: 4 }}>{w.routineName}</div>
              <div style={{ fontSize: 12, color: palette.inkDim, marginBottom: 6 }}>{formatDate(w.date)}</div>
              <div style={{ display: "flex", gap: 14, flexWrap: "wrap", fontSize: 12, color: palette.inkDim }}>
                <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                  <Clock size={12} /> {formatDurationLabel(w.durationSec)}
                </span>
                <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                  <Weight size={12} /> {Math.round(w.totalVolume).toLocaleString("es-CO")} kg
                </span>
              </div>
            </div>
            <ChevronRight size={18} color={palette.inkDim} style={{ flexShrink: 0 }} />
          </Link>
        ))}
      </div>

      {workouts.length === 0 && <EmptyState palette={palette} />}
    </div>
  );
}

function EmptyState({ palette }: { palette: Palette }) {
  return (
    <div style={{ ...palette.glassPanel, padding: 30, textAlign: "center" }}>
      <Dumbbell size={22} color={palette.inkDim} style={{ marginBottom: 10 }} />
      <p style={{ fontSize: 13, color: palette.inkDim, lineHeight: 1.5 }}>
        En cuanto complete su primer entrenamiento aparecerá aquí, con la duración, el volumen y cada serie que registró.
      </p>
    </div>
  );
}

export function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("es-CO", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}
