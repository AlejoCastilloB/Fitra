"use client";

import { Sparkles } from "lucide-react";
import { palette } from "./onboardingPalette";

export default function MotivationalFact({ text, onNext }: { text: string; onNext: () => void }) {
  return (
    <div style={{ textAlign: "center", padding: "10px 0" }}>
      <div style={{
        width: 52, height: 52, borderRadius: "50%", background: `${palette.accent}22`,
        display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 18px", color: palette.accent,
      }}>
        <Sparkles size={24} />
      </div>
      <p style={{ fontSize: 15, lineHeight: 1.6, color: palette.ink, marginBottom: 26 }}>{text}</p>
      <button onClick={onNext} style={{
        width: "100%", padding: 13, borderRadius: 12, border: "none", cursor: "pointer",
        background: `linear-gradient(135deg, ${palette.accent}, ${palette.accentDeep})`, color: "#0A0C10",
        fontWeight: 700, fontSize: 14.5,
      }}>
        Seguir
      </button>
    </div>
  );
}
