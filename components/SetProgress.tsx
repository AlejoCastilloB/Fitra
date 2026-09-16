"use client";

import { usePalette } from "@/lib/theme";
import type { LiveSet } from "@/lib/workoutSession";

/** Con más puntos que esto la fila se apelmaza y dejan de leerse de un vistazo. */
const MAX_PUNTOS = 8;

/**
 * Cuántas series llevas de este ejercicio, en el hueco que quedaba libre a la izquierda
 * del anillo de descanso.
 *
 * Ese espacio estaba vacío, y es donde se mira mientras se descansa: la pregunta de ese
 * momento es "¿cuánto me falta aquí?", y para contestarla había que bajar la vista y
 * contar los checks a mano.
 *
 * Los puntos usan el mismo lenguaje que los días de la semana de la tarjeta de compartir
 * y que el anillo: relleno es hecho, hueco es pendiente.
 */
export default function SetProgress({ sets }: { sets: LiveSet[] }) {
  const palette = usePalette();
  const hechas = sets.filter((s) => s.done).length;
  const total = sets.length;
  if (total === 0) return null;

  const completo = hechas === total;

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 9, minWidth: 0 }}>
      {total <= MAX_PUNTOS && (
        <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
          {sets.map((s, i) => (
            <div
              key={i}
              style={{
                width: 7, height: 7, borderRadius: "50%", boxSizing: "border-box",
                background: s.done ? palette.accent : "transparent",
                border: s.done ? "none" : `1.5px solid ${palette.panelBorder}`,
              }}
            />
          ))}
        </div>
      )}
      <span style={{
        fontSize: 11, fontWeight: 700, whiteSpace: "nowrap",
        color: completo ? palette.accent : palette.inkDim,
        fontVariantNumeric: "tabular-nums",
      }}>
        {completo ? `${total} de ${total} ✓` : `${hechas} de ${total}`}
      </span>
    </div>
  );
}
