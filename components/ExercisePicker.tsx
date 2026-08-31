"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { usePalette } from "@/lib/theme";
import { muscleLabel } from "@/lib/muscleLabels";
import { POPULAR_EXERCISE_KEYWORDS } from "@/lib/popularExercises";
import { Search, Plus } from "lucide-react";
import Modal from "@/components/Modal";
import GifThumb from "@/components/GifThumb";

export type PickableExercise = {
  id: string;
  name: string;
  media_url?: string;
  measurement_type: string;
  muscle_group?: string;
  equipment?: string;
};

/**
 * Buscador liviano de ejercicios: solo consulta la tabla `exercises` cuando se abre,
 * sin traerse rutinas, récords ni historial. Pensado para agregar sobre la marcha.
 */
export default function ExercisePicker({
  onPick, onClose, alreadyAddedIds = [],
}: {
  onPick: (exercise: PickableExercise) => void;
  onClose: () => void;
  alreadyAddedIds?: string[];
}) {
  const palette = usePalette();
  const supabase = createClient();
  const [search, setSearch] = useState("");
  const [results, setResults] = useState<PickableExercise[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    const t = setTimeout(async () => {
      let query = supabase.from("exercises").select("id, name, media_url, measurement_type, muscle_group, equipment");
      query = search
        ? query.ilike("name", `%${search}%`).limit(30)
        : query.or(POPULAR_EXERCISE_KEYWORDS.map((k) => `name.ilike.%${k}%`).join(",")).limit(15);
      const { data } = await query;
      if (cancelled) return;
      setResults((data ?? []) as PickableExercise[]);
      setLoading(false);
    }, 250);
    return () => { cancelled = true; clearTimeout(t); };
  }, [search]);

  return (
    <Modal title="Agregar ejercicio" onClose={onClose}>
      <div style={{ position: "relative", marginBottom: 12 }}>
        <Search size={14} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: palette.inkDim }} />
        <input
          value={search} onChange={(e) => setSearch(e.target.value)} autoFocus
          placeholder="Buscar ejercicio..."
          style={{
            width: "100%", padding: "9px 12px 9px 32px", borderRadius: 10, fontSize: 13.5, fontFamily: "inherit",
            border: `1px solid ${palette.panelBorder}`, background: palette.inputBg, color: palette.ink,
          }}
        />
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 6, maxHeight: "48vh", overflowY: "auto" }}>
        {results.map((r) => {
          const already = alreadyAddedIds.includes(r.id);
          return (
            <button
              key={r.id} onClick={() => { if (!already) onPick(r); }} disabled={already}
              style={{
                display: "flex", alignItems: "center", gap: 10, width: "100%", textAlign: "left", padding: "8px 10px",
                borderRadius: 10, background: already ? `${palette.accent}18` : palette.inputBg,
                border: `1px solid ${palette.panelBorder}`, color: palette.ink, cursor: already ? "default" : "pointer",
                opacity: already ? 0.5 : 1,
              }}
            >
              <GifThumb src={r.media_url} size={34} />
              <span style={{ flex: 1, minWidth: 0 }}>
                <span style={{ display: "block", fontSize: 13, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.name}</span>
                {r.muscle_group && <span style={{ display: "block", fontSize: 11, color: palette.inkDim }}>{muscleLabel(r.muscle_group)}</span>}
              </span>
              {!already && <Plus size={15} color={palette.accent} style={{ flexShrink: 0 }} />}
            </button>
          );
        })}

        {!loading && results.length === 0 && (
          <p style={{ fontSize: 12.5, color: palette.inkDim, textAlign: "center", padding: 18 }}>Sin resultados</p>
        )}
        {loading && results.length === 0 && (
          <p style={{ fontSize: 12.5, color: palette.inkDim, textAlign: "center", padding: 18 }}>Buscando...</p>
        )}
      </div>
    </Modal>
  );
}
