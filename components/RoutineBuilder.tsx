"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { palette, glassPanel } from "@/lib/theme";
import { muscleLabel } from "@/lib/muscleLabels";
import { POPULAR_EXERCISE_KEYWORDS } from "@/lib/popularExercises";
import { getSetBadge } from "@/lib/setBadges";
import { Search, Plus, Trash2, X, GripVertical, Mic, Square, Loader2 } from "lucide-react";
import GifThumb from "@/components/GifThumb";
import AIRoutineGenerator from "@/components/AIRoutineGenerator";
import SetTypePopover from "@/components/SetTypePopover";

type SetRow = { set_type: string; reps?: number; weight?: number; time_sec?: number; distance_m?: number };
type PickedExercise = { id: string; name: string; media_url?: string; measurement_type: string; sets: SetRow[]; notes?: string; supersetWith?: string };

function emptySet(measurementType: string): SetRow {
  if (measurementType === "time") return { set_type: "normal", time_sec: 30 };
  if (measurementType === "time_distance") return { set_type: "normal", time_sec: 60, distance_m: 200 };
  if (measurementType === "distance") return { set_type: "normal", distance_m: 100 };
  return { set_type: "normal", reps: 10, weight: 0 };
}

export default function RoutineBuilder({
  routineId,
  initialName = "",
  initialClientId = "",
  initialNotes = "",
  initialExercises = [],
  initialDays = [],
  role = "trainer",
}: {
  routineId?: string;
  initialName?: string;
  initialClientId?: string;
  initialNotes?: string;
  initialExercises?: PickedExercise[];
  initialDays?: number[];
  role?: "trainer" | "client";
}) {
  const supabase = createClient();
  const router = useRouter();
  const isEditing = !!routineId;

  const [name, setName] = useState(initialName);
  const [clientId, setClientId] = useState(initialClientId);
  const [routineNotes, setRoutineNotes] = useState(initialNotes);
  const [days, setDays] = useState<number[]>(initialDays);
  const [clients, setClients] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [muscleFilter, setMuscleFilter] = useState("");
  const [muscles, setMuscles] = useState<string[]>([]);
  const [results, setResults] = useState<any[]>([]);
  const [picked, setPicked] = useState<PickedExercise[]>(initialExercises);
  const [saving, setSaving] = useState(false);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [openNotesFor, setOpenNotesFor] = useState<string | null>(null);
  const [showAI, setShowAI] = useState(false);
  const [editingType, setEditingType] = useState<{ exId: string; setIdx: number; x: number; y: number } | null>(null);
  const [recordingFor, setRecordingFor] = useState<string | null>(null);
  const [transcribingFor, setTranscribingFor] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  useEffect(() => {
    (async () => {
      const { data: auth } = await supabase.auth.getUser();

      if (role === "trainer") {
        const { data: cli } = await supabase.from("clients").select("user_id, users(email)").eq("trainer_id", auth.user!.id);
        setClients(cli ?? []);
      }

      const { data: mus } = await supabase.from("exercises").select("muscle_group").not("muscle_group", "is", null);
      setMuscles(Array.from(new Set(mus?.map((m) => m.muscle_group))).sort());
    })();
  }, [role]);

  useEffect(() => {
    const t = setTimeout(async () => {
      let query = supabase.from("exercises").select("id, name, measurement_type, muscle_group, media_url");
      if (search) {
        query = query.ilike("name", `%${search}%`).limit(30);
      } else if (muscleFilter) {
        query = query.eq("muscle_group", muscleFilter).limit(30);
      } else {
        query = query.or(POPULAR_EXERCISE_KEYWORDS.map((k) => `name.ilike.%${k}%`).join(",")).limit(15);
      }
      const { data } = await query;
      setResults(data ?? []);
    }, 250);
    return () => clearTimeout(t);
  }, [search, muscleFilter]);

  function addExercise(ex: any) {
    if (picked.some((p) => p.id === ex.id)) return;
    setPicked([...picked, { id: ex.id, name: ex.name, media_url: ex.media_url, measurement_type: ex.measurement_type, sets: [emptySet(ex.measurement_type)], notes: "" }]);
  }

  function removeExercise(id: string) {
    setPicked(picked.filter((p) => p.id !== id));
  }

  function updateExerciseNotes(id: string, notes: string) {
    setPicked(picked.map((p) => p.id === id ? { ...p, notes } : p));
  }

  function addSet(exId: string) {
    setPicked(picked.map((p) => p.id === exId ? { ...p, sets: [...p.sets, emptySet(p.measurement_type)] } : p));
  }

  function removeSet(exId: string, idx: number) {
    setPicked(picked.map((p) => p.id === exId ? { ...p, sets: p.sets.filter((_, i) => i !== idx) } : p));
  }

  function updateSet(exId: string, idx: number, field: string, value: any) {
    setPicked(picked.map((p) => p.id === exId ? { ...p, sets: p.sets.map((s, i) => i === idx ? { ...s, [field]: value } : s) } : p));
  }

  function handleDragStart(idx: number) { setDragIndex(idx); }
  function handleDragOver(e: React.DragEvent, idx: number) {
    e.preventDefault();
    if (dragIndex === null || dragIndex === idx) return;
    const next = [...picked];
    const [moved] = next.splice(dragIndex, 1);
    next.splice(idx, 0, moved);
    setPicked(next);
    setDragIndex(idx);
  }
  function handleDragEnd() { setDragIndex(null); }

  async function toggleNoteRecording(exId: string) {
    if (recordingFor === exId) {
      mediaRecorderRef.current?.stop();
      setRecordingFor(null);
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      audioChunksRef.current = [];
      recorder.ondataavailable = (e) => audioChunksRef.current.push(e.data);
      recorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        setTranscribingFor(exId);
        const reader = new FileReader();
        reader.onload = async () => {
          const base64 = (reader.result as string).split(",")[1];
          const res = await fetch("/api/ai/transcribe-note", {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ audioBase64: base64, audioMimeType: "audio/webm" }),
          });
          const data = await res.json();
          if (res.ok && data.text) updateExerciseNotes(exId, data.text);
          setTranscribingFor(null);
        };
        reader.readAsDataURL(blob);
      };
      recorder.start();
      mediaRecorderRef.current = recorder;
      setRecordingFor(exId);
    } catch {}
  }

  function toggleDay(day: number) {
    setDays((prev) => prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]);
  }

  function handleAIGenerated(result: { name: string; exercises: any[] }) {
    setName(result.name);
    setPicked(result.exercises.map((e: any) => ({
      id: e.id, name: e.name, media_url: e.media_url, measurement_type: e.measurement_type,
      sets: e.sets, notes: "",
    })));
    setShowAI(false);
  }

  async function handleSave() {
    if (!name || picked.length === 0) return;
    setSaving(true);
    const { data: auth } = await supabase.auth.getUser();

    let currentRoutineId = routineId;

    if (isEditing) {
      await supabase.from("routines").update({
        name, client_id: role === "client" ? auth.user!.id : (clientId || null), notes: routineNotes, days_of_week: days,
      }).eq("id", routineId);
      await supabase.from("routine_exercises").delete().eq("routine_id", routineId);
    } else {
      const { data: routine, error } = await supabase.from("routines").insert({
        trainer_id: role === "trainer" ? auth.user!.id : null,
        created_by: auth.user!.id,
        client_id: role === "client" ? auth.user!.id : (clientId || null),
        source: role,
        name,
        notes: routineNotes,
        days_of_week: days,
      }).select().single();

      if (error || !routine) { setSaving(false); return; }
      currentRoutineId = routine.id;
    }

    const rows = picked.map((p, i) => ({
      routine_id: currentRoutineId,
      exercise_id: p.id,
      order_index: i,
      target_sets: p.sets,
      notes: p.notes || null,
    }));

    await supabase.from("routine_exercises").insert(rows);
    router.push(role === "client" ? "/app/routines" : "/coach/routines");
  }

  return (
    <div style={{ display: "grid", gridTemplateColumns: "260px 1fr 260px", gap: 20, alignItems: "start" }}>

      {/* ── biblioteca ── */}
      <div style={{ position: "sticky", top: 20 }}>
        <h2 style={sectionTitle}>Biblioteca</h2>

        <div style={{ position: "relative", marginBottom: 8 }}>
          <Search size={14} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: palette.inkDim }} />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar..." style={{ ...inputStyle, paddingLeft: 32, fontSize: 13 }} />
        </div>

        <select value={muscleFilter} onChange={(e) => setMuscleFilter(e.target.value)} style={{ ...inputStyle, fontSize: 12.5, marginBottom: 14 }}>
          <option value="">Todos los músculos</option>
          {muscles.map((m) => <option key={m} value={m}>{muscleLabel(m)}</option>)}
        </select>

        <div style={{ display: "flex", flexDirection: "column", gap: 6, maxHeight: "calc(100vh - 220px)", overflowY: "auto" }}>
          {results.map((r) => {
            const already = picked.some((p) => p.id === r.id);
            return (
              <button key={r.id} onClick={() => addExercise(r)} disabled={already} style={{
                display: "flex", alignItems: "center", gap: 8, width: "100%", textAlign: "left", padding: "6px 8px",
                borderRadius: 10, background: already ? `${palette.accent}18` : palette.inputBg,
                border: `1px solid ${palette.panelBorder}`, color: palette.ink, cursor: already ? "default" : "pointer",
                fontSize: 12.5, opacity: already ? 0.5 : 1,
              }}>
                <GifThumb src={r.media_url} size={28} />
                <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.name}</span>
                {!already && <Plus size={13} color={palette.accent} style={{ flexShrink: 0 }} />}
              </button>
            );
          })}
          {results.length === 0 && <p style={{ fontSize: 12, color: palette.inkDim, textAlign: "center", padding: 12 }}>Sin resultados</p>}
        </div>
      </div>

      {/* ── rutina editable ── */}
      <div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
          <h2 style={{ ...sectionTitle, marginBottom: 0 }}>Rutina {picked.length > 0 && `· ${picked.length} ejercicios`}</h2>
          <button onClick={() => setShowAI(true)} style={{
            display: "flex", alignItems: "center", gap: 6, padding: "7px 12px", borderRadius: 10,
            border: `1px solid ${palette.accent}55`, background: `${palette.accent}18`, color: palette.accent,
            fontSize: 12, fontWeight: 700, cursor: "pointer",
          }}>
            ✨ IA de Alejo
          </button>
        </div>

        {picked.length === 0 ? (
          <div style={{ ...glassPanel, padding: 32, textAlign: "center", color: palette.inkDim }}>
            Agrega ejercicios desde la biblioteca de la izquierda o pídele a la IA de Alejo que arme la rutina.
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {picked.map((ex, idx) => (
              <div key={ex.id} draggable onDragStart={() => handleDragStart(idx)} onDragOver={(e) => handleDragOver(e, idx)} onDragEnd={handleDragEnd}
                style={{ ...glassPanel, padding: 14, opacity: dragIndex === idx ? 0.4 : 1, cursor: "grab" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <GripVertical size={15} color={palette.inkDim} />
                    <GifThumb src={ex.media_url} size={34} />
                    <span style={{ fontWeight: 600, fontSize: 13.5 }}>{ex.name}</span>
                  </div>
                                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 8 }}>
                  {picked.filter((p) => p.id !== ex.id).map((other) => (
                    <button key={other.id} onClick={() => setPicked(picked.map((p) => p.id === ex.id ? { ...p, supersetWith: p.supersetWith === other.id ? undefined : other.id } : p))} style={{
                      fontSize: 10.5, padding: "4px 9px", borderRadius: 999, cursor: "pointer", fontWeight: 600,
                      border: `1px solid ${ex.supersetWith === other.id ? "#C77DFF" : palette.panelBorder}`,
                      background: ex.supersetWith === other.id ? "#C77DFF22" : palette.inputBg,
                      color: ex.supersetWith === other.id ? "#C77DFF" : palette.inkDim,
                    }}>
                      🔗 {ex.supersetWith === other.id ? "Vinculado con" : "Vincular con"} {other.name}
                    </button>
                  ))}
                </div>

                  <div style={{ display: "flex", gap: 10 }}>
                    {role === "client" && (
                  <div style={{ display: "flex", gap: 10 }}>
                    {role === "client" && (
                      <button onClick={() => setOpenNotesFor(openNotesFor === ex.id ? null : ex.id)} style={{
                        background: "none", border: "none", cursor: "pointer",
                        color: ex.notes ? palette.accent : palette.inkDim, fontSize: 11, fontWeight: 700,
                      }}>
                        {ex.notes ? "Nota ✓" : "+ Nota"}
                      </button>
                    )}
                    <button onClick={() => removeExercise(ex.id)} style={{ background: "none", border: "none", color: palette.inkDim, cursor: "pointer" }}>
                      <X size={16} />
                    </button>
                  </div>
                </div>

                {role === "trainer" && (
                  <div style={{ marginBottom: 10 }}>
                    <div style={{ position: "relative" }}>
                      <textarea
                        value={ex.notes}
                        onChange={(e) => updateExerciseNotes(ex.id, e.target.value)}
                        placeholder="Notas para el cliente: técnica, tempo, foco..."
                        style={{ ...inputStyle, minHeight: 50, resize: "vertical", fontSize: 12.5, paddingRight: 38 }}
                      />
                      <button
                        onClick={() => toggleNoteRecording(ex.id)}
                        title="Díselo a la IA para que lo escriba por ti"
                        style={{
                          position: "absolute", right: 8, top: 8, width: 26, height: 26, borderRadius: 8, border: "none",
                          background: recordingFor === ex.id ? "#f8717122" : `${palette.accent}18`,
                          color: recordingFor === ex.id ? "#f87171" : palette.accent, cursor: "pointer",
                          display: "flex", alignItems: "center", justifyContent: "center",
                        }}
                      >
                        {transcribingFor === ex.id ? <Loader2 size={13} /> : recordingFor === ex.id ? <Square size={12} /> : <Mic size={13} />}
                      </button>
                    </div>
                    <p style={{ fontSize: 10, color: palette.inkDim, marginTop: 4 }}>
                      {transcribingFor === ex.id ? "La IA de Alejo está escribiendo tu nota..." : "🎙️ Díselo a la IA para que lo escriba por ti"}
                    </p>
                  </div>
                )}

                {role === "client" && openNotesFor === ex.id && (
                  <textarea
                    value={ex.notes}
                    onChange={(e) => updateExerciseNotes(ex.id, e.target.value)}
                    placeholder="Ej: mantener espalda recta, tempo 2-1-2, foco en la fase excéntrica..."
                    style={{ ...inputStyle, minHeight: 50, resize: "vertical", fontSize: 12.5, marginBottom: 10 }}
                  />
                )}

                {ex.sets.map((s, i) => {
                  const badge = getSetBadge(ex.sets, i, palette.accent);
                  return (
                  <div key={i} style={{ display: "flex", gap: 6, alignItems: "center", marginBottom: 6, flexWrap: "wrap" }}>
                    <button onClick={(e) => { const r = e.currentTarget.getBoundingClientRect(); setEditingType({ exId: ex.id, setIdx: i, x: r.left, y: r.bottom }); }} style={{
                      width: 26, height: 26, borderRadius: 8, border: "none", cursor: "pointer", fontWeight: 700, fontSize: 11,
                      color: badge.color, background: `${badge.color}22`, flexShrink: 0,
                    }}>{badge.text}</button>
                    {ex.measurement_type === "reps_weight" && (
                      <>
                        <input type="number" value={s.reps ?? ""} onChange={(e) => updateSet(ex.id, i, "reps", +e.target.value)} placeholder="reps" style={smallInput} />
                        <input type="number" value={s.weight ?? ""} onChange={(e) => updateSet(ex.id, i, "weight", +e.target.value)} placeholder="kg" style={smallInput} />
                      </>
                    )}
                    {(ex.measurement_type === "time" || ex.measurement_type === "time_distance") && (
                      <input type="number" value={s.time_sec ?? ""} onChange={(e) => updateSet(ex.id, i, "time_sec", +e.target.value)} placeholder="seg" style={smallInput} />
                    )}
                    {(ex.measurement_type === "distance" || ex.measurement_type === "time_distance") && (
                      <input type="number" value={s.distance_m ?? ""} onChange={(e) => updateSet(ex.id, i, "distance_m", +e.target.value)} placeholder="m" style={smallInput} />
                    )}
                    <button onClick={() => removeSet(ex.id, i)} style={{ background: "none", border: "none", color: palette.inkDim, cursor: "pointer" }}>
                      <Trash2 size={13} />
                    </button>
                  </div>
                  );
                })}

                <button onClick={() => addSet(ex.id)} style={{ display: "flex", alignItems: "center", gap: 5, background: "none", border: "none", color: palette.accent, fontSize: 12, cursor: "pointer", marginTop: 4, padding: 0 }}>
                  <Plus size={12} /> Agregar serie
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── detalles + guardar ── */}
      <div style={{ position: "sticky", top: 20, display: "flex", flexDirection: "column", gap: 14 }}>
        <h2 style={sectionTitle}>Detalles</h2>

        <label style={fieldLabel}>
          Nombre
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ej: Push Day A" style={inputStyle} />
        </label>

        {role === "trainer" && (
          <label style={fieldLabel}>
            Asignar a
            <select value={clientId} onChange={(e) => setClientId(e.target.value)} style={inputStyle}>
              <option value="">Plantilla (sin asignar)</option>
              {clients.map((c) => <option key={c.user_id} value={c.user_id}>{c.users?.email}</option>)}
            </select>
          </label>
        )}

        <label style={fieldLabel}>
          Días de la semana (opcional)
          <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
            {["D", "L", "M", "M", "J", "V", "S"].map((label, i) => (
              <button key={i} onClick={() => toggleDay(i)} style={{
                width: 30, height: 30, borderRadius: 9, fontSize: 11.5, fontWeight: 700, cursor: "pointer",
                border: `1px solid ${days.includes(i) ? palette.accent : palette.panelBorder}`,
                background: days.includes(i) ? `${palette.accent}22` : palette.inputBg,
                color: days.includes(i) ? palette.accent : palette.inkDim,
              }}>{label}</button>
            ))}
          </div>
        </label>

        <label style={fieldLabel}>
          Notas generales de la rutina
          <textarea value={routineNotes} onChange={(e) => setRoutineNotes(e.target.value)} placeholder="Ej: enfocada en fuerza, progresar peso cada 2 semanas" style={{ ...inputStyle, minHeight: 70, resize: "vertical" }} />
        </label>

        <div style={{ ...glassPanel, padding: 14 }}>
          <div style={{ fontSize: 11, color: palette.inkDim, marginBottom: 4 }}>Resumen</div>
          <div style={{ fontSize: 13 }}>{picked.length} ejercicios</div>
          <div style={{ fontSize: 13 }}>{picked.reduce((sum, p) => sum + p.sets.length, 0)} series totales</div>
        </div>

        <button onClick={handleSave} disabled={saving || !name || picked.length === 0} style={{
          padding: 13, borderRadius: 12, border: "none",
          background: `linear-gradient(135deg, ${palette.accent}, ${palette.accentDeep})`, color: "#0A0C10",
          fontWeight: 700, fontSize: 14, cursor: "pointer", opacity: (saving || !name || picked.length === 0) ? 0.5 : 1,
        }}>
          {saving ? "Guardando..." : isEditing ? "Guardar cambios" : "Guardar rutina"}
        </button>
      </div>

      {showAI && <AIRoutineGenerator onClose={() => setShowAI(false)} onGenerated={handleAIGenerated} />}

      {editingType && (
        <SetTypePopover
          current={picked.find((p) => p.id === editingType.exId)!.sets[editingType.setIdx].set_type}
          x={editingType.x} y={editingType.y}
          onSelect={(type) => updateSet(editingType.exId, editingType.setIdx, "set_type", type)}
          onClose={() => setEditingType(null)}
        />
      )}
    </div>
  );
}

const sectionTitle: React.CSSProperties = { fontSize: 13, fontWeight: 700, color: palette.accent, textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 10 };
const fieldLabel: React.CSSProperties = { display: "flex", flexDirection: "column", gap: 5, fontSize: 12, color: palette.inkDim };
const inputStyle: React.CSSProperties = { width: "100%", padding: "9px 12px", borderRadius: 10, border: `1px solid ${palette.panelBorder}`, background: palette.inputBg, color: palette.ink, fontSize: 13.5, fontFamily: "inherit" };
const smallInput: React.CSSProperties = { width: 60, padding: "6px 8px", borderRadius: 8, border: `1px solid ${palette.panelBorder}`, background: palette.inputBg, color: palette.ink, fontSize: 12 };
