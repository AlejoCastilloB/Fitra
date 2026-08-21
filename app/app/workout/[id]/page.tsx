"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { palette, glassPanel } from "@/lib/theme";
import { muscleLabel } from "@/lib/muscleLabels";
import { equipmentLabel } from "@/lib/equipmentLabels";
import { getSetBadge } from "@/lib/setBadges";
import { computeStreakUpdate } from "@/lib/streak";
import { supersetColor } from "@/lib/supersetColors";
import { useCurrentUser } from "@/lib/useCurrentUser";
import { useWorkoutSession, LiveExercise } from "@/lib/workoutSession";
import { Check, X, Trophy, Flame, ChevronDown, Trash2, Plus, Timer, Settings } from "lucide-react";
import GifThumb from "@/components/GifThumb";
import SetTypePopover from "@/components/SetTypePopover";
import RestTimerRing from "@/components/RestTimerRing";
import WorkoutSettingsSheet from "@/components/WorkoutSettingsSheet";

export default function WorkoutPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const supabase = createClient();
  const uid = useCurrentUser();
  const { session, now, startSession, toggleSetDone, updateSet, addSet, removeSet, updateExerciseRest, skipRest, clearSession } = useWorkoutSession();

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [timerSound, setTimerSound] = useState("clasico");
  const [editingType, setEditingType] = useState<{ exIdx: number; setIdx: number; x: number; y: number } | null>(null);
  const [editingRestFor, setEditingRestFor] = useState<number | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [finished, setFinished] = useState<null | { volume: number; durationSec: number; prs: string[]; breakdown: Record<string, number> }>(null);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [defaultRest, setDefaultRest] = useState(90);
  const [keepAwake, setKeepAwake] = useState(false);
  const [trackRpe, setTrackRpe] = useState(false);
  const [previousMap, setPreviousMap] = useState<Record<string, Record<number, any>>>({});

  useEffect(() => {
    if (!uid) return;
    if (session && session.routineId === id) { setLoading(false); return; }

    (async () => {
      const { data: re, error: reError } = await supabase
        .from("routine_exercises")
        .select("order_index, target_sets, notes, superset_group, exercises(id, name, media_url, measurement_type, description, equipment, muscle_group, instructions)")
        .eq("routine_id", id)
        .order("order_index");

      if (reError) setLoadError(reError.message);

      const { data: routine } = await supabase.from("routines").select("name").eq("id", id).single();

      const { data: userRow } = await supabase.from("users").select("timer_sound, default_rest_seconds, keep_screen_awake, track_rpe").eq("id", uid).single();
      if (userRow) {
        setTimerSound(userRow.timer_sound);
        setDefaultRest(userRow.default_rest_seconds ?? 90);
        setKeepAwake(userRow.keep_screen_awake ?? false);
        setTrackRpe(userRow.track_rpe ?? false);
      }

      const built: LiveExercise[] = (re ?? []).map((r: any) => ({
        id: r.exercises.id, name: r.exercises.name, media_url: r.exercises.media_url,
        measurement_type: r.exercises.measurement_type, notes: r.notes,
        description: r.exercises.description, equipment: r.exercises.equipment,
        muscle_group: r.exercises.muscle_group, instructions: r.exercises.instructions,
        restSeconds: 90, supersetGroup: r.superset_group,
        sets: (r.target_sets ?? []).map((s: any) => ({ ...s, done: false })),
      }));

      const prevEntries = await Promise.all(built.map(async (ex) => {
        const { data: prevLogs } = await supabase
          .from("set_logs")
          .select("set_number, weight, reps, time_sec, distance_m, workout_log_id, workout_logs!inner(date, client_id)")
          .eq("exercise_id", ex.id)
          .eq("workout_logs.client_id", uid)
          .order("id", { ascending: false })
          .limit(30);

        if (!prevLogs || prevLogs.length === 0) return [ex.id, {}] as const;

        const latestLogId = prevLogs.reduce((latest: any, row: any) =>
          !latest || new Date(row.workout_logs.date) > new Date(latest.workout_logs.date) ? row : latest
        , null)?.workout_log_id;

        const bySet: Record<number, any> = {};
        prevLogs.filter((r: any) => r.workout_log_id === latestLogId).forEach((r: any) => { bySet[r.set_number] = r; });
        return [ex.id, bySet] as const;
      }));
      setPreviousMap(Object.fromEntries(prevEntries));

      startSession(id, routine?.name ?? "Entrenamiento", built);
      setLoading(false);
    })();
  }, [id, uid]);

  useEffect(() => {
    if (!keepAwake || !("wakeLock" in navigator)) return;
    let lock: any;
    (navigator as any).wakeLock.request("screen").then((l: any) => { lock = l; }).catch(() => {});
    return () => { lock?.release?.(); };
  }, [keepAwake]);

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
    if (!session || !uid) return;
    const durationSec = Math.round((Date.now() - session.startedAt) / 1000);

    let totalVolume = 0;
    const prsHit: string[] = [];
    const breakdown: Record<string, number> = { normal: 0, warmup: 0, dropset: 0, failure: 0 };

    const { data: workoutLog } = await supabase.from("workout_logs").insert({
      client_id: uid, routine_id: id, duration_sec: durationSec, total_volume: 0,
    }).select().single();

    for (const ex of session.exercises) {
      let bestWeight = 0;
      const doneSets = ex.sets.filter((s) => s.done);
      doneSets.forEach((s) => { breakdown[s.set_type] = (breakdown[s.set_type] ?? 0) + 1; });

      const rows = doneSets.map((s, i) => {
        if (s.weight && s.reps && s.set_type !== "warmup") {
          totalVolume += s.weight * s.reps;
          if (s.weight > bestWeight) bestWeight = s.weight;
        }
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
    const streakUpdate = computeStreakUpdate(streakRow?.last_workout_date ?? null, streakRow?.current_weeks ?? 0);
    if (streakRow) await supabase.from("streaks").update(streakUpdate).eq("client_id", uid);
    else await supabase.from("streaks").insert({ client_id: uid, ...streakUpdate });

    setFinished({ volume: totalVolume, durationSec, prs: prsHit, breakdown });
    clearSession();
  }

  function cancelWorkout() {
    clearSession();
    router.push("/app");
  }

  if (loading) return <p style={{ color: palette.inkDim, textAlign: "center", marginTop: 60 }}>Cargando entrenamiento...</p>;

  if (finished) {
    return <SummaryScreen routineName={session?.routineName ?? "Entrenamiento"} volume={finished.volume} durationSec={finished.durationSec} prs={finished.prs} breakdown={finished.breakdown} onDone={() => router.push("/app")} />;
  }

  const hasExercises = session && session.exercises.length > 0;
  const restLeft = session?.restEndAt ? Math.max(0, Math.ceil((session.restEndAt - now) / 1000)) : 0;
  const activeExRest = session?.exercises.find((_, i) => session.restEndAt)?.restSeconds ?? 90;

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
        <button onClick={() => router.push("/app")} style={{ background: "none", border: "none", color: palette.inkDim, cursor: "pointer" }}><X size={20} /></button>
        <span style={{ fontSize: 14, fontWeight: 700 }}>{session?.routineName}</span>
        <div style={{ display: "flex", gap: 14 }}>
          <button onClick={() => setShowSettings(true)} style={{ background: "none", border: "none", color: palette.inkDim, cursor: "pointer" }}><Settings size={18} /></button>
          <button onClick={() => setConfirmCancel(true)} style={{ background: "none", border: "none", color: "#f87171", cursor: "pointer" }}><Trash2 size={18} /></button>
        </div>
      </div>

      {hasExercises && (
        <div style={{ display: "flex", justifyContent: "space-around", padding: "10px 0", borderBottom: `1px solid ${palette.panelBorder}`, marginBottom: 14 }}>
          <SessionStat label="Series" value={`${session!.exercises.reduce((s, ex) => s + ex.sets.filter((s2) => s2.done).length, 0)}`} />
          <SessionStat label="Volumen" value={`${Math.round(session!.exercises.reduce((s, ex) => s + ex.sets.filter((s2) => s2.done && s2.set_type !== "warmup" && s2.weight && s2.reps).reduce((s3, s2) => s3 + s2.weight! * s2.reps!, 0), 0)).toLocaleString()} kg`} />
        </div>
      )}

      {restLeft > 0 && <RestTimerRing secondsLeft={restLeft} totalSeconds={activeExRest} onSkip={skipRest} />}

      {!hasExercises ? (
        <div style={{ padding: 24, textAlign: "center", color: palette.inkDim, marginBottom: 20 }}>
          <p style={{ marginBottom: 8 }}>Esta rutina no tiene ejercicios cargados.</p>
          {loadError && <p style={{ color: "#f87171", fontSize: 12, fontFamily: "monospace" }}>{loadError}</p>}
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", marginBottom: 24 }}>
          {session!.exercises.map((ex, exIdx) => {
            const isOpen = expandedId === ex.id;
            const doneInEx = ex.sets.filter((s) => s.done).length;
            const groupColor = ex.supersetGroup != null ? supersetColor(ex.supersetGroup) : null;
            return (
              <div key={ex.id} style={{
                paddingTop: 16, paddingBottom: 16,
                borderTop: exIdx > 0 ? `1px solid ${palette.panelBorder}` : "none",
                borderLeft: groupColor ? `3px solid ${groupColor}` : undefined,
                paddingLeft: groupColor ? 10 : 0,
              }}>
                <button onClick={() => setExpandedId(isOpen ? null : ex.id)} style={{
                  width: "100%", display: "flex", alignItems: "center", gap: 12,
                  background: "none", border: "none", cursor: "pointer", textAlign: "left", padding: 0, marginBottom: 10,
                }}>
                  {isOpen && ex.media_url ? (
                    <img src={ex.media_url} alt={ex.name} style={{ width: 64, height: 64, borderRadius: 10, objectFit: "cover", flexShrink: 0 }} />
                  ) : (
                    <GifThumb src={ex.media_url} size={52} />
                  )}
                  <div style={{ flex: 1 }}>
                    {groupColor && (
                      <span style={{ display: "inline-block", fontSize: 9.5, fontWeight: 700, marginBottom: 4, color: groupColor, background: `${groupColor}22`, padding: "2px 8px", borderRadius: 999 }}>
                        🔗 Superserie
                      </span>
                    )}
                    <div style={{ fontSize: 14.5, fontWeight: 700, color: palette.ink }}>{ex.name}</div>
                    <div style={{ fontSize: 11.5, color: palette.inkDim, marginTop: 2 }}>
                      {muscleLabel(ex.muscle_group)} · {doneInEx}/{ex.sets.length} series
                    </div>
                  </div>
                  <ChevronDown size={16} color={palette.inkDim} style={{ transform: isOpen ? "rotate(180deg)" : "none", transition: "transform .2s", flexShrink: 0 }} />
                </button>

                {isOpen && (
                  <div style={{ marginBottom: 12 }}>
                    {ex.notes && <p style={{ fontSize: 12.5, color: palette.accent, marginBottom: 10 }}>📝 {ex.notes}</p>}
                    {ex.equipment && <InfoLine label="Equipo" value={equipmentLabel(ex.equipment)} />}
                    {ex.description && <InfoLine label="Descripción" value={ex.description} />}
                    {ex.instructions && ex.instructions.length > 0 && (
                      <div style={{ marginTop: 8, marginBottom: 4 }}>
                        <div style={{ fontSize: 10.5, color: palette.accent, fontWeight: 700, textTransform: "uppercase", marginBottom: 4 }}>Técnica</div>
                        <ol style={{ paddingLeft: 16, fontSize: 12, color: palette.inkDim, lineHeight: 1.6 }}>
                          {ex.instructions.map((step, i) => <li key={i}>{step}</li>)}
                        </ol>
                      </div>
                    )}
                  </div>
                )}

                <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
                  <Timer size={12} color={palette.inkDim} />
                  {editingRestFor === exIdx ? (
                    <input
                      type="number" autoFocus defaultValue={ex.restSeconds}
                      onBlur={(e) => { updateExerciseRest(exIdx, +e.target.value || 90); setEditingRestFor(null); }}
                      style={{ width: 50, padding: "2px 6px", borderRadius: 6, border: `1px solid ${palette.panelBorder}`, background: palette.inputBg, color: palette.ink, fontSize: 11 }}
                    />
                  ) : (
                    <button onClick={() => setEditingRestFor(exIdx)} style={{ background: "none", border: "none", color: palette.inkDim, fontSize: 11, cursor: "pointer" }}>
                      Descanso: {ex.restSeconds}s
                    </button>
                  )}
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "0 2px 6px" }}>
                  <span style={{ width: 22, fontSize: 9, color: palette.inkDim, textTransform: "uppercase", fontWeight: 700, textAlign: "center" }}>Serie</span>
                  <span style={{ width: 62, fontSize: 9, color: palette.inkDim, textTransform: "uppercase", fontWeight: 700, textAlign: "center" }}>Anterior</span>
                  {ex.measurement_type === "reps_weight" && (
                    <>
                      <span style={{ width: 50, fontSize: 9, color: palette.inkDim, textTransform: "uppercase", fontWeight: 700, textAlign: "center" }}>Peso</span>
                      <span style={{ width: 50, fontSize: 9, color: palette.inkDim, textTransform: "uppercase", fontWeight: 700, textAlign: "center" }}>Reps</span>
                    </>
                  )}
                  {(ex.measurement_type === "time" || ex.measurement_type === "time_distance") && (
                    <span style={{ width: 50, fontSize: 9, color: palette.inkDim, textTransform: "uppercase", fontWeight: 700, textAlign: "center" }}>Seg</span>
                  )}
                  {(ex.measurement_type === "distance" || ex.measurement_type === "time_distance") && (
                    <span style={{ width: 50, fontSize: 9, color: palette.inkDim, textTransform: "uppercase", fontWeight: 700, textAlign: "center" }}>Metros</span>
                  )}
                </div>

                {ex.sets.map((s, i) => {
                  const badge = getSetBadge(ex.sets, i, palette.accent);
                  const prev = previousMap[ex.id]?.[i + 1];
                  const prevLabel = prev
                    ? (ex.measurement_type === "reps_weight" ? `${prev.weight ?? "-"}×${prev.reps ?? "-"}` : ex.measurement_type === "distance" ? `${prev.distance_m ?? "-"}m` : `${prev.time_sec ?? "-"}s`)
                    : "—";
                  return (
                    <div key={i} style={{
                      display: "flex", alignItems: "center", gap: 8, padding: "9px 2px",
                      background: i % 2 === 1 ? "rgba(255,255,255,0.025)" : "transparent",
                      borderRadius: 8, opacity: s.done ? 0.55 : 1,
                    }}>
                      <button onClick={(e) => { const r = e.currentTarget.getBoundingClientRect(); setEditingType({ exIdx, setIdx: i, x: r.left, y: r.bottom }); }} style={{
                        width: 22, height: 22, borderRadius: 7, border: "none", cursor: "pointer", fontWeight: 700, fontSize: 11, flexShrink: 0,
                        color: badge.color, background: `${badge.color}22`,
                      }}>{badge.text}</button>

                      <span style={{ width: 62, fontSize: 11, color: palette.inkDim, textAlign: "center" }}>{prevLabel}</span>

                      {ex.measurement_type === "reps_weight" && (
                        <>
                          <SetInput value={s.weight} onChange={(v) => updateSet(exIdx, i, "weight", v)} />
                          <SetInput value={s.reps} onChange={(v) => updateSet(exIdx, i, "reps", v)} />
                        </>
                      )}
                      {(ex.measurement_type === "time" || ex.measurement_type === "time_distance") && (
                        <SetInput value={s.time_sec} onChange={(v) => updateSet(exIdx, i, "time_sec", v)} />
                      )}
                      {(ex.measurement_type === "distance" || ex.measurement_type === "time_distance") && (
                        <SetInput value={s.distance_m} onChange={(v) => updateSet(exIdx, i, "distance_m", v)} />
                      )}

                      <div style={{ flex: 1 }} />
                      <button onClick={() => removeSet(exIdx, i)} style={{ background: "none", border: "none", color: palette.inkDim, cursor: "pointer", padding: 4 }}>
                        <Trash2 size={13} />
                      </button>
                      <button onClick={() => toggleSetDone(exIdx, i, ex.restSeconds ?? 90)} style={{
                        width: 26, height: 26, borderRadius: 8, border: `1px solid ${s.done ? "#4ADE80" : palette.panelBorder}`,
                        background: s.done ? "#4ADE80" : "transparent", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flexShrink: 0,
                      }}>
                        <Check size={13} color={s.done ? "#0A0C10" : palette.inkDim} />
                      </button>
                    </div>
                  );
                })}

                <button onClick={() => addSet(exIdx)} style={{
                  display: "flex", alignItems: "center", gap: 5, background: "none", border: "none",
                  color: palette.accent, fontSize: 12, cursor: "pointer", padding: "8px 2px 0",
                }}>
                  <Plus size={13} /> Agregar serie
                </button>
              </div>
            );
          })}
        </div>
      )}

      <div style={{ display: "flex", gap: 10 }}>
        <button onClick={() => setConfirmCancel(true)} style={{
          padding: "13px 18px", borderRadius: 14, border: `1px solid ${palette.panelBorder}`,
          background: "none", color: palette.inkDim, fontSize: 13.5, cursor: "pointer",
        }}>Cancelar</button>
        <button onClick={finishWorkout} style={{
          flex: 1, padding: 14, borderRadius: 14, border: "none",
          background: `linear-gradient(135deg, ${palette.accent}, ${palette.accentDeep})`, color: "#0A0C10",
          fontWeight: 700, fontSize: 14.5, cursor: "pointer",
        }}>
          Terminar entreno
        </button>
      </div>

      {editingType && (
        <SetTypePopover
          current={session!.exercises[editingType.exIdx].sets[editingType.setIdx].set_type}
          x={editingType.x} y={editingType.y}
          onSelect={(type) => updateSet(editingType.exIdx, editingType.setIdx, "set_type", type)}
          onClose={() => setEditingType(null)}
        />
      )}

      {showSettings && (
        <WorkoutSettingsSheet
          onClose={() => setShowSettings(false)}
          defaultRest={defaultRest} keepAwake={keepAwake} trackRpe={trackRpe}
          onUpdated={(v) => {
            if (v.defaultRest !== undefined) setDefaultRest(v.defaultRest);
            if (v.keepAwake !== undefined) setKeepAwake(v.keepAwake);
            if (v.trackRpe !== undefined) setTrackRpe(v.trackRpe);
          }}
        />
      )}

      {confirmCancel && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100, padding: 20 }}>
          <div style={{ ...glassPanel, padding: 22, width: "100%", maxWidth: 340 }}>
            <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 8 }}>¿Cancelar entrenamiento?</h3>
            <p style={{ fontSize: 12.5, color: palette.inkDim, marginBottom: 18 }}>Se perderá todo el progreso de esta sesión, no se guarda nada.</p>
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => setConfirmCancel(false)} style={{ flex: 1, padding: 11, borderRadius: 11, border: `1px solid ${palette.panelBorder}`, background: "none", color: palette.ink, cursor: "pointer", fontSize: 13 }}>Seguir</button>
              <button onClick={cancelWorkout} style={{ flex: 1, padding: 11, borderRadius: 11, border: "none", background: "#c0392b", color: "#fff", cursor: "pointer", fontSize: 13, fontWeight: 700 }}>Sí, cancelar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function SessionStat({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ textAlign: "center" }}>
      <div style={{ fontSize: 15, fontWeight: 700 }}>{value}</div>
      <div style={{ fontSize: 9.5, color: palette.inkDim, textTransform: "uppercase" }}>{label}</div>
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

function SetInput({ value, onChange }: { value?: number; onChange: (v: number) => void }) {
  return (
    <input type="number" value={value ?? ""} onChange={(e) => onChange(+e.target.value)}
      style={{ width: 50, padding: "5px 6px", borderRadius: 7, border: `1px solid ${palette.panelBorder}`, background: palette.inputBg, color: palette.ink, fontSize: 12.5, textAlign: "center" }} />
  );
}

function SummaryScreen({ routineName, volume, durationSec, prs, breakdown, onDone }: {
  routineName: string; volume: number; durationSec: number; prs: string[]; breakdown: Record<string, number>; onDone: () => void;
}) {
  const minutes = Math.floor(durationSec / 60);
  const capitalized = routineName.charAt(0).toUpperCase() + routineName.slice(1);

  async function share() {
    const text = `Completé "${capitalized}" en FitTrack 💪\n${volume.toLocaleString()} kg de volumen total en ${minutes} min${prs.length ? `\n🏆 ${prs.length} nuevo(s) PR: ${prs.join(", ")}` : ""}`;
    if (navigator.share) await navigator.share({ text });
    else { await navigator.clipboard.writeText(text); alert("Copiado al portapapeles"); }
  }

  const BADGE_LABELS: Record<string, { label: string; color: string }> = {
    normal: { label: "Efectivas", color: palette.accent },
    warmup: { label: "Calentamiento", color: "#FBBF24" },
    dropset: { label: "Dropset", color: "#C77DFF" },
    failure: { label: "Al fallo", color: "#F87171" },
  };

  return (
    <div style={{ textAlign: "center", paddingTop: 40 }}>
      <div style={{ width: 64, height: 64, borderRadius: "50%", background: `${palette.accent}22`, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 18px", color: palette.accent }}>
        <Flame size={28} />
      </div>
      <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 4 }}>¡Entreno completado!</h1>
      <p style={{ color: palette.inkDim, fontSize: 14, marginBottom: 24 }}>{capitalized}</p>

      <div style={{ display: "flex", gap: 10, marginBottom: 14 }}>
        <div style={{ ...glassPanel, flex: 1, padding: 16 }}>
          <div style={{ fontSize: 20, fontWeight: 700 }}>{volume.toLocaleString()} kg</div>
          <div style={{ fontSize: 11, color: palette.inkDim }}>Volumen total</div>
        </div>
        <div style={{ ...glassPanel, flex: 1, padding: 16 }}>
          <div style={{ fontSize: 20, fontWeight: 700 }}>{minutes} min</div>
          <div style={{ fontSize: 11, color: palette.inkDim }}>Duración</div>
        </div>
      </div>

      <div style={{ ...glassPanel, padding: 16, marginBottom: 20, textAlign: "left" }}>
        <div style={{ fontSize: 11, color: palette.inkDim, marginBottom: 10, textTransform: "uppercase", fontWeight: 700 }}>Series por tipo</div>
        <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
          {Object.entries(breakdown).filter(([, count]) => count > 0).map(([type, count]) => (
            <div key={type} style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ width: 8, height: 8, borderRadius: "50%", background: BADGE_LABELS[type]?.color }} />
              <span style={{ fontSize: 12.5 }}>{count} {BADGE_LABELS[type]?.label}</span>
            </div>
          ))}
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
