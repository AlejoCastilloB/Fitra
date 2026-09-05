"use client";

import { usePalette } from "@/lib/theme";
import { useSwipeReveal } from "@/lib/useSwipeReveal";
import { getSetBadge } from "@/lib/setBadges";
import { LiveExercise, LiveSet } from "@/lib/workoutSession";
import { Check, Trash2 } from "lucide-react";

const DELETE_WIDTH = 84;

/** Cuánto sobresale la fila hacia los lados de la tarjeta. Debe coincidir con el padding
 *  de la tarjeta del ejercicio para que la banda llegue justo a los bordes. */
export const SET_ROW_BLEED = 16;

type Props = {
  exercise: LiveExercise;
  set: LiveSet;
  index: number;
  /** Texto de la columna "Anterior". Si no se pasa, la columna no se dibuja. */
  previousLabel?: string;
  highlighted?: boolean;
  trackRpe?: boolean;
  onOpenTypeMenu: (rect: DOMRect) => void;
  onChangeField: (field: "weight" | "reps" | "time_sec" | "distance_m", value: number | undefined) => void;
  onToggleDone: () => void;
  onRemove: () => void;
  onSetRpe: (rpe: number) => void;
};

export default function WorkoutSetRow({
  exercise, set: s, index, previousLabel, highlighted, trackRpe,
  onOpenTypeMenu, onChangeField, onToggleDone, onRemove, onSetRpe,
}: Props) {
  const palette = usePalette();
  const badge = getSetBadge(exercise.sets, index, palette.accent);

  // Deslizar hacia la izquierda descubre "Eliminar". El gesto (con su bloqueo de eje para
  // no robarle el scroll vertical a la página) vive en useSwipeReveal.
  const swipe = useSwipeReveal(DELETE_WIDTH);

  const inputs: React.ReactNode[] = [];
  if (exercise.measurement_type === "reps_weight") {
    inputs.push(
      <SetInput key="w" value={s.weight} placeholder={s.target?.weight} onChange={(v) => onChangeField("weight", v)} />,
      <SetInput key="r" value={s.reps} placeholder={s.target?.reps} onChange={(v) => onChangeField("reps", v)} />,
    );
  }
  if (exercise.measurement_type === "time" || exercise.measurement_type === "time_distance") {
    inputs.push(<SetInput key="t" value={s.time_sec} placeholder={s.target?.time_sec} onChange={(v) => onChangeField("time_sec", v)} />);
  }
  if (exercise.measurement_type === "distance" || exercise.measurement_type === "time_distance") {
    inputs.push(<SetInput key="d" value={s.distance_m} placeholder={s.target?.distance_m} onChange={(v) => onChangeField("distance_m", v)} />);
  }

  return (
    <div style={{
      // La banda sangra hasta los bordes de la tarjeta: antes terminaba justo al lado del
      // check y se veía cortada.
      margin: `0 -${SET_ROW_BLEED}px`,
      position: "relative", overflow: "hidden",
    }}>
      <button
        onClick={() => { swipe.close(); onRemove(); }}
        tabIndex={swipe.open ? 0 : -1}
        aria-hidden={!swipe.open}
        style={{
          position: "absolute", top: 0, right: 0, bottom: 0, width: DELETE_WIDTH,
          background: "#c0392b", color: "#fff", border: "none", cursor: "pointer",
          display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 3,
          opacity: Math.min(1, Math.abs(swipe.dx) / DELETE_WIDTH),
        }}
      >
        <Trash2 size={15} />
        <span style={{ fontSize: 9.5, fontWeight: 700 }}>Eliminar</span>
      </button>

      <div {...swipe.handlers} style={{ ...swipe.style, position: "relative", background: palette.bg }}>
        <div style={{
          position: "relative", overflow: "hidden",
          display: "flex", alignItems: "center", gap: 8,
          padding: `9px ${SET_ROW_BLEED}px`,
          background: index % 2 === 1 ? palette.panel : "transparent",
          animation: highlighted ? "ftDropsetHighlight 1.8s ease-out" : "none",
        }}>
          <div style={{
            position: "absolute", top: 0, right: 0, bottom: 0,
            width: s.done ? "100%" : "0%",
            background: "rgba(74,222,128,0.16)",
            transition: "width .45s cubic-bezier(.16,.8,.24,1)",
            pointerEvents: "none",
          }} />

          <button
            onClick={(e) => onOpenTypeMenu(e.currentTarget.getBoundingClientRect())}
            style={{
              position: "relative", width: 22, height: 22, borderRadius: 7, border: "none", cursor: "pointer",
              fontWeight: 700, fontSize: 11, flexShrink: 0, color: badge.color, background: `${badge.color}22`,
            }}
          >{badge.text}</button>

          {previousLabel !== undefined && (
            <span style={{ position: "relative", width: 62, fontSize: 11, color: palette.inkDim, textAlign: "center" }}>{previousLabel}</span>
          )}

          {inputs}

          <div style={{ position: "relative", flex: 1 }} />

          <button onClick={onToggleDone} style={{
            position: "relative", width: 26, height: 26, borderRadius: 8,
            border: `1px solid ${s.done ? "#4ADE80" : palette.panelBorder}`,
            background: s.done ? "#4ADE80" : "transparent",
            display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flexShrink: 0,
            transition: "background .3s ease, border-color .3s ease",
          }}>
            <Check size={13} color={s.done ? palette.bg : palette.inkDim} />
          </button>
        </div>

        {trackRpe && s.done && (
          <div style={{
            display: "flex", alignItems: "center", gap: 4,
            padding: `0 ${SET_ROW_BLEED}px 8px ${SET_ROW_BLEED + 30}px`,
            background: index % 2 === 1 ? palette.panel : "transparent",
          }}>
            <span style={{ fontSize: 9.5, color: palette.inkDim, marginRight: 4 }}>RPE</span>
            {Array.from({ length: 10 }, (_, n) => n + 1).map((n) => (
              <button key={n} onClick={() => onSetRpe(n)} style={{
                width: 18, height: 18, borderRadius: 5, border: "none", cursor: "pointer",
                fontSize: 9, fontWeight: 700, flexShrink: 0,
                color: s.rpe === n ? palette.bg : palette.inkDim,
                background: s.rpe === n ? palette.accent : palette.inputBg,
              }}>{n}</button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/** Campo numérico que SÍ se puede dejar vacío. Antes forzaba `0` en cuanto se borraba el
 *  contenido, así que para escribir "4" había que teclear "04" y luego borrar el cero.
 *  Ahora el vacío es un estado válido y el número de la rutina se ve en gris de fondo. */
export function SetInput({
  value, placeholder, onChange,
}: { value?: number; placeholder?: number; onChange: (v: number | undefined) => void }) {
  const palette = usePalette();
  return (
    <input
      type="number" inputMode="decimal" min={0}
      value={value ?? ""}
      placeholder={placeholder !== undefined ? String(placeholder) : ""}
      onChange={(e) => {
        const raw = e.target.value;
        if (raw === "") { onChange(undefined); return; }
        const n = Number(raw);
        onChange(Number.isFinite(n) ? Math.max(0, n) : undefined);
      }}
      onKeyDown={(e) => { if (e.key === "-" || e.key === "+" || e.key === "e") e.preventDefault(); }}
      style={{
        position: "relative", width: 50, padding: "5px 6px", borderRadius: 7,
        border: `1px solid ${palette.panelBorder}`, background: palette.inputBg,
        color: palette.ink, fontSize: 12.5, textAlign: "center",
      }} />
  );
}
