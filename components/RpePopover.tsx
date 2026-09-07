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

/**
 * Los diez valores, con el significado de los que se usan de verdad.
 *
 * La escala entera va del 1 al 10 y así estaba antes; reducirla a 6-10 dejaba sin forma de
 * registrar una serie fácil. Los de abajo casi no se usan entrenando en serio, pero
 * quitarlos es decidir por la persona.
 */
const SIGNIFICADO: Record<number, string> = {
  1: "Nada de esfuerzo",
  2: "Muy fácil",
  3: "Fácil",
  4: "Cómodo",
  5: "Quedaban muchas",
  6: "Quedaban 4",
  7: "Quedaban 3",
  8: "Quedaban 2",
  9: "Quedaba 1",
  10: "Al fallo",
};

const VALORES = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

export default function RpePopover({
  current, x, y, onSelect, onClose,
}: { current?: number; x: number; y: number; onSelect: (rpe: number | undefined) => void; onClose: () => void }) {
  const palette = usePalette();
  const ref = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);
  /** El número sobre el que está el dedo o el ratón, para explicar qué significa. */
  const [preview, setPreview] = useState<number | null>(null);

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

  const width = 230;
  const ventanaW = typeof window !== "undefined" ? window.innerWidth : 400;
  const ventanaH = typeof window !== "undefined" ? window.innerHeight : 800;
  const left = Math.min(Math.max(8, x - width / 2), ventanaW - width - 8);
  const alto = 190;
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

      <div style={{ fontSize: 10.5, color: palette.inkDim, textTransform: "uppercase", letterSpacing: "0.04em", fontWeight: 700, padding: "2px 4px 8px" }}>
        ¿Cuánto te costó?
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 6 }}>
        {VALORES.map((n) => (
          <button
            key={n}
            onMouseEnter={() => setPreview(n)}
            onFocus={() => setPreview(n)}
            onClick={() => { onSelect(n); onClose(); }}
            style={{
              height: 40, borderRadius: 9, cursor: "pointer", border: "none",
              fontSize: 13, fontWeight: 800, fontFamily: "inherit", touchAction: "manipulation",
              background: current === n ? palette.accent : palette.inputBg,
              color: current === n ? palette.bg : palette.ink,
            }}
          >{n}</button>
        ))}
      </div>

      <p style={{ fontSize: 11.5, color: palette.inkDim, textAlign: "center", margin: "10px 2px 2px", minHeight: 15 }}>
        {SIGNIFICADO[preview ?? current ?? 8]}
      </p>

      {current != null && (
        <>
          <div style={{ height: 1, background: palette.panelBorder, margin: "6px 4px 2px" }} />
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
