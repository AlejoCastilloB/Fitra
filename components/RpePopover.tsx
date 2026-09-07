"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { usePalette } from "@/lib/theme";

/**
 * Selector de RPE, anclado al botón de la propia serie.
 *
 * Antes el RPE era una fila entera que aparecía DEBAJO de la serie al marcarla: empujaba
 * todo hacia abajo justo cuando uno acaba de tocar el check, y en una rutina de veinte
 * series duplicaba el alto de la pantalla. Ahora es un botón más de la fila, entre las
 * repeticiones y el check, y los números salen en un popover que se cierra al elegir.
 */

const NIVELES: { value: number; label: string }[] = [
  { value: 6, label: "Fácil, quedaban 4+" },
  { value: 7, label: "Quedaban 3" },
  { value: 8, label: "Quedaban 2" },
  { value: 9, label: "Quedaba 1" },
  { value: 10, label: "Al fallo" },
];

export default function RpePopover({
  current, x, y, onSelect, onClose,
}: { current?: number; x: number; y: number; onSelect: (rpe: number | undefined) => void; onClose: () => void }) {
  const palette = usePalette();
  const ref = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    function fuera(e: MouseEvent | TouchEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    }
    document.addEventListener("mousedown", fuera);
    document.addEventListener("touchstart", fuera);
    return () => {
      document.removeEventListener("mousedown", fuera);
      document.removeEventListener("touchstart", fuera);
    };
  }, [onClose]);

  if (!mounted) return null;

  const width = 190;
  const ventanaW = typeof window !== "undefined" ? window.innerWidth : 400;
  const ventanaH = typeof window !== "undefined" ? window.innerHeight : 800;
  const left = Math.min(Math.max(8, x - width / 2), ventanaW - width - 8);
  const alto = 292;
  // Si no cabe debajo del botón, se abre hacia arriba en vez de salirse de la pantalla.
  const top = y + 10 + alto > ventanaH ? Math.max(8, y - alto - 26) : y + 10;

  // Igual que SetTypePopover: montado en <body> porque las coordenadas vienen de
  // getBoundingClientRect y un ancestro animado rompería el `fixed`.
  return createPortal(
    <div
      ref={ref}
      style={{
        position: "fixed", left, top, width, zIndex: 100,
        background: palette.bg, border: `1px solid ${palette.panelBorder}`,
        borderRadius: 14, padding: 8, boxShadow: "0 14px 40px -10px rgba(0,0,0,0.5)",
        animation: "ftPopoverIn .18s cubic-bezier(.16,.8,.24,1) both",
      }}
    >
      <style>{`@keyframes ftPopoverIn { from { opacity: 0; transform: scale(0.92) translateY(-4px); } to { opacity: 1; transform: none; } }`}</style>

      <div style={{ fontSize: 10.5, color: palette.inkDim, textTransform: "uppercase", letterSpacing: "0.04em", fontWeight: 700, padding: "2px 6px 8px" }}>
        ¿Cuánto te costó?
      </div>

      {NIVELES.map((n) => (
        <button
          key={n.value}
          onClick={() => { onSelect(n.value); onClose(); }}
          style={{
            display: "flex", alignItems: "center", gap: 10, width: "100%", padding: "9px 8px",
            borderRadius: 9, cursor: "pointer", border: "none", minHeight: 40,
            background: current === n.value ? `${palette.accent}18` : "transparent",
            touchAction: "manipulation",
          }}
        >
          <span style={{
            width: 26, height: 26, borderRadius: 8, flexShrink: 0,
            display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 800,
            background: current === n.value ? palette.accent : palette.inputBg,
            color: current === n.value ? palette.bg : palette.ink,
          }}>{n.value}</span>
          <span style={{ fontSize: 12, color: current === n.value ? palette.accent : palette.inkDim, textAlign: "left" }}>{n.label}</span>
        </button>
      ))}

      {current != null && (
        <>
          <div style={{ height: 1, background: palette.panelBorder, margin: "4px 6px" }} />
          <button
            onClick={() => { onSelect(undefined); onClose(); }}
            style={{
              width: "100%", padding: "9px 8px", borderRadius: 9, cursor: "pointer", border: "none",
              background: "transparent", color: palette.inkDim, fontSize: 12, minHeight: 40, touchAction: "manipulation",
            }}
          >
            Quitar el RPE
          </button>
        </>
      )}
    </div>,
    document.body,
  );
}
