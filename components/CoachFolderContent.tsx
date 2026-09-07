"use client";

import Link from "next/link";
import { usePalette, type Palette } from "@/lib/theme";
import MuscleVolumeBars from "@/components/MuscleVolumeBars";
import { formatSets } from "@/lib/muscleVolume";
import type { FolderView, FolderRoutine } from "@/lib/coachFolder";
import { ChevronLeft, ChevronRight, Dumbbell, Layers, Info, User } from "lucide-react";

const DAY_LABELS = ["D", "L", "M", "X", "J", "V", "S"];

/**
 * La carpeta como programa: el reparto de series del conjunto arriba, y luego cada día.
 *
 * El número de arriba es con el que se planifica de verdad —"¿cuánto pecho estoy dando a
 * la semana?"— y no se puede sacar mirando los días de uno en uno.
 */
export default function CoachFolderContent({ view }: { view: FolderView }) {
  const palette = usePalette();

  return (
    <div style={{ maxWidth: 760 }}>
      <Link href="/coach/routines" style={{ display: "inline-flex", alignItems: "center", gap: 6, color: palette.inkDim, textDecoration: "none", fontSize: 13.5, marginBottom: 18 }}>
        <ChevronLeft size={16} /> Rutinas
      </Link>

      <h1 style={{ fontSize: 21, fontWeight: 800, marginBottom: 4 }}>{view.folder}</h1>
      <p style={{ fontSize: 13, color: palette.inkDim, marginBottom: 20 }}>
        {view.routines.length} {view.routines.length === 1 ? "día" : "días"} ·{" "}
        {formatSets(view.totalEffectiveSets)} series efectivas en total
      </p>

      {view.description && (
        <div style={{ ...palette.glassPanel, padding: 14, marginBottom: 20, display: "flex", gap: 10, border: `1px solid ${palette.accent}44` }}>
          <Info size={14} color={palette.accent} style={{ flexShrink: 0, marginTop: 2 }} />
          <p style={{ fontSize: 13, lineHeight: 1.6, margin: 0, whiteSpace: "pre-wrap" }}>{view.description}</p>
        </div>
      )}

      <div style={{ ...palette.cleanGroup, padding: 16, marginBottom: 24 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 12, fontWeight: 700, color: palette.accent, textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 6 }}>
          <Layers size={14} /> Series por músculo — todo el programa
        </div>
        <p style={{ fontSize: 11.5, color: palette.inkDim, lineHeight: 1.5, marginBottom: 14 }}>
          Solo series efectivas: fuera el calentamiento y los dropsets. Cada serie suma 1 a
          su músculo principal y 0,5 a cada secundario — un press de banca son 1 de pecho,
          0,5 de hombro y 0,5 de tríceps.
        </p>
        <MuscleVolumeBars muscles={view.totalMuscles} />
      </div>

      <div style={{ fontSize: 12.5, fontWeight: 700, color: palette.accent, textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 12 }}>
        Los días
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {view.routines.map((r) => <DayCard key={r.id} routine={r} palette={palette} />)}
      </div>
    </div>
  );
}

function DayCard({ routine: r, palette }: { routine: FolderRoutine; palette: Palette }) {
  return (
    <div style={{ ...palette.glassPanel, padding: 16 }}>
      <Link href={`/coach/routines/${r.id}/edit`} style={{ display: "flex", alignItems: "flex-start", gap: 10, textDecoration: "none", color: palette.ink, marginBottom: 12 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 4 }}>
            <span style={{ fontSize: 15, fontWeight: 700 }}>{r.name}</span>
            {r.daysOfWeek.map((n) => (
              <span key={n} style={{
                width: 17, height: 17, borderRadius: 5, fontSize: 9, fontWeight: 700,
                display: "flex", alignItems: "center", justifyContent: "center",
                background: `${palette.accent}22`, color: palette.accent,
              }}>{DAY_LABELS[n] ?? "?"}</span>
            ))}
          </div>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", fontSize: 11.5, color: palette.inkDim }}>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
              <Dumbbell size={11} /> {r.exerciseCount} {r.exerciseCount === 1 ? "ejercicio" : "ejercicios"}
            </span>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
              <Layers size={11} /> {formatSets(r.effectiveSets)} series efectivas
            </span>
            {r.clientName && (
              <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                <User size={11} /> {r.clientName}
              </span>
            )}
          </div>
        </div>
        <ChevronRight size={17} color={palette.inkDim} style={{ flexShrink: 0, marginTop: 2 }} />
      </Link>

      {r.description && (
        <p style={{ fontSize: 12.5, lineHeight: 1.55, color: palette.inkDim, margin: "0 0 12px", whiteSpace: "pre-wrap" }}>
          {r.description}
        </p>
      )}

      <MuscleVolumeBars muscles={r.muscles} compact />
    </div>
  );
}
