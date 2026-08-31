"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { usePalette, type Palette } from "@/lib/theme";
import { muscleLabel } from "@/lib/muscleLabels";
import { equipmentLabel } from "@/lib/equipmentLabels";
import { useExerciseSearch, useExerciseFilterOptions, type FoundExercise } from "@/lib/useExerciseSearch";
import { Search, Plus, X, SlidersHorizontal } from "lucide-react";
import GifThumb from "@/components/GifThumb";

export type PickableExercise = FoundExercise;

/**
 * Buscador de ejercicios a pantalla completa: nombre + grupo muscular + equipamiento,
 * combinables entre sí. Solo consulta la tabla `exercises`.
 */
export default function ExercisePicker({
  onPick, onClose, alreadyAddedIds = [],
}: {
  onPick: (exercise: PickableExercise) => void;
  onClose: () => void;
  alreadyAddedIds?: string[];
}) {
  const palette = usePalette();
  const [search, setSearch] = useState("");
  const [muscle, setMuscle] = useState("");
  const [equipment, setEquipment] = useState("");
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  // Hoja a pantalla completa: el body no debe seguir desplazándose por detrás.
  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = previous; };
  }, []);

  const { muscles, equipment: equipmentOptions } = useExerciseFilterOptions();
  const { results, loading } = useExerciseSearch({ search, muscle, equipment });

  const activeFilters = (muscle ? 1 : 0) + (equipment ? 1 : 0);

  if (!mounted) return null;

  // Igual que la cámara: montada en <body> para que `position: fixed` sea relativo a
  // la ventana y no a la columna del contenido.
  return createPortal(
    <div
      className="ft-sheet-in"
      style={{
        position: "fixed", inset: 0, zIndex: 300, background: palette.bg,
        display: "flex", flexDirection: "column",
        paddingTop: "env(safe-area-inset-top)", paddingBottom: "env(safe-area-inset-bottom)",
      }}
    >
      <style>{`
        @keyframes ftSheetIn { from { opacity: 0; transform: translateY(14px); } to { opacity: 1; transform: none; } }
        .ft-sheet-in { animation: ftSheetIn .22s cubic-bezier(.16,.8,.24,1) both; }
      `}</style>

      <div style={{ padding: "14px 16px 10px", borderBottom: `1px solid ${palette.panelBorder}` }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
          <h2 style={{ fontSize: 17, fontWeight: 700 }}>Agregar ejercicio</h2>
          <button onClick={onClose} aria-label="Cerrar" style={{ background: "none", border: "none", color: palette.inkDim, cursor: "pointer", padding: 4 }}>
            <X size={22} />
          </button>
        </div>

        <div style={{ position: "relative", marginBottom: 10 }}>
          <Search size={15} style={{ position: "absolute", left: 11, top: "50%", transform: "translateY(-50%)", color: palette.inkDim }} />
          <input
            value={search} onChange={(e) => setSearch(e.target.value)} autoFocus
            placeholder="Buscar por nombre..."
            style={{
              width: "100%", padding: "11px 12px 11px 34px", borderRadius: 12, fontSize: 15, fontFamily: "inherit",
              border: `1px solid ${palette.panelBorder}`, background: palette.inputBg, color: palette.ink,
            }}
          />
        </div>

        <div style={{ display: "flex", gap: 8 }}>
          <FilterSelect
            value={muscle} onChange={setMuscle} palette={palette}
            placeholder="Grupo muscular"
            options={muscles.map((m) => ({ value: m, label: muscleLabel(m) }))}
          />
          <FilterSelect
            value={equipment} onChange={setEquipment} palette={palette}
            placeholder="Equipamiento"
            options={equipmentOptions.map((e) => ({ value: e, label: equipmentLabel(e) }))}
          />
        </div>

        {activeFilters > 0 && (
          <button
            onClick={() => { setMuscle(""); setEquipment(""); }}
            style={{
              display: "flex", alignItems: "center", gap: 5, marginTop: 9, padding: 0,
              background: "none", border: "none", color: palette.accent, fontSize: 12, fontWeight: 700, cursor: "pointer",
            }}
          >
            <SlidersHorizontal size={12} /> Quitar filtros ({activeFilters})
          </button>
        )}
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: "12px 16px 24px", display: "flex", flexDirection: "column", gap: 8 }}>
        {results.map((r) => {
          const already = alreadyAddedIds.includes(r.id);
          return (
            <button
              key={r.id} onClick={() => { if (!already) onPick(r); }} disabled={already}
              style={{
                display: "flex", alignItems: "center", gap: 12, width: "100%", textAlign: "left", padding: "10px 12px",
                borderRadius: 14, background: already ? `${palette.accent}18` : palette.inputBg,
                border: `1px solid ${palette.panelBorder}`, color: palette.ink, cursor: already ? "default" : "pointer",
                opacity: already ? 0.5 : 1,
              }}
            >
              <GifThumb src={r.media_url} size={44} />
              <span style={{ flex: 1, minWidth: 0 }}>
                <span style={{ display: "block", fontSize: 14, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.name}</span>
                <span style={{ display: "block", fontSize: 11.5, color: palette.inkDim, marginTop: 2 }}>
                  {[r.muscle_group ? muscleLabel(r.muscle_group) : null, r.equipment ? equipmentLabel(r.equipment) : null].filter(Boolean).join(" · ")}
                </span>
              </span>
              {!already && <Plus size={17} color={palette.accent} style={{ flexShrink: 0 }} />}
            </button>
          );
        })}

        {!loading && results.length === 0 && (
          <p style={{ fontSize: 13, color: palette.inkDim, textAlign: "center", padding: 28 }}>
            Ningún ejercicio coincide con esos filtros.
          </p>
        )}
        {loading && results.length === 0 && (
          <p style={{ fontSize: 13, color: palette.inkDim, textAlign: "center", padding: 28 }}>Buscando...</p>
        )}
      </div>
    </div>,
    document.body,
  );
}

function FilterSelect({
  value, onChange, options, placeholder, palette,
}: {
  value: string; onChange: (v: string) => void;
  options: { value: string; label: string }[]; placeholder: string; palette: Palette;
}) {
  const active = !!value;
  return (
    <select
      value={value} onChange={(e) => onChange(e.target.value)}
      style={{
        flex: 1, minWidth: 0, padding: "9px 10px", borderRadius: 11, fontSize: 13, fontFamily: "inherit", cursor: "pointer",
        border: `1px solid ${active ? palette.accent : palette.panelBorder}`,
        background: active ? `${palette.accent}18` : palette.inputBg,
        color: active ? palette.accent : palette.ink,
        fontWeight: active ? 700 : 400,
      }}
    >
      <option value="">{placeholder}</option>
      {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  );
}
