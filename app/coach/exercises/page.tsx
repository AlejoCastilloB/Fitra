"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { usePalette, type Palette } from "@/lib/theme";
import { Search, Plus, X, Image as ImageIcon } from "lucide-react";
import { muscleLabel } from "@/lib/muscleLabels";
import { equipmentLabel } from "@/lib/equipmentLabels";
import { useExerciseSearch, useExerciseFilterOptions } from "@/lib/useExerciseSearch";
import ExerciseForm from "@/components/ExerciseForm";

const MEASUREMENT_LABELS: Record<string, string> = {
  reps_weight: "Reps y peso",
  time: "Tiempo",
  time_distance: "Tiempo y distancia",
  distance: "Distancia",
};

export default function ExercisesPage() {
  const palette = usePalette();
  const supabase = createClient();
  const [search, setSearch] = useState("");
  const [muscleFilter, setMuscleFilter] = useState("");
  const [equipmentFilter, setEquipmentFilter] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingExercise, setEditingExercise] = useState<any | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  const { muscles, equipment: equipmentOptions } = useExerciseFilterOptions();
  const { results: filtered, loading } = useExerciseSearch({
    search, muscle: muscleFilter, equipment: equipmentFilter, reloadKey,
  });

  const isFiltering = !!(search.trim() || muscleFilter || equipmentFilter);
  function load() { setReloadKey((k) => k + 1); }

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24, flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 4 }}>Ejercicios</h1>
          <p style={{ color: palette.inkDim, fontSize: 14 }}>Busca uno o crea el tuyo</p>
        </div>
        <button onClick={() => setShowForm(true)} style={{
          display: "flex", alignItems: "center", gap: 6, padding: "10px 16px", borderRadius: 12, border: "none",
          background: `linear-gradient(135deg, ${palette.accent}, ${palette.accentDeep})`, color: palette.bg,
          fontWeight: 700, fontSize: 13.5, cursor: "pointer",
        }}>
          <Plus size={15} /> Crear ejercicio
        </button>
      </div>

      {/* buscador + filtro */}
      <div style={{ display: "flex", gap: 10, marginBottom: 20, flexWrap: "wrap" }}>
        <div style={{ position: "relative", flex: "1 1 220px" }}>
          <Search size={15} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: palette.inkDim }} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar en español o inglés..."
            style={{
              width: "100%", padding: "10px 12px 10px 36px", borderRadius: 11,
              border: `1px solid ${palette.panelBorder}`, background: palette.inputBg, color: palette.ink, fontSize: 14,
            }}
          />
        </div>
        <select
          value={muscleFilter}
          onChange={(e) => setMuscleFilter(e.target.value)}
          style={{
            padding: "10px 12px", borderRadius: 11, border: `1px solid ${palette.panelBorder}`,
            background: palette.inputBg, color: palette.ink, fontSize: 13.5,
          }}
        >
          <option value="">Todos los músculos</option>
          {muscles.map((m) => <option key={m} value={m}>{muscleLabel(m)}</option>)}
        </select>
        <select
          value={equipmentFilter}
          onChange={(e) => setEquipmentFilter(e.target.value)}
          style={{
            padding: "10px 12px", borderRadius: 11, border: `1px solid ${palette.panelBorder}`,
            background: palette.inputBg, color: palette.ink, fontSize: 13.5,
          }}
        >
          <option value="">Todo el equipamiento</option>
          {equipmentOptions.map((e) => <option key={e} value={e}>{equipmentLabel(e)}</option>)}
        </select>
      </div>

      {!isFiltering && (
        <p style={{ fontSize: 12.5, color: palette.inkDim, marginBottom: 14, lineHeight: 1.5 }}>
          Mostrando algunos ejercicios frecuentes. Escribe para buscar en todo el catálogo —
          sirve el nombre en español o en inglés, sin tildes, y con cualquier palabra suelta
          (por ejemplo “tumbado” encuentra “Curl femoral tumbado”).
        </p>
      )}

      {/* grid */}
      {loading ? (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: 12 }}>
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} style={{ ...palette.glassPanel, height: 140, opacity: 0.4 }} />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div style={{ ...palette.glassPanel, padding: 32, textAlign: "center", color: palette.inkDim }}>
          Ningún ejercicio coincide con esa búsqueda.
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: 12 }}>
          {filtered.map((ex, i) => (
            <button key={ex.id} onClick={() => setEditingExercise(ex)} className="ft-fade-in-up" style={{ ...palette.glassPanel, overflow: "hidden", animationDelay: `${Math.min(i, 10) * 0.025}s`, textAlign: "left", cursor: "pointer", border: "none", padding: 0, display: "block", width: "100%" }}>
              {ex.media_url ? (
                <img src={ex.media_url} alt={ex.name} style={{ width: "100%", height: 110, objectFit: "cover", display: "block" }} />
              ) : (
                <div style={{ width: "100%", height: 110, background: palette.inputBg }} />
              )}
              <div style={{ padding: 10 }}>
                <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 4 }}>{ex.name}</div>
                <div style={{ fontSize: 11, color: palette.inkDim }}>
                  {muscleLabel(ex.muscle_group)} · {MEASUREMENT_LABELS[ex.measurement_type]}
                </div>
                {ex.trainer_id && (
                  <span style={{ fontSize: 9.5, color: palette.accent, fontWeight: 700, textTransform: "uppercase" }}>Propio</span>
                )}
              </div>
            </button>
          ))}
        </div>
      )}

      {showForm && <ExerciseForm existingExercises={filtered} onClose={() => setShowForm(false)} onSaved={load} />}
      {editingExercise && (
        <ExerciseForm
          existingExercises={filtered.filter((e) => e.id !== editingExercise.id)}
          exercise={editingExercise}
          onClose={() => setEditingExercise(null)}
          onSaved={load}
        />
      )}
    </div>
  );
}
