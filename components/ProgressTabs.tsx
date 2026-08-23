"use client";

import { useState } from "react";
import { usePalette, type Palette } from "@/lib/theme";
import RoutinesContent from "@/components/RoutinesContent";
import NutritionContent from "@/components/NutritionContent";

export default function ProgressTabs() {
  const palette = usePalette();
  const [tab, setTab] = useState<"training" | "nutrition">("training");

  return (
    <div>
      <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 14 }}>Progreso</h1>

      <div style={{ display: "flex", gap: 4, padding: 4, borderRadius: 12, background: palette.inputBg, marginBottom: 20 }}>
        <button onClick={() => setTab("training")} style={segBtn(tab === "training", palette)}>Entrenamiento</button>
        <button onClick={() => setTab("nutrition")} style={segBtn(tab === "nutrition", palette)}>Nutrición</button>
      </div>

      {tab === "training" ? <RoutinesContent /> : <NutritionContent />}
    </div>
  );
}

function segBtn(active: boolean, palette: Palette): React.CSSProperties {
  return {
    flex: 1, padding: "9px", borderRadius: 9, border: "none", cursor: "pointer",
    background: active ? palette.accent : "transparent", color: active ? palette.bg : palette.inkDim,
    fontSize: 13, fontWeight: 700, transition: "all .2s ease",
  };
}
