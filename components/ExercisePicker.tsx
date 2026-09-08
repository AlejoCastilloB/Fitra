"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { usePalette, type Palette } from "@/lib/theme";
import { muscleLabel } from "@/lib/muscleLabels";
import { equipmentLabel } from "@/lib/equipmentLabels";
import { useExerciseSearch, useExerciseFilterOptions, type FoundExercise } from "@/lib/useExerciseSearch";
import { Search, Plus, X, SlidersHorizontal, ArrowLeftRight } from "lucide-react";
import GifThumb from "@/components/GifThumb";

export type PickableExercise = FoundExercise;

/**
 * Buscador de ejercicios a pantalla completa: nombre + grupo muscular + equipamiento,
 * combinables entre sí. Solo consulta la tabla `exercises`.
 */
export default function ExercisePicker({
  onPick, onClose, addedCounts = {}, mode = "add", subtitle,
}: {
  onPick: (exercise: PickableExercise) => void;
  onClose: () => void;
  /** Cuántas veces está ya cada ejercicio. Solo informa: repetir está permitido. */
  addedCounts?: Record<string, number>;
  /** "replace" cambia el título y el icono: no se agrega uno más, se cambia el que hay. */
  mode?: "add" | "replace";
  /** Una línea bajo el título, para recordar qué se está cambiando y por qué. */
  subtitle?: string;
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
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10, marginBottom: 12 }}>
          <div style={{ minWidth: 0 }}>
            <h2 style={{ fontSize: 17, fontWeight: 700 }}>{mode === "replace" ? "Reemplazar ejercicio" : "Agregar ejercicio"}</h2>
            {subtitle && (
              <p style={{ fontSize: 11.5, color: palette.inkDim, marginTop: 3, lineHeight: 1.45 }}>{subtitle}</p>
            )}
          </div>
          <button onClick={onClose} aria-label="Cerrar" style={{ background: "none", border: "none", color: palette.inkDim, cursor: "pointer", padding: 4, flexShrink: 0 }}>
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
          const veces = addedCounts[r.id] ?? 0;
          return (
            <button
              key={r.id} onClick={() => onPick(r)}
              style={{
                display: "flex", alignItems: "center", gap: 12, width: "100%", textAlign: "left", padding: "10px 12px",
                borderRadius: 14, background: veces > 0 ? `${palette.accent}18` : palette.inputBg,
                border: `1px solid ${palette.panelBorder}`, color: palette.ink, cursor: "pointer",
              }}
            >
              <GifThumb src={r.media_url} size={44} />
              <span style={{ flex: 1, minWidth: 0 }}>
                <span style={{ display: "block", fontSize: 14, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.name}</span>
                <span style={{ display: "block", fontSize: 11.5, color: palette.inkDim, marginTop: 2 }}>
                  {[r.muscle_group ? muscleLabel(r.muscle_group) : null, r.equipment ? equipmentLabel(r.equipment) : null].filter(Boolean).join(" · ")}
                </span>
              </span>
              {veces > 0 && (
                <span style={{
                  flexShrink: 0, fontSize: 11, fontWeight: 700, color: palette.accent,
                  background: `${palette.accent}22`, borderRadius: 999, padding: "2px 8px",
                }}>×{veces}</span>
              )}
              {mode === "replace"
                ? <ArrowLeftRight size={17} color={palette.accent} style={{ flexShrink: 0 }} />
                : <Plus size={17} color={palette.accent} style={{ flexShrink: 0 }} />}
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
