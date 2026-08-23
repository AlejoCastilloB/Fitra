"use client";

import { useRef, useState } from "react";
import { usePalette } from "@/lib/theme";
import { Trash2, Pencil } from "lucide-react";

type Action = { label: string; icon?: "delete" | "edit"; color: string; onClick: () => void };

export default function SwipeableRow({
  children, rightAction, leftAction, actionWidth = 76,
}: { children: React.ReactNode; rightAction?: Action; leftAction?: Action; actionWidth?: number }) {
  const palette = usePalette();
  const [translateX, setTranslateX] = useState(0);
  const startX = useRef(0);
  const dragging = useRef(false);
  const startedAt = useRef(0);

  function onStart(x: number) {
    dragging.current = true;
    startX.current = x - translateX;
    startedAt.current = Date.now();
  }

  function onMove(x: number) {
    if (!dragging.current) return;
    let next = x - startX.current;
    const maxLeft = leftAction ? actionWidth : 0;
    const maxRight = rightAction ? -actionWidth : 0;
    next = Math.max(maxRight, Math.min(maxLeft, next));
    setTranslateX(next);
  }

  function onEnd() {
    dragging.current = false;
    const threshold = actionWidth / 2;
    if (translateX > threshold) setTranslateX(leftAction ? actionWidth : 0);
    else if (translateX < -threshold) setTranslateX(rightAction ? -actionWidth : 0);
    else setTranslateX(0);
  }

  function close() { setTranslateX(0); }

  const revealFraction = Math.min(1, Math.abs(translateX) / actionWidth);

  return (
    <div style={{ position: "relative", overflow: "hidden", borderRadius: 14 }}>
      {leftAction && (
        <div style={{
          position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "flex-start",
          background: leftAction.color, opacity: translateX > 0 ? revealFraction : 0, transition: dragging.current ? "none" : "opacity .2s",
        }}>
          <button onClick={() => { leftAction.onClick(); close(); }} style={{
            width: actionWidth, height: "100%", background: "none", border: "none", color: "#fff",
            display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 3, cursor: "pointer",
          }}>
            {leftAction.icon === "edit" ? <Pencil size={16} /> : <Trash2 size={16} />}
            <span style={{ fontSize: 9.5, fontWeight: 600 }}>{leftAction.label}</span>
          </button>
        </div>
      )}
      {rightAction && (
        <div style={{
          position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "flex-end",
          background: rightAction.color, opacity: translateX < 0 ? revealFraction : 0, transition: dragging.current ? "none" : "opacity .2s",
        }}>
          <button onClick={() => { rightAction.onClick(); close(); }} style={{
            width: actionWidth, height: "100%", background: "none", border: "none", color: "#fff",
            display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 3, cursor: "pointer",
          }}>
            {rightAction.icon === "edit" ? <Pencil size={16} /> : <Trash2 size={16} />}
            <span style={{ fontSize: 9.5, fontWeight: 600 }}>{rightAction.label}</span>
          </button>
        </div>
      )}

      <div
        onTouchStart={(e) => onStart(e.touches[0].clientX)}
        onTouchMove={(e) => onMove(e.touches[0].clientX)}
        onTouchEnd={onEnd}
        onMouseDown={(e) => onStart(e.clientX)}
        onMouseMove={(e) => e.buttons === 1 && onMove(e.clientX)}
        onMouseUp={onEnd}
        onMouseLeave={() => dragging.current && onEnd()}
        style={{
          transform: `translateX(${translateX}px)`,
          transition: dragging.current ? "none" : "transform .25s cubic-bezier(.16,.8,.24,1)",
          touchAction: "pan-y",
          position: "relative",
          background: palette.bg,
        }}
      >
        {children}
      </div>
    </div>
  );
}
