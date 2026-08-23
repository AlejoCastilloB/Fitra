"use client";

import { useEffect, useRef } from "react";
import { usePalette, type Palette } from "@/lib/theme";

function getTypes(palette: Palette) {
  return [
    { value: "warmup", letter: "C", label: "Calentamiento", color: "#FBBF24" },
    { value: "normal", letter: "#", label: "Normal", color: palette.accent },
    { value: "dropset", letter: "D", label: "Dropset", color: "#C77DFF" },
    { value: "failure", letter: "F", label: "Al fallo", color: "#F87171" },
  ];
}

export default function SetTypePopover({
  current, x, y, onSelect, onClose,
}: { current: string; x: number; y: number; onSelect: (type: string) => void; onClose: () => void }) {
  const palette = usePalette();
  const TYPES = getTypes(palette);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleOutside(e: MouseEvent | TouchEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    }
    document.addEventListener("mousedown", handleOutside);
    document.addEventListener("touchstart", handleOutside);
    return () => {
      document.removeEventListener("mousedown", handleOutside);
      document.removeEventListener("touchstart", handleOutside);
    };
  }, [onClose]);

  const width = 168;
  const left = Math.min(Math.max(8, x - width / 2), (typeof window !== "undefined" ? window.innerWidth : 400) - width - 8);
  const top = Math.min(y + 10, (typeof window !== "undefined" ? window.innerHeight : 800) - 200);

  return (
    <div
      ref={ref}
      style={{
        position: "fixed", left, top, width, zIndex: 100,
        background: palette.panel, border: `1px solid ${palette.panelBorder}`,
        backdropFilter: "blur(24px)", WebkitBackdropFilter: "blur(24px)",
        borderRadius: 14, padding: 6, boxShadow: "0 14px 40px -10px rgba(0,0,0,0.5)",
        animation: "ftPopoverIn .18s cubic-bezier(.16,.8,.24,1) both",
      }}
    >
      <style>{`@keyframes ftPopoverIn { from { opacity: 0; transform: scale(0.92) translateY(-4px); } to { opacity: 1; transform: none; } }`}</style>
      {TYPES.map((t) => (
        <button
          key={t.value}
          onClick={() => { onSelect(t.value); onClose(); }}
          style={{
            display: "flex", alignItems: "center", gap: 10, width: "100%", padding: "9px 10px",
            borderRadius: 9, background: current === t.value ? `${t.color}18` : "transparent",
            border: "none", cursor: "pointer",
          }}
        >
          <span style={{
            width: 22, height: 22, borderRadius: 7, background: `${t.color}22`, color: t.color,
            display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, flexShrink: 0,
          }}>{t.letter}</span>
          <span style={{ fontSize: 12.5, fontWeight: 600, color: t.color }}>{t.label}</span>
        </button>
      ))}
    </div>
  );
}
