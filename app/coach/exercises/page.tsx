"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { usePalette, type Palette } from "@/lib/theme";
import { Search, Plus, X, Image as ImageIcon } from "lucide-react";
import { muscleLabel } from "@/lib/muscleLabels";
import { equipmentLabel } from "@/lib/equipmentLabels";
import { useExerciseSearch, useExerciseFilterOptions } from "@/lib/useExerciseSearch";
import Overlay from "@/components/Overlay";

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

function ExerciseForm({ existingExercises, exercise, onClose, onSaved }: { existingExercises: any[]; exercise?: any; onClose: () => void; onSaved: () => void }) {
  const palette = usePalette();
  const supabase = createClient();
  const { muscles, equipment: equipmentOptions } = useExerciseFilterOptions();
  const isEditing = !!exercise;
  const [name, setName] = useState(exercise?.name ?? "");
  const [muscleGroup, setMuscleGroup] = useState(exercise?.muscle_group ?? "");
  const [equipment, setEquipment] = useState(exercise?.equipment ?? "");
  const [measurementType, setMeasurementType] = useState(exercise?.measurement_type ?? "reps_weight");
  const [description, setDescription] = useState(exercise?.description ?? "");
  const [annotations, setAnnotations] = useState(exercise?.annotations ?? "");
  const [videoUrl, setVideoUrl] = useState(exercise?.video_url ?? "");
  const [countsToward, setCountsToward] = useState(exercise?.counts_toward_exercise_id ?? "");
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [mediaPreview, setMediaPreview] = useState(exercise?.media_url ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  function handleMediaChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setMediaFile(file);
    setMediaPreview(URL.createObjectURL(file));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    const { data: auth } = await supabase.auth.getUser();
    const uid = auth.user!.id;

    let mediaUrl: string | null = exercise?.media_url ?? null;
    if (mediaFile) {
      const ext = mediaFile.name.split(".").pop() || "jpg";
      const path = `exercise-media/${uid}/${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from("food-photos")
        .upload(path, mediaFile, { contentType: mediaFile.type || "image/gif", upsert: true });
      if (uploadError) {
        // Antes esto se ignoraba y el ejercicio se guardaba sin imagen, sin avisar.
        setSaving(false);
        setError(`No pudimos subir la imagen: ${uploadError.message}`);
        return;
      }
      const { data: pub } = supabase.storage.from("food-photos").getPublicUrl(path);
      mediaUrl = pub.publicUrl;
    }

    const payload = {
      name, muscleGroup, equipment, measurementType, description, annotations,
      mediaUrl, videoUrl: videoUrl.trim() || null, countsTowardExerciseId: countsToward || null,
    };

    const res = await fetch(isEditing ? `/api/coach/exercises/${exercise.id}` : "/api/coach/exercises", {
      method: isEditing ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json();

    setSaving(false);
    if (!res.ok) { setError(data.error || "No pudimos guardar el ejercicio"); return; }
    onSaved();
    onClose();
  }

  return (
    <Overlay onClose={onClose} zIndex={50}>
      <form onSubmit={handleSubmit} onClick={(e) => e.stopPropagation()} style={{
        ...palette.modalPanel, width: "100%", maxWidth: 440, padding: 24, maxHeight: "90vh", overflowY: "auto",
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
          <h2 style={{ fontSize: 18, fontWeight: 700 }}>{isEditing ? "Editar ejercicio" : "Nuevo ejercicio"}</h2>
          <button type="button" onClick={onClose} style={{ background: "none", border: "none", color: palette.inkDim, cursor: "pointer" }}>
            <X size={18} />
          </button>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <FormField label="Imagen o GIF del ejercicio (opcional)">
            <label style={{
              display: "flex", alignItems: "center", justifyContent: "center", gap: 8, height: mediaPreview ? "auto" : 90,
              borderRadius: 10, border: `1px dashed ${palette.panelBorder}`, background: palette.inputBg, cursor: "pointer", overflow: "hidden",
            }}>
              {mediaPreview ? (
                <img src={mediaPreview} alt="" style={{ width: "100%", maxHeight: 160, objectFit: "cover", display: "block" }} />
              ) : (
                <span style={{ display: "flex", alignItems: "center", gap: 6, color: palette.inkDim, fontSize: 12.5 }}>
                  <ImageIcon size={16} /> Subir imagen o GIF
                </span>
              )}
              <input type="file" accept="image/*" onChange={handleMediaChange} style={{ display: "none" }} />
            </label>
          </FormField>

          <FormField label="Nombre">
            <input required value={name} onChange={(e) => setName(e.target.value)} style={inputStyle(palette)} />
          </FormField>

          <FormField label="Grupo muscular">
            <ChoiceWithOther
              value={muscleGroup} onChange={setMuscleGroup} options={muscles}
              labelFor={muscleLabel} placeholder="Escribe el grupo muscular"
              emptyLabel="Elige un grupo muscular" palette={palette}
            />
          </FormField>

          <FormField label="Equipamiento">
            <ChoiceWithOther
              value={equipment} onChange={setEquipment} options={equipmentOptions}
              labelFor={equipmentLabel} placeholder="Escribe el material"
              emptyLabel="Elige el material" palette={palette}
            />
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

          <FormField label="Video de YouTube (opcional)">
            <input value={videoUrl} onChange={(e) => setVideoUrl(e.target.value)} placeholder="https://youtube.com/..." style={inputStyle(palette)} />
          </FormField>

          <FormField label="Sumar su volumen a otro ejercicio (opcional)">
            <select value={countsToward} onChange={(e) => setCountsToward(e.target.value)} style={inputStyle(palette)}>
              <option value="">No, contar por separado</option>
              {existingExercises.map((ex) => <option key={ex.id} value={ex.id}>{ex.name}</option>)}
            </select>
          </FormField>

          <button type="submit" disabled={saving} style={{
            marginTop: 6, padding: 12, borderRadius: 11, border: "none", cursor: "pointer",
            background: `linear-gradient(135deg, ${palette.accent}, ${palette.accentDeep})`, color: palette.bg,
            fontWeight: 700, fontSize: 14, opacity: saving ? 0.7 : 1,
          }}>
            {saving ? "Guardando..." : isEditing ? "Guardar cambios" : "Crear ejercicio"}
          </button>
          {error && <p style={{ color: "#f87171", fontSize: 12.5, textAlign: "center" }}>{error}</p>}
        </div>
      </form>
    </Overlay>
  );
}

/** Select con la lista existente más una opción "Otro" que abre un campo libre. */
function ChoiceWithOther({
  value, onChange, options, labelFor, placeholder, emptyLabel, palette,
}: {
  value: string; onChange: (v: string) => void; options: string[];
  labelFor: (v: string) => string; placeholder: string; emptyLabel: string; palette: Palette;
}) {
  const known = !value || options.includes(value);
  const [other, setOther] = useState(!known);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <select
        value={other ? "__other__" : value}
        onChange={(e) => {
          if (e.target.value === "__other__") { setOther(true); onChange(""); }
          else { setOther(false); onChange(e.target.value); }
        }}
        style={inputStyle(palette)}
      >
        <option value="">{emptyLabel}</option>
        {options.map((o) => <option key={o} value={o}>{labelFor(o)}</option>)}
        <option value="__other__">Otro...</option>
      </select>
      {other && (
        <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} style={inputStyle(palette)} />
      )}
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
