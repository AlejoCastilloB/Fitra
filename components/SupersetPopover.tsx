"use client";

import { useEffect, useRef } from "react";
import { usePalette } from "@/lib/theme";
import { Check } from "lucide-react";

export default function SupersetPopover({
  options, x, y, onToggle, onClose,
}: {
  options: { id: string; name: string; linked: boolean }[];
  x: number; y: number;
  onToggle: (id: string) => void;
  onClose: () => void;
}) {
  const palette = usePalette();
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

  const width = 230;
  const left = Math.min(Math.max(8, x - width / 2), (typeof window !== "undefined" ? window.innerWidth : 400) - width - 8);
  const top = Math.min(y + 10, (typeof window !== "undefined" ? window.innerHeight : 800) - 260);

  return (
    <div
      ref={ref}
      style={{
        position: "fixed", left, top, width, zIndex: 100,
        background: palette.panel, border: `1px solid ${palette.panelBorder}`,
        backdropFilter: "blur(24px)", WebkitBackdropFilter: "blur(24px)",
        borderRadius: 14, padding: 8, boxShadow: "0 14px 40px -10px rgba(0,0,0,0.5)",
        maxHeight: 240, overflowY: "auto",
        animation: "ftPopoverIn .18s cubic-bezier(.16,.8,.24,1) both",
      }}
    >
      <style>{`@keyframes ftPopoverIn { from { opacity: 0; transform: scale(0.92) translateY(-4px); } to { opacity: 1; transform: none; } }`}</style>
      <div style={{ fontSize: 10.5, color: palette.inkDim, fontWeight: 700, textTransform: "uppercase", padding: "4px 6px 8px" }}>
        Vincular en superserie
      </div>
      {options.length === 0 ? (
        <p style={{ fontSize: 12, color: palette.inkDim, padding: "6px" }}>Agrega otro ejercicio primero.</p>
      ) : options.map((o) => (
        <button
          key={o.id}
          onClick={() => onToggle(o.id)}
          style={{
            display: "flex", alignItems: "center", gap: 8, width: "100%", padding: "8px 8px",
            borderRadius: 9, background: o.linked ? `${palette.accent}18` : "transparent", border: "none", cursor: "pointer",
          }}
        >
          <span style={{
            width: 16, height: 16, borderRadius: 5, border: `1.5px solid ${o.linked ? palette.accent : palette.panelBorder}`,
            background: o.linked ? palette.accent : "transparent", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
          }}>
            {o.linked && <Check size={11} color="#0A0C10" />}
          </span>
          <span style={{ fontSize: 12.5, color: palette.ink, textAlign: "left", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{o.name}</span>
        </button>
      ))}
    </div>
  );
}
