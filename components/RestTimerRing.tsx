"use client";

import { usePalette } from "@/lib/theme";

export default function RestTimerRing({ secondsLeft, totalSeconds, onSkip }: { secondsLeft: number; totalSeconds: number; onSkip: () => void }) {
  const palette = usePalette();
  const size = 74;
  const stroke = 6;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(1, secondsLeft / totalSeconds));

  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 16, padding: 14, borderRadius: 16,
      background: palette.panel, border: `1px solid ${palette.accent}55`, backdropFilter: "blur(20px)",
      WebkitBackdropFilter: "blur(20px)", marginBottom: 16,
    }}>
      <div style={{ position: "relative", width: size, height: size, flexShrink: 0 }}>
        <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={palette.divider} strokeWidth={stroke} />
          <circle
            cx={size / 2} cy={size / 2} r={r} fill="none" stroke={palette.accent} strokeWidth={stroke}
            strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - pct)}
            style={{ transition: "stroke-dashoffset 1s linear" }}
          />
        </svg>
        <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15, fontWeight: 700 }}>
          {secondsLeft}
        </div>
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 13, color: palette.accent, fontWeight: 700 }}>Descansando</div>
        <div style={{ fontSize: 11, color: palette.inkDim }}>Prepárate para la próxima serie</div>
      </div>
      <button onClick={onSkip} style={{
        fontSize: 11.5, color: palette.inkDim, background: palette.inputBg, border: `1px solid ${palette.panelBorder}`,
        padding: "7px 12px", borderRadius: 9, cursor: "pointer",
      }}>Saltar</button>
    </div>
  );
}
