"use client";

import { useEffect, useState } from "react";

export default function MacroRing({
  value, max, size = 100, stroke = 9, color, label, sublabel,
}: { value: number; max: number; size?: number; stroke?: number; color: string; label: string; sublabel?: string }) {
  const [animated, setAnimated] = useState(0);
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const pct = Math.min(1, max > 0 ? value / max : 0);

  useEffect(() => {
    const t = setTimeout(() => setAnimated(pct), 80);
    return () => clearTimeout(t);
  }, [pct]);

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth={stroke} />
        <circle
          cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={stroke}
          strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - animated)}
          style={{ transition: "stroke-dashoffset 1s cubic-bezier(.16,.8,.24,1)" }}
        />
      </svg>
      <div style={{ marginTop: -size / 1.6, textAlign: "center" }}>
        <div style={{ fontSize: size > 80 ? 18 : 13, fontWeight: 700 }}>{Math.round(value)}</div>
        {sublabel && <div style={{ fontSize: 9.5, opacity: 0.6 }}>{sublabel}</div>}
      </div>
      <div style={{ fontSize: 11, opacity: 0.7, marginTop: size > 80 ? 4 : 0 }}>{label}</div>
    </div>
  );
}
