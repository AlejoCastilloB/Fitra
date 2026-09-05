"use client";

import { useRef, useState } from "react";

/**
 * Gesto de "deslizar hacia la izquierda para descubrir acciones".
 *
 * El arrastre solo se activa cuando el movimiento es claramente horizontal. Sin ese
 * bloqueo de eje, cualquier scroll vertical que empiece encima de la fila la arrastraba de
 * lado y la lista se sentía resbaladiza.
 *
 * Devuelve el desplazamiento actual y los manejadores que hay que poner en la capa que se
 * mueve. Quien lo usa decide qué dibuja debajo.
 */
export function useSwipeReveal(width: number) {
  const [dx, setDx] = useState(0);
  const [dragging, setDragging] = useState(false);
  const start = useRef<{ x: number; y: number } | null>(null);
  const axis = useRef<"none" | "x" | "y">("none");

  function onTouchStart(e: React.TouchEvent) {
    const t = e.touches[0];
    start.current = { x: t.clientX, y: t.clientY };
    axis.current = "none";
  }

  function onTouchMove(e: React.TouchEvent) {
    if (!start.current) return;
    const t = e.touches[0];
    const deltaX = t.clientX - start.current.x;
    const deltaY = t.clientY - start.current.y;

    if (axis.current === "none") {
      if (Math.abs(deltaX) < 8 && Math.abs(deltaY) < 8) return;
      axis.current = Math.abs(deltaX) > Math.abs(deltaY) ? "x" : "y";
      if (axis.current === "x") setDragging(true);
    }
    if (axis.current !== "x") return;

    // Solo hacia la izquierda, con un poco de margen al pasarse del tope.
    const base = dx === -width ? -width : 0;
    setDx(Math.min(0, Math.max(-width - 20, base + deltaX)));
  }

  function onTouchEnd() {
    start.current = null;
    setDragging(false);
    if (axis.current === "x") setDx(dx < -width / 2 ? -width : 0);
    axis.current = "none";
  }

  const handlers = {
    onTouchStart,
    onTouchMove,
    onTouchEnd,
    onTouchCancel: onTouchEnd,
  };

  return {
    dx,
    dragging,
    open: dx !== 0,
    close: () => setDx(0),
    handlers,
    /** Estilo de la capa que se desplaza. */
    style: {
      transform: `translateX(${dx}px)`,
      transition: dragging ? "none" : "transform .25s cubic-bezier(.16,.8,.24,1)",
      touchAction: "pan-y" as const,
    },
  };
}
