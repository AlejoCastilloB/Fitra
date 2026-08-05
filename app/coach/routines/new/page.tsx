"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { palette, glassPanel } from "@/lib/theme";
import { Search, Plus, Trash2, X } from "lucide-react";
import GifThumb from "@/components/GifThumb";

type SetRow = { set_type: string; reps?: number; weight?: number; time_sec?: number; distance_m?: number };
type PickedExercise = { id: string; name: string; media_url?: string; measurement_type: string; sets: SetRow[] };

function emptySet(measurementType: string): SetRow {
  if (measurementType === "time") return { set_type: "normal", time_sec: 30 };
  if (measurementType === "time_distance") return { set_type: "normal", time_sec: 60, distance_m: 200 };
  if (measurementType === "distance") return { set_type: "normal", distance_m: 100 };
  return { set_type: "normal", reps: 10, weight: 0 };
}

export default function NewRoutinePage() {
  const supabase = createClient();
  const router = useRouter();

  const [name, setName] = useState("");
  const [clientId, setClientId] = useState("");
  const [clients, setClients] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [results, setResults] = useState<any[]>([]);
  const [picked, setPicked] = useState<PickedExercise[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: auth } = await supabase.auth.getUser();
      const { data } = await supabase
        .from("clients")
        .select("user_id, users(email)")
        .eq("trainer_id", auth.user!.id);
      setClients(data ?? []);
    })();
  }, []);

  useEffect(() => {
    if (search.length < 2) { setResults([]); return; }
    const t = setTimeout(async () => {
      const { data } = await supabase
        .from("exercises")
        .select("id, name, measurement_type, muscle_group, media_url")
        .ilike("name", `%${search}%`)
        .limit(8);
      setResults(data ?? []);
    }, 250);
    return () => clearTimeout(t);
  }, [search]);

  function addExercise(ex: any) {
    if (picked.some((p) => p.id === ex.id)) return;
    setPicked([...picked, { id: ex.id, name: ex.name, media_url: ex.media_url, measurement_type: ex.measurement_type, sets: [emptySet(ex.measurement_type)] }]);
    setSearch("");
    setResults([]);
  }

  function removeExercise(id: string) {
    setPicked(picked.filter((p) => p.id !== id));
  }

  function addSet(exId: string) {
    setPicked(picked.map((p) => p.id === exId ? { ...p, sets: [...p.sets, emptySet(p.measurement_type)] } : p));
  }

  function removeSet(exId: string, idx: number) {
    setPicked(picked.map((p) => p.id === exId ? { ...p, sets: p.sets.filter((_, i) => i !== idx) } : p));
  }

  function updateSet(exId: string, idx: number, field: string, value: any) {
    setPicked(picked.map((p) => p.id === exId
      ? { ...p, sets: p.sets.map((s, i) => i === idx ? { ...s, [field]: value } : s) }
      : p));
  }

  async function handleSave() {
    if (!name || picked.length === 0) return;
    setSaving(true);
    const { data: auth } = await supabase.auth.getUser();

    const { data: routine, error } = await supabase.from("routines").insert({
      trainer_id: auth.user!.id,
      created_by: auth.user!.id,
      client_id: clientId || null,
      source: "trainer",
      name,
    }).select().single();

    if (error || !routine) { setSaving(false); return; }

    const rows = picked.map((p, i) => ({
      routine_id: routine.id,
      exercise_id: p.id,
      order_index: i,
      target_sets: p.sets,
    }));

    await supabase.from("routine_exercises").insert(rows);
    router.push("/coach/routines");
  }

  return (
    <div style={{ maxWidth: 640 }}>
      <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 20 }}>Nueva rutina</h1>

      <div style={{ display: "flex", flexDirection: "column", gap: 14, marginBottom: 24 }}>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Nombre de la rutina (ej: Push Day A)"
          style={inputStyle}
        />
        <select value={clientId} onChange={(e) => setClientId(e.target.value)} style={inputStyle}>
          <option value="">Plantilla (sin asignar todavía)</option>
          {clients.map((c) => (
            <option key={c.user_id} value={c.user_id}>{c.users?.email}</option>
          ))}
        </select>
      </div>

      <div style={{ position: "relative", marginBottom: 16 }}>
        <Search size={15} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: palette.inkDim }} />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar ejercicio para agregar..."
          style={{ ...inputStyle, paddingLeft: 36 }}
        />
        {results.length > 0 && (
          <div style={{ ...glassPanel, position: "absolute", top: "110%", left: 0, right: 0, zIndex: 10, maxHeight: 260, overflowY: "auto" }}>
            {results.map((r) => (
              <button
                key={r.id}
                onClick={() => addExercise(r)}
                style={{
                  display: "flex", alignItems: "center", gap: 10, width: "100%", textAlign: "left", padding: "8px 14px",
                  background: "none", border: "none", color: palette.ink, cursor: "pointer", fontSize: 13.5,
                }}
              >
                <GifThumb src={r.media_url} size={32} />
                <span>{r.name} <span style={{ color: palette.inkDim, fontSize: 11.5 }}>· {r.muscle_group}</span></span>
              </button>
            ))}
          </div>
        )}
      </div>

      {picked.length === 0 ? (
        <div style={{ ...glassPanel, padding: 24, textAlign: "center", color: palette.inkDim, marginBottom: 20 }}>
          Buscá y agregá ejercicios para armar la rutina.
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 14, marginBottom: 20 }}>
          {picked.map((ex) => (
            <div key={ex.id} style={{ ...glassPanel, padding: 16 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <GifThumb src={ex.media_url} size={36} />
                  <span style={{ fontWeight: 600, fontSize: 14 }}>{ex.name}</span>
                </div>
                <button onClick={() => removeExercise(ex.id)} style={{ background: "none", border: "none", color: palette.inkDim, cursor: "pointer" }}>
                  <X size={16} />
                </button>
              </div>

              {ex.sets.map((s, idx) => (
                <div key={idx} style={{ display: "flex", gap: 6, alignItems: "center", marginBottom: 6, flexWrap: "wrap" }}>
                  <select value={s.set_type} onChange={(e) => updateSet(ex.id, idx, "set_type", e.target.value)} style={smallSelect}>
                    <option value="warmup">Calentamiento</option>
                    <option value="normal">Normal</option>
                    <option value="dropset">Dropset</option>
                    <option value="failure">Al fallo</option>
                  </select>

                  {(ex.measurement_type === "reps_weight") && (
                    <>
                      <input type="number" value={s.reps ?? ""} onChange={(e) => updateSet(ex.id, idx, "reps", +e.target.value)} placeholder="reps" style={smallInput} />
                      <input type="number" value={s.weight ?? ""} onChange={(e) => updateSet(ex.id, idx, "weight", +e.target.value)} placeholder="kg" style={smallInput} />
                    </>
                  )}
                  {(ex.measurement_type === "time" || ex.measurement_type === "time_distance") && (
                    <input type="number" value={s.time_sec ?? ""} onChange={(e) => updateSet(ex.id, idx, "time_sec", +e.target.value)} placeholder="seg" style={smallInput} />
                  )}
                  {(ex.measurement_type === "distance" || ex.measurement_type === "time_distance") && (
                    <input type="number" value={s.distance_m ?? ""} onChange={(e) => updateSet(ex.id, idx, "distance_m", +e.target.value)} placeholder="metros" style={smallInput} />
                  )}

                  <button onClick={() => removeSet(ex.id, idx)} style={{ background: "none", border: "none", color: palette.inkDim, cursor: "pointer" }}>
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}

              <button onClick={() => addSet(ex.id)} style={{
                display: "flex", alignItems: "center", gap: 5, background: "none", border: "none",
                color: palette.accent, fontSize: 12.5, cursor: "pointer", marginTop: 4, padding: 0,
              }}>
                <Plus size={13} /> Agregar serie
              </button>
            </div>
          ))}
        </div>
      )}

      <button onClick={handleSave} disabled={saving || !name || picked.length === 0} style={{
        width: "100%", padding: 13, borderRadius: 12, border: "none",
        background: `linear-gradient(135deg, ${palette.accent}, ${palette.accentDeep})`, color: "#0A0C10",
        fontWeight: 700, fontSize: 14.5, cursor: "pointer", opacity: (saving || !name || picked.length === 0) ? 0.5 : 1,
      }}>
        {saving ? "Guardando..." : "Guardar rutina"}
      </button>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: "100%", padding: "11px 14px", borderRadius: 11, border: `1px solid ${palette.panelBorder}`,
  background: palette.inputBg, color: palette.ink, fontSize: 14, fontFamily: "inherit",
};
const smallInput: React.CSSProperties = {
  width: 64, padding: "6px 8px", borderRadius: 8, border: `1px solid ${palette.panelBorder}`,
  background: palette.inputBg, color: palette.ink, fontSize: 12.5,
};
const smallSelect: React.CSSProperties = { ...smallInput, width: 118 };
