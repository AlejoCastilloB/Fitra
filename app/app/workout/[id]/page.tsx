"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { palette, glassPanel } from "@/lib/theme";
import { muscleLabel } from "@/lib/muscleLabels";
import { useWorkoutSession, LiveExercise } from "@/lib/workoutSession";
import { Check, X, Trophy, Flame, ChevronDown } from "lucide-react";
import GifThumb from "@/components/GifThumb";
import SwipeableRow from "@/components/SwipeableRow";
import SetTypeSheet from "@/components/SetTypeSheet";
import RestTimerRing from "@/components/RestTimerRing";
import { equipmentLabel } from "@/lib/equipmentLabels";
import { getSetBadge } from "@/lib/setBadges";

const REST_SECONDS = 90;

export default function WorkoutPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const supabase = createClient();
  const { session, now, startSession, toggleSetDone, updateSet, removeSet, skipRest, clearSession } = useWorkoutSession();

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [timerSound, setTimerSound] = useState("clasico");
  const [editingType, setEditingType] = useState<{ exIdx: number; setIdx: number } | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [finished, setFinished] = useState<null | { volume: number; durationSec: number; prs: string[] }>(null);

  useEffect(() => {
    if (session && session.routineId === id) { setLoading(false); return; } // ya hay sesión en curso para esta rutina

    (async () => {
      const { data: re, error: reError } = await supabase
        .from("routine_exercises")
        .select("order_index, target_sets, notes, exercises(id, name, media_url, measurement_type, description, equipment, muscle_group, instructions)")
        .eq("routine_id", id)
        .order("order_index");

      if (reError) setLoadError(reError.message);

      const { data: routine } = await supabase.from("routines").select("name").eq("id", id).single();

      const { data: auth } = await supabase.auth.getUser();
      const { data: userRow } = await supabase.from("users").select("timer_sound").eq("id", auth.user!.id).single();
      if (userRow) setTimerSound(userRow.timer_sound);

      const built: LiveExercise[] = (re ?? []).map((r: any) => ({
        id: r.exercises.id, name: r.exercises.name, media_url: r.exercises.media_url,
        measurement_type: r.exercises.measurement_type, notes: r.notes,
        description: r.exercises.description, equipment: r.exercises.equipment,
        muscle_group: r.exercises.muscle_group, instructions: r.exercises.instructions,
        sets: (r.target_sets ?? []).map((s: any) => ({ ...s, done: false })),
      }));

      startSession(id, routine?.name ?? "Entrenamiento", built);
      setLoading(false);
    })();
  }, [id]);

  useEffect(() => {
    if (session?.restEndAt && session.restEndAt - now <= 0) {
      playBeep();
      if (navigator.vibrate) navigator.vibrate([200, 100, 200]);
    }
  }, [session?.restEndAt, now]);

  function playBeep() {
    const sounds: Record<string, { freq: number; pattern: number[] }> = {
      clasico: { freq: 880, pattern: [0.35] }, suave: { freq: 660, pattern: [0.5] },
      energico: { freq: 990, pattern: [0.12, 0.12, 0.12] },
    };
    const s = sounds[timerSound] || sounds.clasico;
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      let t = ctx.currentTime;
      s.pattern.forEach((dur) => {
        const osc = ctx.createOscillator(); const gain = ctx.createGain();
        osc.frequency.value = s.freq; osc.connect(gain); gain.connect(ctx.destination);
        gain.gain.setValueAtTime(0.15, t); osc.start(t); osc.stop(t + dur); t += dur + 0.08;
      });
    } catch {}
  }

  async function finishWorkout() {
    if (!session) return;
    const { data: auth } = await supabase.auth.getUser();
    const uid = auth.user!.id;
    const durationSec = Math.round((Date.now() - session.startedAt) / 1000);

    let totalVolume = 0;
    const prsHit: string[] = [];

    const { data: workoutLog } = await supabase.from("workout_logs").insert({
      client_id: uid, routine_id: id, duration_sec: durationSec, total_volume: 0,
    }).select().single();

    for (const ex of session.exercises) {
      let bestWeight = 0;
      const rows = ex.sets.filter((s) => s.done).map((s, i) => {
        if (s.weight && s.reps) { totalVolume += s.weight * s.reps; if (s.weight > bestWeight) bestWeight = s.weight; }
        return {
          workout_log_id: workoutLog!.id, exercise_id: ex.id, set_number: i + 1,
          weight: s.weight ?? null, reps: s.reps ?? null, time_sec: s.time_sec ?? null,
          distance_m: s.distance_m ?? null, set_type: s.set_type,
        };
      });
      if (rows.length > 0) await supabase.from("set_logs").insert(rows);

      if (bestWeight > 0) {
        const { data: prevPr } = await supabase.from("personal_records").select("value").eq("client_id", uid).eq("exercise_id", ex.id).eq("type", "1rm").order("value", { ascending: false }).limit(1).single();
        if (!prevPr || bestWeight > prevPr.value) {
          await supabase.from("personal_records").insert({ client_id: uid, exercise_id: ex.id, type: "1rm", value: bestWeight });
          prsHit.push(ex.name);
        }
      }
    }

    await supabase.from("workout_logs").update({ total_volume: totalVolume }).eq("id", workoutLog!.id);

    const { data: streakRow } = await supabase.from("streaks").select("*").eq("client_id", uid).single();
    if (streakRow) await supabase.from("streaks").update({ current_weeks: streakRow.current_weeks + 1, last_workout_date: new Date().toISOString() }).eq("client_id", uid);
    else await supabase.from("streaks").insert({ client_id: uid, current_weeks: 1, last_workout_date: new Date().toISOString() });

    setFinished({ volume: totalVolume, durationSec, prs: prsHit });
    clearSession();
  }

  if (loading) return <p style={{ color: palette.inkDim, textAlign: "center", marginTop: 60 }}>Cargando entrenamiento...</p>;

  if (finished) {
    return <SummaryScreen routineName={session?.routineName ?? "Entrenamiento"} volume={finished.volume} durationSec={finished.durationSec} prs={finished.prs} onDone={() => router.push("/app")} />;
  }

  if (!session || session.exercises.length === 0) return (
    <div style={{ textAlign: "center", marginTop: 60, padding: "0 20px" }}>
      <p style={{ color: palette.inkDim, marginBottom: 8 }}>Esta rutina no tiene ejercicios disponibles.</p>
      {loadError && <p style={{ color: "#f87171", fontSize: 12, marginBottom: 12, fontFamily: "monospace" }}>{loadError}</p>}
      <button onClick={() => router.push("/app/routines")} style={{ padding: "10px 18px", borderRadius: 10, border: `1px solid ${palette.panelBorder}`, background: palette.inputBg, color: palette.ink, cursor: "pointer" }}>Volver a rutinas</button>
    </div>
  );

  const restLeft = session.restEndAt ? Math.max(0, Math.ceil((session.restEndAt - now) / 1000)) : 0;

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
        <button onClick={() => router.push("/app")} style={{ background: "none", border: "none", color: palette.inkDim, cursor: "pointer" }}><X size={20} /></button>
        <span style={{ fontSize: 14, fontWeight: 700 }}>{session.routineName}</span>
        <span style={{ width: 20 }} />
      </div>

      {restLeft > 0 && <RestTimerRing secondsLeft={restLeft} totalSeconds={REST_SECONDS} onSkip={skipRest} />}

      <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 24 }}>
        {session.exercises.map((ex, exIdx) => {
          const isOpen = expandedId === ex.id;
          const doneInEx = ex.sets.filter((s) => s.done).length;
          return (
            <div key={ex.id} style={{ ...glassPanel, overflow: "hidden" }}>
              <button onClick={() => setExpandedId(isOpen ? null : ex.id)} style={{
                width: "100%", display: "flex", alignItems: "center", gap: 12, padding: 14,
                background: "none", border: "none", cursor: "pointer", textAlign: "left",
              }}>
                {isOpen && ex.media_url ? (
                  <img src={ex.media_url} alt={ex.name} style={{ width: 52, height: 52, borderRadius: 10, objectFit: "cover", flexShrink: 0 }} />
                ) : (
                  <GifThumb src={ex.media_url} size={52} />
                )}
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14.5, fontWeight: 700, color: palette.ink }}>{ex.name}</div>
                  <div style={{ fontSize: 11.5, color: palette.inkDim, marginTop: 2 }}>
                    {muscleLabel(ex.muscle_group)} · {doneInEx}/{ex.sets.length} series
                  </div>
                </div>
                <ChevronDown size={16} color={palette.inkDim} style={{ transform: isOpen ? "rotate(180deg)" : "none", transition: "transform .2s", flexShrink: 0 }} />
              </button>

              {isOpen && (
                <div style={{ padding: "0 14px 14px" }}>
                  {ex.notes && <p style={{ fontSize: 12.5, color: palette.accent, marginBottom: 10 }}>📝 {ex.notes}</p>}
                  {ex.equipment && <InfoLine label="Equipo" value={equipmentLabel(ex.equipment)} />}
                  {ex.description && <InfoLine label="Descripción" value={ex.description} />}
                  {ex.instructions && ex.instructions.length > 0 && (
                    <div style={{ marginTop: 8, marginBottom: 12 }}>
                      <div style={{ fontSize: 10.5, color: palette.accent, fontWeight: 700, textTransform: "uppercase", marginBottom: 4 }}>Técnica</div>
                      <ol style={{ paddingLeft: 16, fontSize: 12, color: palette.inkDim, lineHeight: 1.6 }}>
                        {ex.instructions.map((step, i) => <li key={i}>{step}</li>)}
                      </ol>
                    </div>
                  )}
                </div>
              )}

                            <div style={{ display: "flex", flexDirection: "column", gap: 6, padding: "0 14px 14px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "0 10px", marginBottom: 2 }}>
                  <span style={{ width: 22, fontSize: 9, color: palette.inkDim, textAlign: "center" }}>Serie</span>
                  {ex.measurement_type === "reps_weight" && (
                    <>
                      <span style={{ width: 52, fontSize: 9, color: palette.inkDim, textAlign: "center" }}>Peso</span>
                      <span style={{ width: 52, fontSize: 9, color: palette.inkDim, textAlign: "center" }}>Reps</span>
                    </>
                  )}
                  {(ex.measurement_type === "time" || ex.measurement_type === "time_distance") && (
                    <span style={{ width: 52, fontSize: 9, color: palette.inkDim, textAlign: "center" }}>Segundos</span>
                  )}
                  {(ex.measurement_type === "distance" || ex.measurement_type === "time_distance") && (
                    <span style={{ width: 52, fontSize: 9, color: palette.inkDim, textAlign: "center" }}>Metros</span>
                  )}
                </div>

                {ex.sets.map((s, i) => {
                  const badge = getSetBadge(ex.sets, i, palette.accent);
                  return (
                    <SwipeableRow key={i} rightAction={{ label: "Eliminar", icon: "delete", color: "#c0392b", onClick: () => removeSet(exIdx, i) }}>
                      <div style={{ ...glassPanel, padding: 10, display: "flex", alignItems: "center", gap: 8, opacity: s.done ? 0.55 : 1 }}>
                        <button onClick={() => setEditingType({ exIdx, setIdx: i })} style={{
                          fontSize: 11, color: badge.color, width: 22, height: 22, borderRadius: 7,
                          background: `${badge.color}22`, border: "none", cursor: "pointer", fontWeight: 700, flexShrink: 0,
                        }}>{badge.text}</button>

                        {ex.measurement_type === "reps_weight" && (
                          <>
                            <SetInput value={s.weight} onChange={(v) => updateSet(exIdx, i, "weight", v)} placeholder="kg" />
                            <SetInput value={s.reps} onChange={(v) => updateSet(exIdx, i, "reps", v)} placeholder="reps" />
                          </>
                        )}
                        {(ex.measurement_type === "time" || ex.measurement_type === "time_distance") && (
                          <SetInput value={s.time_sec} onChange={(v) => updateSet(exIdx, i, "time_sec", v)} placeholder="seg" />
                        )}
                        {(ex.measurement_type === "distance" || ex.measurement_type === "time_distance") && (
                          <SetInput value={s.distance_m} onChange={(v) => updateSet(exIdx, i, "distance_m", v)} placeholder="m" />
                        )}

                        <div style={{ flex: 1 }} />
                        <button onClick={() => toggleSetDone(exIdx, i, REST_SECONDS)} style={{
                          width: 28, height: 28, borderRadius: 8, border: `1px solid ${s.done ? "#4ADE80" : palette.panelBorder}`,
                          background: s.done ? "#4ADE80" : "transparent", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer",
                        }}>
                          <Check size={13} color={s.done ? "#0A0C10" : palette.inkDim} />
                        </button>
                      </div>
                    </SwipeableRow>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      <button onClick={finishWorkout} style={{
        width: "100%", padding: 14, borderRadius: 14, border: "none",
        background: `linear-gradient(135deg, ${palette.accent}, ${palette.accentDeep})`, color: "#0A0C10",
        fontWeight: 700, fontSize: 14.5, cursor: "pointer",
      }}>
        Terminar entreno
      </button>

      {editingType && (
        <SetTypeSheet
          current={session.exercises[editingType.exIdx].sets[editingType.setIdx].set_type}
          onSelect={(type) => updateSet(editingType.exIdx, editingType.setIdx, "set_type", type)}
          onClose={() => setEditingType(null)}
        />
      )}
    </div>
  );
}

function InfoLine({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ marginBottom: 8 }}>
      <div style={{ fontSize: 10.5, color: palette.accent, fontWeight: 700, textTransform: "uppercase" }}>{label}</div>
      <div style={{ fontSize: 12.5, color: palette.ink }}>{value}</div>
    </div>
  );
}

function SetInput({ value, onChange, placeholder }: { value?: number; onChange: (v: number) => void; placeholder: string }) {
  return (
    <input type="number" value={value ?? ""} onChange={(e) => onChange(+e.target.value)} placeholder={placeholder}
      style={{ width: 52, padding: "6px 7px", borderRadius: 8, border: `1px solid ${palette.panelBorder}`, background: palette.inputBg, color: palette.ink, fontSize: 12.5, textAlign: "center" }} />
  );
}

function SummaryScreen({ routineName, volume, durationSec, prs, onDone }: { routineName: string; volume: number; durationSec: number; prs: string[]; onDone: () => void }) {
  const minutes = Math.floor(durationSec / 60);

  async function share() {
    const text = `Completé "${routineName}" en FitTrack 💪\n${volume.toLocaleString()} kg de volumen total en ${minutes} min${prs.length ? `\n🏆 ${prs.length} nuevo(s) PR: ${prs.join(", ")}` : ""}`;
    if (navigator.share) await navigator.share({ text });
    else { await navigator.clipboard.writeText(text); alert("Copiado al portapapeles"); }
  }

  return (
    <div style={{ textAlign: "center", paddingTop: 40 }}>
      <div style={{ width: 64, height: 64, borderRadius: "50%", background: `${palette.accent}22`, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 18px", color: palette.accent }}>
        <Flame size={28} />
      </div>
      <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 4 }}>¡Entreno completado!</h1>
      <p style={{ color: palette.inkDim, fontSize: 14, marginBottom: 28 }}>{routineName}</p>

      <div style={{ display: "flex", gap: 10, marginBottom: 20 }}>
        <div style={{ ...glassPanel, flex: 1, padding: 16 }}>
          <div style={{ fontSize: 20, fontWeight: 700 }}>{volume.toLocaleString()} kg</div>
          <div style={{ fontSize: 11, color: palette.inkDim }}>Volumen total</div>
        </div>
        <div style={{ ...glassPanel, flex: 1, padding: 16 }}>
          <div style={{ fontSize: 20, fontWeight: 700 }}>{minutes} min</div>
          <div style={{ fontSize: 11, color: palette.inkDim }}>Duración</div>
        </div>
      </div>

      {prs.length > 0 && (
        <div style={{ ...glassPanel, padding: 16, marginBottom: 20, textAlign: "left", border: `1px solid ${palette.accent}55` }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8, color: palette.accent, fontWeight: 700, fontSize: 13 }}>
            <Trophy size={16} /> Nuevos récords
          </div>
          {prs.map((p) => <div key={p} style={{ fontSize: 13, marginBottom: 3 }}>{p}</div>)}
        </div>
      )}

      <button onClick={share} style={{ width: "100%", padding: 13, borderRadius: 12, border: "none", marginBottom: 10, background: `linear-gradient(135deg, ${palette.accent}, ${palette.accentDeep})`, color: "#0A0C10", fontWeight: 700, fontSize: 14, cursor: "pointer" }}>
        Compartir
      </button>
      <button onClick={onDone} style={{ width: "100%", padding: 13, borderRadius: 12, border: `1px solid ${palette.panelBorder}`, background: "none", color: palette.inkDim, fontSize: 13.5, cursor: "pointer" }}>
        Volver a Hoy
      </button>
    </div>
  );
}
