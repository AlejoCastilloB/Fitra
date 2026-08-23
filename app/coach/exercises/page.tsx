"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { usePalette, type Palette } from "@/lib/theme";
import { Search, Plus, X } from "lucide-react";

const MEASUREMENT_LABELS: Record<string, string> = {
  reps_weight: "Reps y peso",
  time: "Tiempo",
  time_distance: "Tiempo y distancia",
  distance: "Distancia",
};

export default function ExercisesPage() {
  const palette = usePalette();
  const supabase = createClient();
  const [exercises, setExercises] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [muscleFilter, setMuscleFilter] = useState("");
  const [showForm, setShowForm] = useState(false);

  async function load() {
    setLoading(true);
    const { data } = await supabase
      .from("exercises")
      .select("*")
      .order("name")
      .limit(500);
    setExercises(data ?? []);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  const muscles = Array.from(new Set(exercises.map((e) => e.muscle_group).filter(Boolean))).sort();

  const filtered = exercises.filter((e) => {
    const matchesSearch = e.name.toLowerCase().includes(search.toLowerCase());
    const matchesMuscle = !muscleFilter || e.muscle_group === muscleFilter;
    return matchesSearch && matchesMuscle;
  });

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24, flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 4 }}>Ejercicios</h1>
          <p style={{ color: palette.inkDim, fontSize: 14 }}>{exercises.length} ejercicios disponibles</p>
        </div>
        <button onClick={() => setShowForm(true)} style={{
          display: "flex", alignItems: "center", gap: 6, padding: "10px 16px", borderRadius: 12, border: "none",
          background: `linear-gradient(135deg, ${palette.accent}, ${palette.accentDeep})`, color: "#0A0C10",
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
            placeholder="Buscar ejercicio..."
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
          {muscles.map((m) => <option key={m} value={m}>{m}</option>)}
        </select>
      </div>

      {/* grid */}
      {loading ? (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: 12 }}>
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} style={{ ...palette.glassPanel, height: 140, opacity: 0.4 }} />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div style={{ ...palette.glassPanel, padding: 32, textAlign: "center", color: palette.inkDim }}>
          {exercises.length === 0
            ? "Todavía no hay ejercicios cargados (falta correr el seed de la biblioteca base)."
            : "Ningún ejercicio coincide con tu búsqueda."}
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: 12 }}>
          {filtered.map((ex) => (
            <div key={ex.id} style={{ ...palette.glassPanel, overflow: "hidden" }}>
              {ex.media_url ? (
                <img src={ex.media_url} alt={ex.name} style={{ width: "100%", height: 110, objectFit: "cover", display: "block" }} />
              ) : (
                <div style={{ width: "100%", height: 110, background: palette.inputBg }} />
              )}
              <div style={{ padding: 10 }}>
                <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 4 }}>{ex.name}</div>
                <div style={{ fontSize: 11, color: palette.inkDim }}>
                  {ex.muscle_group} · {MEASUREMENT_LABELS[ex.measurement_type]}
                </div>
                {ex.trainer_id && (
                  <span style={{ fontSize: 9.5, color: palette.accent, fontWeight: 700, textTransform: "uppercase" }}>Propio</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {showForm && <ExerciseForm onClose={() => setShowForm(false)} onCreated={load} />}
    </div>
  );
}

function ExerciseForm({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const palette = usePalette();
  const supabase = createClient();
  const [name, setName] = useState("");
  const [muscleGroup, setMuscleGroup] = useState("");
  const [equipment, setEquipment] = useState("");
  const [measurementType, setMeasurementType] = useState("reps_weight");
  const [description, setDescription] = useState("");
  const [annotations, setAnnotations] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const { data: auth } = await supabase.auth.getUser();

    await supabase.from("exercises").insert({
      trainer_id: auth.user!.id,
      name,
      muscle_group: muscleGroup,
      equipment,
      measurement_type: measurementType,
      description,
      annotations,
    });

    setSaving(false);
    onCreated();
    onClose();
  }

  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)", display: "flex",
      alignItems: "center", justifyContent: "center", zIndex: 50, padding: 20,
    }}>
      <form onSubmit={handleSubmit} style={{
        ...palette.glassPanel, width: "100%", maxWidth: 440, padding: 24, maxHeight: "90vh", overflowY: "auto",
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
          <h2 style={{ fontSize: 18, fontWeight: 700 }}>Nuevo ejercicio</h2>
          <button type="button" onClick={onClose} style={{ background: "none", border: "none", color: palette.inkDim, cursor: "pointer" }}>
            <X size={18} />
          </button>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <FormField label="Nombre">
            <input required value={name} onChange={(e) => setName(e.target.value)} style={inputStyle(palette)} />
          </FormField>

          <FormField label="Grupo muscular">
            <input value={muscleGroup} onChange={(e) => setMuscleGroup(e.target.value)} placeholder="Ej: pecho, espalda, cuádriceps" style={inputStyle(palette)} />
          </FormField>

          <FormField label="Equipamiento">
            <input value={equipment} onChange={(e) => setEquipment(e.target.value)} placeholder="Ej: barra, mancuernas, banda" style={inputStyle(palette)} />
          </FormField>

          <FormField label="Forma de medición">
            <select value={measurementType} onChange={(e) => setMeasurementType(e.target.value)} style={inputStyle(palette)}>
              <option value="reps_weight">Reps y peso</option>
              <option value="time">Tiempo</option>
              <option value="time_distance">Tiempo y distancia</option>
              <option value="distance">Distancia</option>
            </select>
          </FormField>

          <FormField label="Descripción">
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} style={{ ...inputStyle(palette), minHeight: 60, resize: "vertical" }} />
          </FormField>

          <FormField label="Anotaciones para el entrenamiento (opcional)">
            <textarea value={annotations} onChange={(e) => setAnnotations(e.target.value)} placeholder="Ej: mantener espalda recta, tempo 2-1-2" style={{ ...inputStyle(palette), minHeight: 50, resize: "vertical" }} />
          </FormField>

          <button type="submit" disabled={saving} style={{
            marginTop: 6, padding: 12, borderRadius: 11, border: "none", cursor: "pointer",
            background: `linear-gradient(135deg, ${palette.accent}, ${palette.accentDeep})`, color: "#0A0C10",
            fontWeight: 700, fontSize: 14, opacity: saving ? 0.7 : 1,
          }}>
            {saving ? "Guardando..." : "Crear ejercicio"}
          </button>
        </div>
      </form>
    </div>
  );
}

function inputStyle(palette: Palette): React.CSSProperties {
  return {
    width: "100%", padding: "10px 12px", borderRadius: 10, border: `1px solid ${palette.panelBorder}`,
    background: palette.inputBg, color: palette.ink, fontSize: 13.5, fontFamily: "inherit",
  };
}

function FormField({ label, children }: { label: string; children: React.ReactNode }) {
  const palette = usePalette();
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 5, fontSize: 12, color: palette.inkDim }}>
      {label}
      {children}
    </label>
  );
}
