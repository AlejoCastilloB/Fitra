"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { palette } from "./onboardingPalette";

export default function AnamnesisStep({
  title, subtitle, children, onBack, onNext, nextDisabled, nextLabel,
}: {
  title: string; subtitle?: string; children: React.ReactNode;
  onBack?: () => void; onNext: () => void; nextDisabled?: boolean; nextLabel?: string;
}) {
  return (
    <div>
      {onBack && (
        <button onClick={onBack} style={{ display: "flex", alignItems: "center", gap: 6, background: "none", border: "none", color: palette.inkDim, fontSize: 13, cursor: "pointer", marginBottom: 14, marginLeft: -6 }}>
          <ChevronLeft size={15} /> Atrás
        </button>
      )}
      <h2 style={{ fontSize: 19, fontWeight: 700, margin: "0 0 6px", lineHeight: 1.3 }}>{title}</h2>
      {subtitle && <p style={{ fontSize: 13, color: palette.inkDim, margin: "0 0 18px" }}>{subtitle}</p>}
      <div style={{ marginBottom: 22, marginTop: subtitle ? 0 : 18 }}>{children}</div>
      <button onClick={onNext} disabled={nextDisabled} style={{
        width: "100%", padding: 13, borderRadius: 12, border: "none", cursor: nextDisabled ? "default" : "pointer",
        background: `linear-gradient(135deg, ${palette.accent}, ${palette.accentDeep})`, color: "#0A0C10",
        fontWeight: 700, fontSize: 14.5, display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
        opacity: nextDisabled ? 0.5 : 1,
      }}>
        {nextLabel || "Continuar"} <ChevronRight size={16} />
      </button>
    </div>
  );
}
