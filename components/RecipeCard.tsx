"use client";

import { palette, glassPanel } from "@/lib/theme";
import { Flame, ChefHat, Check } from "lucide-react";

export type Recipe = {
  title: string; kcal: number; protein: number; carbs: number; fat: number;
  ingredients: string[]; steps: string[];
};

export default function RecipeCard({
  recipe, compact = false, onSave, saved,
}: { recipe: Recipe; compact?: boolean; onSave?: () => void; saved?: boolean }) {
  if (compact) {
    return (
      <div style={{ ...glassPanel, padding: 12, display: "flex", alignItems: "center", gap: 10 }}>
        <div style={{ width: 34, height: 34, borderRadius: 10, background: `${palette.accent}22`, display: "flex", alignItems: "center", justifyContent: "center", color: palette.accent, flexShrink: 0 }}>
          <ChefHat size={16} />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 13, fontWeight: 600 }}>{recipe.title}</div>
          <div style={{ fontSize: 11, color: palette.inkDim }}>{Math.round(recipe.kcal)} kcal · sugerida por la IA de Alejo</div>
        </div>
      </div>
    );
  }

  return (
    <div className="ft-recipe-grow" style={{
      ...glassPanel, padding: 20, border: `1px solid ${palette.accent}55`,
      backgroundImage: `linear-gradient(${palette.panel}, ${palette.panel}), ${palette.metallicBorder}`,
      backgroundOrigin: "border-box", backgroundClip: "padding-box, border-box",
    }}>
      <style>{`
        @keyframes ftRecipeGrow { from { opacity: 0; transform: scale(0.85); } to { opacity: 1; transform: scale(1); } }
        .ft-recipe-grow { animation: ftRecipeGrow .4s cubic-bezier(.16,.8,.24,1) both; transform-origin: center; }
      `}</style>

      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
        <ChefHat size={16} color={palette.accent} />
        <span style={{ fontSize: 11, color: palette.accent, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.04em" }}>Receta sugerida</span>
      </div>
      <h3 style={{ fontSize: 17, fontWeight: 700, margin: "4px 0 10px" }}>{recipe.title}</h3>

      <div style={{ display: "flex", gap: 14, marginBottom: 14, fontSize: 12, color: palette.inkDim }}>
        <span style={{ display: "flex", alignItems: "center", gap: 4 }}><Flame size={12} /> {Math.round(recipe.kcal)} kcal</span>
        <span>P: {Math.round(recipe.protein)}g</span>
        <span>C: {Math.round(recipe.carbs)}g</span>
        <span>G: {Math.round(recipe.fat)}g</span>
      </div>

      {recipe.ingredients?.length > 0 && (
        <div style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 11, color: palette.inkDim, fontWeight: 700, textTransform: "uppercase", marginBottom: 4 }}>Ingredientes</div>
          <ul style={{ paddingLeft: 16, fontSize: 12.5, lineHeight: 1.6 }}>
            {recipe.ingredients.map((ing, i) => <li key={i}>{ing}</li>)}
          </ul>
        </div>
      )}

      {recipe.steps?.length > 0 && (
        <div style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 11, color: palette.inkDim, fontWeight: 700, textTransform: "uppercase", marginBottom: 4 }}>Pasos</div>
          <ol style={{ paddingLeft: 16, fontSize: 12.5, lineHeight: 1.6 }}>
            {recipe.steps.map((s, i) => <li key={i}>{s}</li>)}
          </ol>
        </div>
      )}

      {onSave && (
        <button onClick={onSave} disabled={saved} style={{
          width: "100%", padding: 11, borderRadius: 11, border: "none",
          background: saved ? palette.inputBg : `linear-gradient(135deg, ${palette.accent}, ${palette.accentDeep})`,
          color: saved ? palette.inkDim : "#0A0C10", fontWeight: 700, fontSize: 13, cursor: saved ? "default" : "pointer",
          display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
        }}>
          {saved ? <><Check size={14} /> Guardada en tu registro</> : "Agregar a mi registro de hoy"}
        </button>
      )}
    </div>
  );
}
