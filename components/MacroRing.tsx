"use client";

import { useEffect, useId, useState } from "react";

export default function MacroRing({
  value, max, size = 100, stroke = 9, colorFrom, colorTo, label, sublabel,
}: { value: number; max: number; size?: number; stroke?: number; colorFrom: string; colorTo: string; label: string; sublabel?: string }) {
  const [animated, setAnimated] = useState(0);
  const gradId = useId();
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const pct = Math.min(1, max > 0 ? value / max : 0);

  useEffect(() => {
    const t = setTimeout(() => setAnimated(pct), 80);
    return () => clearTimeout(t);
  }, [pct]);

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
      <span style={{ fontSize: size > 100 ? 12.5 : 10.5, color: "rgba(255,255,255,0.55)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em" }}>
        {label}
      </span>
      <div style={{ position: "relative", width: size, height: size }}>
        <svg width={size} height={size} style={{ position: "absolute", inset: 0, transform: "rotate(-90deg)" }}>
          <defs>
            <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor={colorFrom} />
              <stop offset="100%" stopColor={colorTo} />
            </linearGradient>
          </defs>
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth={stroke} />
          <circle
            cx={size / 2} cy={size / 2} r={r} fill="none" stroke={`url(#${gradId})`} strokeWidth={stroke}
            strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - animated)}
            style={{ transition: "stroke-dashoffset 1s cubic-bezier(.16,.8,.24,1)" }}
          />
        </svg>
        <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
          <span style={{ fontSize: size > 100 ? 22 : 15, fontWeight: 700, lineHeight: 1 }}>{Math.round(value)}</span>
          {sublabel && <span style={{ fontSize: 10, opacity: 0.5, marginTop: 2 }}>{sublabel}</span>}
        </div>
      </div>
    </div>
  );
}
