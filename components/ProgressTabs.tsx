"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { usePalette, type Palette } from "@/lib/theme";
import RoutinesContent from "@/components/RoutinesContent";
import NutritionContent from "@/components/NutritionContent";
import FoodAnamnesisGate from "@/components/FoodAnamnesisGate";

export default function ProgressTabs({
  anamnesisDone, nutritionEnabled = true,
}: { anamnesisDone: boolean; nutritionEnabled?: boolean }) {
  const palette = usePalette();
  const searchParams = useSearchParams();
  // Sin nutrición, un ?tab=nutrition guardado en favoritos no debe abrir una pestaña que
  // ya no existe.
  const initialTab = nutritionEnabled && searchParams.get("tab") === "nutrition" ? "nutrition" : "training";
  const [tab, setTab] = useState<"training" | "nutrition">(initialTab);

  return (
    <div>
      <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 14 }}>Progreso</h1>

      {nutritionEnabled && (
        <div style={{ display: "flex", gap: 4, padding: 4, borderRadius: 12, background: palette.inputBg, marginBottom: 20 }}>
          <button onClick={() => setTab("training")} style={segBtn(tab === "training", palette)}>Entrenamiento</button>
          <button onClick={() => setTab("nutrition")} style={segBtn(tab === "nutrition", palette)}>Nutrición</button>
        </div>
      )}

      {tab === "training" || !nutritionEnabled ? <RoutinesContent /> : (
        <FoodAnamnesisGate done={anamnesisDone}><NutritionContent /></FoodAnamnesisGate>
      )}
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
