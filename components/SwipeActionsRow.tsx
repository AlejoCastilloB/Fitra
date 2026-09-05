"use client";

import { usePalette } from "@/lib/theme";
import { useSwipeReveal } from "@/lib/useSwipeReveal";

export type SwipeAction = {
  label: string;
  icon: React.ReactNode;
  /** Color de fondo del botón descubierto. */
  color: string;
  onClick: () => void;
  disabled?: boolean;
};

const ACTION_WIDTH = 78;

/**
 * Fila que descubre acciones al deslizarla hacia la izquierda.
 *
 * Las acciones viven detrás de la fila, así que solo se pueden tocar cuando está abierta:
 * mientras está cerrada quedan tapadas por la propia fila, que es opaca.
 */
export default function SwipeActionsRow({
  actions, borderRadius = 20, children,
}: { actions: SwipeAction[]; borderRadius?: number; children: React.ReactNode }) {
  const palette = usePalette();
  const total = actions.length * ACTION_WIDTH;
  const swipe = useSwipeReveal(total);

  return (
    <div style={{ position: "relative", overflow: "hidden", borderRadius }}>
      <div style={{
        position: "absolute", top: 0, right: 0, bottom: 0, display: "flex",
        opacity: Math.min(1, Math.abs(swipe.dx) / total),
      }}>
        {actions.map((a) => (
          <button
            key={a.label}
            onClick={() => { swipe.close(); a.onClick(); }}
            disabled={a.disabled}
            tabIndex={swipe.open ? 0 : -1}
            aria-hidden={!swipe.open}
            style={{
              width: ACTION_WIDTH, border: "none", cursor: a.disabled ? "default" : "pointer",
              background: a.color, color: "#fff",
              display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 4,
              opacity: a.disabled ? 0.5 : 1,
            }}
          >
            {a.icon}
            <span style={{ fontSize: 10, fontWeight: 700 }}>{a.label}</span>
          </button>
        ))}
      </div>

      <div {...swipe.handlers} style={{ ...swipe.style, position: "relative", background: palette.bg }}>
        {children}
      </div>
    </div>
  );
}
