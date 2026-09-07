"use client";

import { usePalette, type Palette } from "@/lib/theme";
import { calorieBreakdown, explainBreakdown } from "@/lib/calorieExplainer";
import { computeNutritionGoals, type CommitmentLevel, type Sex } from "@/lib/computeNutritionGoals";
import { goalLabel } from "@/lib/goals";
import { Flame, Minus, Plus, Equal } from "lucide-react";

/**
 * De dónde salen tus calorías.
 *
 * El número siempre estuvo bien calculado y siempre dependió del objetivo, pero la app
 * solo mostraba el resultado. Sin ver el mantenimiento al lado, "consume 2.635 kcal" no
 * se puede juzgar: no se sabe si eso es mucho, poco, o por qué.
 */
export default function CalorieBreakdownCard({
  weightKg, heightCm, age, sex, daysAvailable, goal, commitment, compact = false,
}: {
  weightKg: number | null; heightCm: number | null; age: number | null; sex: Sex | null;
  daysAvailable: number; goal: string | null; commitment: CommitmentLevel;
  /** En ajustes va más apretada; en el onboarding, con todo el texto. */
  compact?: boolean;
}) {
  const palette = usePalette();

  if (!weightKg || !heightCm || !age || !sex) {
    return (
      <div style={{ ...palette.cleanGroup, padding: 16 }}>
        <p style={{ fontSize: 12.5, color: palette.inkDim, lineHeight: 1.5 }}>
          Para calcular tus calorías nos falta tu peso, estatura, edad y sexo.
        </p>
      </div>
    );
  }

  const metas = computeNutritionGoals({ weightKg, heightCm, age, sex, daysAvailable, goal, commitment });
  const b = calorieBreakdown({ weightKg, heightCm, age, sex, daysAvailable, goal, commitment, target: metas.kcal });
  const textos = explainBreakdown(b, goal, commitment);

  const signo = b.direction === "deficit" ? "−" : b.direction === "superavit" ? "+" : "";
  const colorAjuste = b.direction === "deficit" ? "#7DC4E8" : b.direction === "superavit" ? "#7DD8C6" : palette.inkDim;

  return (
    <div style={{ ...palette.cleanGroup, padding: 16 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 12, fontWeight: 700, color: palette.accent, textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 14 }}>
        <Flame size={14} /> De dónde salen tus calorías
      </div>

      {/* La cuenta en tres pasos, para que el número final no aparezca de la nada. */}
      <Row
        palette={palette}
        icon={<Equal size={13} />}
        label="Tus calorías de mantenimiento"
        hint={`Con tu ${b.activityLabel} y ${daysAvailable} ${daysAvailable === 1 ? "día" : "días"} de entreno`}
        value={`${b.maintenance.toLocaleString("es-CO")} kcal`}
      />

      {b.direction !== "mantenimiento" && (
        <Row
          palette={palette}
          icon={b.direction === "deficit" ? <Minus size={13} /> : <Plus size={13} />}
          label={b.direction === "deficit" ? "Déficit para tu objetivo" : "Superávit para tu objetivo"}
          hint={goalLabel(goal)}
          value={`${signo}${Math.abs(b.adjustmentKcal).toLocaleString("es-CO")} kcal`}
          valueColor={colorAjuste}
        />
      )}

      <div style={{
        display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 10,
        paddingTop: 12, marginTop: 4, borderTop: `1px solid ${palette.panelBorder}`,
      }}>
        <div>
          <div style={{ fontSize: 13, fontWeight: 700 }}>Tu objetivo diario</div>
          <div style={{ fontSize: 11, color: palette.inkDim, marginTop: 2 }}>
            {metas.protein} g proteína · {metas.carbs} g carbos · {metas.fat} g grasa
          </div>
        </div>
        <div style={{ fontSize: 22, fontWeight: 900, color: palette.accent, whiteSpace: "nowrap" }}>
          {metas.kcal.toLocaleString("es-CO")}
          <span style={{ fontSize: 11, fontWeight: 600, color: palette.inkDim }}> kcal</span>
        </div>
      </div>

      {!compact && (
        <div style={{ marginTop: 14, display: "flex", flexDirection: "column", gap: 10 }}>
          {textos.map((t, i) => (
            <p key={i} style={{ fontSize: 12.5, color: palette.inkDim, lineHeight: 1.6, margin: 0 }}>{t}</p>
          ))}
        </div>
      )}
    </div>
  );
}

function Row({ palette, icon, label, hint, value, valueColor }: {
  palette: Palette; icon: React.ReactNode; label: string; hint: string; value: string; valueColor?: string;
}) {
  return (
    <div style={{ display: "flex", alignItems: "flex-start", gap: 10, marginBottom: 12 }}>
      <span style={{
        width: 22, height: 22, borderRadius: 7, flexShrink: 0, marginTop: 1,
        display: "flex", alignItems: "center", justifyContent: "center",
        background: palette.inputBg, color: palette.inkDim,
      }}>{icon}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 12.5, fontWeight: 600 }}>{label}</div>
        <div style={{ fontSize: 10.5, color: palette.inkDim, marginTop: 1 }}>{hint}</div>
      </div>
      <div style={{ fontSize: 14, fontWeight: 700, whiteSpace: "nowrap", color: valueColor ?? palette.ink }}>{value}</div>
    </div>
  );
}
