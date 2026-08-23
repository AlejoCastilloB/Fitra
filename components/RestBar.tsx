"use client";

import { usePalette, type Palette } from "@/lib/theme";
import { Minus, Plus, SkipForward } from "lucide-react";

export default function RestBar({
  secondsLeft, totalSeconds, onAdjust, onSkip,
}: { secondsLeft: number; totalSeconds: number; onAdjust: (delta: number) => void; onSkip: () => void }) {
  const palette = usePalette();
  const pct = Math.max(0, Math.min(100, (secondsLeft / totalSeconds) * 100));

  return (
    <div style={{ margin: "8px 0 16px", padding: "10px 2px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
        <span style={{ fontSize: 11, color: palette.accent, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.03em" }}>Descansando</span>
        <span style={{ fontSize: 14, fontWeight: 700 }}>{secondsLeft}s</span>
      </div>
      <div style={{ height: 6, borderRadius: 4, background: palette.divider, overflow: "hidden", marginBottom: 10 }}>
        <div style={{ height: "100%", width: `${pct}%`, background: palette.accent, borderRadius: 4, transition: "width 1s linear" }} />
      </div>
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 14 }}>
        <button onClick={() => onAdjust(-10)} style={smallBtn(palette)}><Minus size={12} /> 10s</button>
        <button onClick={onSkip} style={{ ...smallBtn(palette), color: palette.inkDim, borderColor: palette.panelBorder }}>
          <SkipForward size={12} /> Saltar
        </button>
        <button onClick={() => onAdjust(10)} style={smallBtn(palette)}><Plus size={12} /> 10s</button>
      </div>
    </div>
  );
}

function smallBtn(palette: Palette): React.CSSProperties {
  return {
    display: "flex", alignItems: "center", gap: 4, background: "none", border: "1px solid",
    borderColor: "currentColor", borderRadius: 10, padding: "7px 12px", color: palette.accent,
    fontSize: 12, fontWeight: 700, cursor: "pointer",
  };
}
