"use client";

import { usePalette } from "@/lib/theme";
import { muscleLabel } from "@/lib/muscleLabels";
import { formatSets, type MuscleVolume } from "@/lib/muscleVolume";

const COLORS = ["#B9C2CE", "#C77DFF", "#7DD8C6", "#F5A97F", "#7DC4E8", "#F2B8D4", "#A0D995", "#F5D97F"];

/**
 * Series por músculo, en barras proporcionales al que más tiene.
 *
 * Se muestra el número tal cual —con sus medios— y no un porcentaje: al planificar se
 * piensa en "catorce series de pecho a la semana", no en "el 22% del volumen".
 */
export default function MuscleVolumeBars({
  muscles, max, compact = false,
}: { muscles: MuscleVolume[]; max?: number; compact?: boolean }) {
  const palette = usePalette();
  if (muscles.length === 0) {
    return <p style={{ fontSize: 12, color: palette.inkDim, margin: 0 }}>Sin series efectivas todavía.</p>;
  }

  const tope = max ?? muscles[0].sets;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: compact ? 5 : 8 }}>
      {muscles.map((m, i) => (
        <div key={m.muscle}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: compact ? 11 : 12, marginBottom: 3 }}>
            <span>{muscleLabel(m.muscle)}</span>
            <span style={{ color: palette.inkDim, fontVariantNumeric: "tabular-nums" }}>
              {formatSets(m.sets)} {m.sets === 1 ? "serie" : "series"}
            </span>
          </div>
          <div style={{ height: compact ? 4 : 6, borderRadius: 4, background: palette.inputBg, overflow: "hidden" }}>
            <div style={{
              height: "100%", width: `${tope > 0 ? (m.sets / tope) * 100 : 0}%`,
              background: COLORS[i % COLORS.length], borderRadius: 4, transition: "width .5s ease",
            }} />
          </div>
        </div>
      ))}
    </div>
  );
}
