"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { usePalette } from "@/lib/theme";
import { muscleLabel } from "@/lib/muscleLabels";
import { equipmentLabel } from "@/lib/equipmentLabels";
import { supersetColor } from "@/lib/supersetColors";
import { useCurrentUser } from "@/lib/useCurrentUser";
import { useWorkoutSession, LiveExercise } from "@/lib/workoutSession";
import { finishWorkoutSession, type FinishedWorkout } from "@/lib/finishWorkout";
import { X, Trophy, Flame, ChevronDown, Trash2, Plus, Timer, Settings, Link2, StickyNote } from "lucide-react";
import GifThumb from "@/components/GifThumb";
import ExerciseVideoLink from "@/components/ExerciseVideoLink";
import ExercisePicker from "@/components/ExercisePicker";
import SetTypePopover from "@/components/SetTypePopover";
import WorkoutSetRow from "@/components/WorkoutSetRow";
import RestBar from "@/components/RestBar";
import WarmupCalculator from "@/components/WarmupCalculator";
import WorkoutSettingsSheet from "@/components/WorkoutSettingsSheet";
import WorkoutSummary from "@/components/WorkoutSummary";
import ExerciseDetailModal from "@/components/ExerciseDetailModal";
import Overlay from "@/components/Overlay";

export default function WorkoutPage() {
  const palette = usePalette();
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const supabase = createClient();
  const uid = useCurrentUser();
  const { session, now, startSession, addExercise, removeExercise, toggleSetDone, updateSet, addSet, removeSet, updateExerciseRest, adjustRest, skipRest, insertWarmupSets, clearSession } = useWorkoutSession();

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [editingType, setEditingType] = useState<{ exIdx: number; setIdx: number; x: number; y: number } | null>(null);
  const [editingRestFor, setEditingRestFor] = useState<number | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [finished, setFinished] = useState<FinishedWorkout | null>(null);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [defaultRest, setDefaultRest] = useState(90);
  const [keepAwake, setKeepAwake] = useState(false);
  const [trackRpe, setTrackRpe] = useState(false);
  const [previousMap, setPreviousMap] = useState<Record<string, Record<number, any>>>({});
  const [bestPRMap, setBestPRMap] = useState<Record<string, number>>({});
  const [videoLinkMap, setVideoLinkMap] = useState<Record<string, string>>({});
  const [prToast, setPrToast] = useState<string | null>(null);
  const [warmupFor, setWarmupFor] = useState<number | null>(null);
  const [warmupTarget, setWarmupTarget] = useState<number | undefined>(undefined);
  const [autoWarmupPrompt, setAutoWarmupPrompt] = useState(true);
  const autoWarmupPromptedRef = useRef<Set<number>>(new Set());
  const [highlightSet, setHighlightSet] = useState<{ exIdx: number; setIdx: number } | null>(null);
  const [finishing, setFinishing] = useState(false);
  const [finishError, setFinishError] = useState<string | null>(null);
  // La rutina cargada pero AÚN NO iniciada. Antes se llamaba a startSession apenas
  // cargaba la página, así que abrir otra rutina por error pisaba la sesión en curso y
  // borraba lo ya registrado. Ahora hay que pulsar "Empezar rutina" a propósito.
  const [preview, setPreview] = useState<{ name: string; exercises: LiveExercise[] } | null>(null);
  const [detailFor, setDetailFor] = useState<{ id: string; name: string } | null>(null);
  const [confirmReplace, setConfirmReplace] = useState(false);
  const [showPicker, setShowPicker] = useState(false);
  const [confirmRemoveEx, setConfirmRemoveEx] = useState<number | null>(null);

  useEffect(() => {
    if (!uid) return;

    (async () => {
      const [
        { data: re, error: reError },
        { data: routine },
        { data: userRow },
        { data: prRows },
        { data: videoRows },
      ] = await Promise.all([
        supabase
          .from("routine_exercises")
          .select("order_index, target_sets, notes, superset_group, exercises(id, name, media_url, measurement_type, description, equipment, muscle_group, instructions)")
          .eq("routine_id", id)
          .order("order_index"),
        supabase.from("routines").select("name").eq("id", id).single(),
        supabase.from("users").select("default_rest_seconds, keep_screen_awake, track_rpe, auto_warmup_prompt").eq("id", uid).single(),
        supabase.from("personal_records").select("exercise_id, value").eq("client_id", uid).eq("type", "1rm"),
        supabase.from("exercise_video_links").select("exercise_id, video_url").eq("user_id", uid),
      ]);

      if (reError) setLoadError(reError.message);

      if (userRow) {
        setDefaultRest(userRow.default_rest_seconds ?? 90);
        setKeepAwake(userRow.keep_screen_awake ?? false);
        setTrackRpe(userRow.track_rpe ?? false);
        setAutoWarmupPrompt(userRow.auto_warmup_prompt ?? true);
      }

      const prMap: Record<string, number> = {};
      (prRows ?? []).forEach((r: any) => { if (!prMap[r.exercise_id] || r.value > prMap[r.exercise_id]) prMap[r.exercise_id] = r.value; });
      setBestPRMap(prMap);

      const videoMap: Record<string, string> = {};
      (videoRows ?? []).forEach((r: any) => { videoMap[r.exercise_id] = r.video_url; });
      setVideoLinkMap(videoMap);

      const built: LiveExercise[] = (re ?? []).map((r: any) => ({
        id: r.exercises.id, name: r.exercises.name, media_url: r.exercises.media_url,
        measurement_type: r.exercises.measurement_type, notes: r.notes,
        description: r.exercises.description, equipment: r.exercises.equipment,
        muscle_group: r.exercises.muscle_group, instructions: r.exercises.instructions,
        restSeconds: r.target_sets?.[0]?.rest_sec ?? 90, supersetGroup: r.superset_group,
        // Lo que trae la rutina va a `target`, no al valor del campo: así el campo arranca
        // vacío (se puede escribir directo) y el número planeado se ve en gris de fondo.
        // Al marcar la serie como hecha, lo que quedó vacío toma ese objetivo.
        sets: (r.target_sets ?? []).map((s: any) => ({
          set_type: s.set_type ?? "normal", done: false,
          target: { reps: s.reps, weight: s.weight, time_sec: s.time_sec, distance_m: s.distance_m },
        })),
      }));

      const exerciseIds = built.map((ex) => ex.id);
      const { data: allPrevLogs } = exerciseIds.length > 0
        ? await supabase
          .from("set_logs")
          .select("exercise_id, set_number, weight, reps, time_sec, distance_m, workout_log_id, workout_logs!inner(date, client_id)")
          .in("exercise_id", exerciseIds)
          .eq("workout_logs.client_id", uid)
          .order("id", { ascending: false })
          .limit(exerciseIds.length * 40)
        : { data: [] as any[] };

      const logsByExercise: Record<string, any[]> = {};
      (allPrevLogs ?? []).forEach((r: any) => { (logsByExercise[r.exercise_id] ??= []).push(r); });

      const prevMap: Record<string, Record<number, any>> = {};
      for (const ex of built) {
        const logs = logsByExercise[ex.id];
        if (!logs || logs.length === 0) { prevMap[ex.id] = {}; continue; }
        const latestLogId = logs.reduce((latest: any, row: any) =>
          !latest || new Date(row.workout_logs.date) > new Date(latest.workout_logs.date) ? row : latest
        , null)?.workout_log_id;
        const bySet: Record<number, any> = {};
        logs.filter((r: any) => r.workout_log_id === latestLogId).forEach((r: any) => { bySet[r.set_number] = r; });
        prevMap[ex.id] = bySet;
      }
      setPreviousMap(prevMap);

      setPreview({ name: routine?.name ?? "Entrenamiento", exercises: built });
      setLoading(false);
    })();
  }, [id, uid]);

  useEffect(() => {
    if (!keepAwake || !("wakeLock" in navigator)) return;
    let lock: any;
    (navigator as any).wakeLock.request("screen").then((l: any) => { lock = l; }).catch(() => {});
    return () => { lock?.release?.(); };
  }, [keepAwake]);

  function handleToggleSet(exIdx: number, setIdx: number) {
    const ex = session!.exercises[exIdx];
    const set = ex.sets[setIdx];
    const willBeDone = !set.done;

    toggleSetDone(exIdx, setIdx, ex.restSeconds ?? 90);

    if (willBeDone && set.weight && set.set_type !== "warmup") {
      const best = bestPRMap[ex.id] ?? 0;
      if (set.weight > best) {
        setBestPRMap((prev) => ({ ...prev, [ex.id]: set.weight! }));
        setPrToast(`Nuevo récord en ${ex.name}: ${set.weight} kg`);
        setTimeout(() => setPrToast(null), 3500);
      }
    }

    if (willBeDone && ex.supersetGroup != null) {
      const groupIndices = session!.exercises
        .map((e, i) => (e.supersetGroup === ex.supersetGroup ? i : -1))
        .filter((i) => i >= 0);
      const posInGroup = groupIndices.indexOf(exIdx);
      if (posInGroup < groupIndices.length - 1) {
        const nextExId = session!.exercises[groupIndices[posInGroup + 1]].id;
        setTimeout(() => {
          document.getElementById(`ex-${nextExId}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
        }, 150);
      }
    }

    if (willBeDone && ex.sets[setIdx + 1]?.set_type === "dropset") {
      setHighlightSet({ exIdx, setIdx: setIdx + 1 });
      setTimeout(() => setHighlightSet(null), 1800);
    }
  }

  function applyWarmup(sets: { weight: number; reps: number }[]) {
    if (warmupFor === null) return;
    insertWarmupSets(warmupFor, sets);
    setWarmupFor(null);
    setWarmupTarget(undefined);
  }

  function handleWeightChange(exIdx: number, setIdx: number, value: number | undefined) {
    const ex = session!.exercises[exIdx];
    const isFirstMeaningfulEntry =
      autoWarmupPrompt &&
      setIdx === 0 &&
      ex.measurement_type === "reps_weight" &&
      !!value && value > 0 &&
      !ex.sets[0].weight &&
      !autoWarmupPromptedRef.current.has(exIdx);

    updateSet(exIdx, setIdx, "weight", value);

    if (isFirstMeaningfulEntry) {
      autoWarmupPromptedRef.current.add(exIdx);
      setWarmupTarget(value);
      setWarmupFor(exIdx);
    }
  }

  async function finishWorkout() {
    if (!session || !uid || finishing) return;

    if (typeof navigator !== "undefined" && !navigator.onLine) {
      setFinishError("Sin conexión. Tu entreno queda guardado en este dispositivo y se sincroniza solo en cuanto vuelva la señal.");
      return;
    }

    setFinishing(true);
    setFinishError(null);

    try {
      const summary = await finishWorkoutSession({
        supabase, uid, routineId: id, routineName: session.routineName,
        exercises: session.exercises, startedAt: session.startedAt,
      });
      setFinished(summary);
      clearSession();
    } catch {
      setFinishError("No pudimos guardar tu entreno por un problema de conexión. No se perdió nada — reintenta cuando quieras o espera, se reintenta solo en cuanto vuelva la señal.");
    } finally {
      setFinishing(false);
    }
  }

  useEffect(() => {
    function retryOnReconnect() {
      if (finishError) finishWorkout();
    }
    window.addEventListener("online", retryOnReconnect);
    return () => window.removeEventListener("online", retryOnReconnect);
  }, [finishError, session, uid]);

  function cancelWorkout() {
    clearSession();
    router.push("/app");
  }

  const isActive = !!session && session.routineId === id;
  const otherSession = session && session.routineId !== id ? session : null;

  function requestStart() {
    // Si hay otro entreno abierto, se pregunta antes: empezar este descarta el anterior.
    if (otherSession) { setConfirmReplace(true); return; }
    startWorkout();
  }

  function startWorkout() {
    if (!preview) return;
    setConfirmReplace(false);
    startSession(id, preview.name, preview.exercises);
  }

  if (loading) return <p style={{ color: palette.inkDim, textAlign: "center", marginTop: 60 }}>Cargando entrenamiento...</p>;

  if (finished) {
    return <WorkoutSummary {...finished} suggestedRoutineName={`${finished.routineName} (copia)`} onDone={() => router.push("/app")} />;
  }

  // Mientras no se haya pulsado "Empezar rutina", solo se muestra la rutina.
  if (!isActive) {
    return (
      <div>
        <div style={{ ...palette.glassPanel, padding: "14px 16px", marginBottom: 16 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <button onClick={() => router.push("/app")} aria-label="Volver" style={{ background: "none", border: "none", color: palette.inkDim, cursor: "pointer" }}><X size={20} /></button>
            <span style={{ fontSize: 14, fontWeight: 700 }}>{preview?.name ?? "Rutina"}</span>
            <span style={{ width: 20 }} />
          </div>
        </div>

        {otherSession && (
          <div style={{
            ...palette.glassPanel, padding: 14, marginBottom: 14,
            border: `1px solid ${palette.accent}55`, background: `${palette.accent}12`,
          }}>
            <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 4 }}>Tienes un entreno en curso</div>
            <p style={{ fontSize: 12.5, color: palette.inkDim, lineHeight: 1.5, marginBottom: 10 }}>
              “{otherSession.routineName}” sigue abierto con tu progreso guardado.
            </p>
            <button onClick={() => router.push(`/app/workout/${otherSession.routineId}`)} style={{
              padding: "9px 14px", borderRadius: 11, border: "none", cursor: "pointer", fontSize: 12.5, fontWeight: 700,
              background: `linear-gradient(135deg, ${palette.accent}, ${palette.accentDeep})`, color: palette.bg,
            }}>
              Volver a ese entreno
            </button>
          </div>
        )}

        {(preview?.exercises.length ?? 0) === 0 ? (
          <div style={{ padding: 24, textAlign: "center", color: palette.inkDim, marginBottom: 20 }}>
            <p style={{ marginBottom: 8 }}>Esta rutina no tiene ejercicios cargados.</p>
            {loadError && <p style={{ color: "#f87171", fontSize: 12, fontFamily: "monospace" }}>{loadError}</p>}
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 20 }}>
            {preview!.exercises.map((ex) => (
              <button
                key={ex.id} onClick={() => setDetailFor({ id: ex.id, name: ex.name })}
                style={{
                  ...palette.glassPanel, padding: 14, display: "flex", alignItems: "center", gap: 12,
                  width: "100%", textAlign: "left", cursor: "pointer", color: palette.ink,
                }}
              >
                <GifThumb src={ex.media_url} size={46} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 700 }}>{ex.name}</div>
                  <div style={{ fontSize: 11.5, color: palette.inkDim, marginTop: 2 }}>
                    {muscleLabel(ex.muscle_group)} · {ex.sets.length} series · {ex.restSeconds}s de descanso
                  </div>
                </div>
                <ChevronDown size={16} color={palette.inkDim} style={{ transform: "rotate(-90deg)", flexShrink: 0 }} />
              </button>
            ))}
          </div>
        )}

        {(preview?.exercises.length ?? 0) > 0 && (
          <button onClick={requestStart} style={{
            width: "100%", padding: 15, borderRadius: 14, border: "none",
            background: `linear-gradient(135deg, ${palette.accent}, ${palette.accentDeep})`, color: palette.bg,
            fontWeight: 700, fontSize: 15, cursor: "pointer",
          }}>
            Empezar rutina
          </button>
        )}

        {detailFor && (
          <ExerciseDetailModal exerciseId={detailFor.id} fallbackName={detailFor.name} onClose={() => setDetailFor(null)} />
        )}

        {confirmReplace && otherSession && (
          <Overlay onClose={() => setConfirmReplace(false)}>
            <div onClick={(e) => e.stopPropagation()} style={{ ...palette.modalPanel, padding: 22, width: "100%", maxWidth: 340 }}>
              <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 8 }}>Ya tienes un entreno en curso</h3>
              <p style={{ fontSize: 12.5, color: palette.inkDim, marginBottom: 18, lineHeight: 1.5 }}>
                Si empiezas “{preview?.name}”, se descarta “{otherSession.routineName}” y se pierde lo que llevas registrado ahí.
              </p>
              <div style={{ display: "flex", gap: 10 }}>
                <button onClick={() => setConfirmReplace(false)} style={{ flex: 1, padding: 11, borderRadius: 11, border: `1px solid ${palette.panelBorder}`, background: "none", color: palette.ink, cursor: "pointer", fontSize: 13 }}>
                  Cancelar
                </button>
                <button onClick={startWorkout} style={{ flex: 1, padding: 11, borderRadius: 11, border: "none", background: "#c0392b", color: "#fff", cursor: "pointer", fontSize: 13, fontWeight: 700 }}>
                  Descartar y empezar
                </button>
              </div>
            </div>
          </Overlay>
        )}
      </div>
    );
  }

  const hasExercises = session && session.exercises.length > 0;
  const restLeft = session?.restEndAt ? Math.max(0, Math.ceil((session.restEndAt - now) / 1000)) : 0;

  return (
    <div>
      {prToast && (
        <div style={{
          position: "fixed", top: 16, left: 16, right: 16, zIndex: 200,
          background: palette.accent, color: palette.bg, borderRadius: 14, padding: "12px 16px",
          fontSize: 13, fontWeight: 700, textAlign: "center", boxShadow: "0 10px 30px -6px rgba(0,0,0,0.4)",
          display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
        }}>
          <Trophy size={15} /> {prToast}
        </div>
      )}

      <div style={{ ...palette.glassPanel, padding: "14px 16px", marginBottom: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: hasExercises ? 10 : 0 }}>
          <button onClick={() => router.push("/app")} style={{ background: "none", border: "none", color: palette.inkDim, cursor: "pointer" }}><X size={20} /></button>
          <span style={{ fontSize: 14, fontWeight: 700 }}>{session?.routineName}</span>
          <div style={{ display: "flex", gap: 14 }}>
            <button onClick={() => setShowSettings(true)} style={{ background: "none", border: "none", color: palette.inkDim, cursor: "pointer" }}><Settings size={18} /></button>
            <button onClick={() => setConfirmCancel(true)} style={{ background: "none", border: "none", color: "#f87171", cursor: "pointer" }}><Trash2 size={18} /></button>
          </div>
        </div>

        {hasExercises && (
          <div style={{ display: "flex", justifyContent: "space-around", paddingTop: 10, borderTop: `1px solid ${palette.panelBorder}` }}>
            <SessionStat label="Series" value={`${session!.exercises.reduce((s, ex) => s + ex.sets.filter((s2) => s2.done).length, 0)}`} />
            <SessionStat label="Tiempo" value={formatElapsed(now - session!.startedAt)} />
            <SessionStat label="Volumen" value={`${Math.round(session!.exercises.reduce((s, ex) => s + ex.sets.filter((s2) => s2.done && s2.set_type !== "warmup" && s2.weight && s2.reps).reduce((s3, s2) => s3 + s2.weight! * s2.reps!, 0), 0)).toLocaleString("es-CO")} kg`} />
          </div>
        )}
      </div>

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
            const showRestHere = session!.restForExIdx === exIdx && restLeft > 0;
            return (
              <div key={ex.id} id={`ex-${ex.id}`} style={{
                ...palette.glassPanel, padding: 16, marginBottom: 14,
                borderLeft: groupColor ? `3px solid ${groupColor}` : undefined,
              }}>
                {/* Tocar la imagen o el nombre abre la ficha del ejercicio. La flechita
                    sigue desplegando la técnica aquí dentro, y el bote saca el ejercicio
                    de la sesión (ej. la máquina está ocupada). */}
                <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 10 }}>
                  <button
                    onClick={() => setDetailFor({ id: ex.id, name: ex.name })}
                    aria-label={`Ver la ficha de ${ex.name}`}
                    style={{ background: "none", border: "none", padding: 0, cursor: "pointer", display: "flex", flexShrink: 0 }}
                  >
                    {isOpen && ex.media_url ? (
                      <img src={ex.media_url} alt={ex.name} style={{ width: 64, height: 64, borderRadius: 10, objectFit: "cover" }} />
                    ) : (
                      <GifThumb src={ex.media_url} size={52} />
                    )}
                  </button>

                  <button
                    onClick={() => setDetailFor({ id: ex.id, name: ex.name })}
                    style={{ flex: 1, minWidth: 0, background: "none", border: "none", padding: 0, cursor: "pointer", textAlign: "left" }}
                  >
                    {groupColor && (
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 9.5, fontWeight: 700, marginBottom: 4, color: groupColor, background: `${groupColor}22`, padding: "2px 8px", borderRadius: 999 }}>
                        <Link2 size={10} /> Superserie
                      </span>
                    )}
                    <div style={{ fontSize: 14.5, fontWeight: 700, color: palette.ink }}>{ex.name}</div>
                    <div style={{ fontSize: 11.5, color: palette.inkDim, marginTop: 2 }}>
                      {muscleLabel(ex.muscle_group)} · {doneInEx}/{ex.sets.length} series
                    </div>
                  </button>

                  <button
                    onClick={() => setConfirmRemoveEx(exIdx)}
                    aria-label={`Quitar ${ex.name} del entreno`}
                    style={{ background: "none", border: "none", padding: 4, cursor: "pointer", color: palette.inkDim, display: "flex", flexShrink: 0 }}
                  >
                    <Trash2 size={15} />
                  </button>

                  <button
                    onClick={() => setExpandedId(isOpen ? null : ex.id)}
                    aria-label={isOpen ? "Ocultar la técnica" : "Ver la técnica"}
                    style={{ background: "none", border: "none", padding: 4, cursor: "pointer", display: "flex", flexShrink: 0 }}
                  >
                    <ChevronDown size={16} color={palette.inkDim} style={{ transform: isOpen ? "rotate(180deg)" : "none", transition: "transform .2s" }} />
                  </button>
                </div>

                {isOpen && (
                  <div style={{ marginBottom: 12 }}>
                    {ex.notes && <p style={{ fontSize: 12.5, color: palette.accent, marginBottom: 10, display: "flex", alignItems: "flex-start", gap: 6 }}><StickyNote size={13} style={{ flexShrink: 0, marginTop: 1 }} /> {ex.notes}</p>}
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
                    <ExerciseVideoLink exerciseId={ex.id} initialUrl={videoLinkMap[ex.id] ?? null} />
                  </div>
                )}

                {/* Calentamiento y descanso van a la derecha y como pastillas: antes eran
                    texto pequeño pegado a la izquierda y parecían relleno. */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 8, marginBottom: 10 }}>
                  {ex.measurement_type === "reps_weight" && (
                    <button onClick={() => setWarmupFor(exIdx)} style={{ ...pillStyle(palette), color: palette.accent, borderColor: `${palette.accent}55`, background: `${palette.accent}12` }}>
                      <Flame size={13} /> Calentamiento
                    </button>
                  )}
                  {editingRestFor === exIdx ? (
                    <div style={{ ...pillStyle(palette), color: palette.inkDim }}>
                      <Timer size={13} />
                      <input
                        type="number" inputMode="numeric" min={0} autoFocus defaultValue={ex.restSeconds}
                        onKeyDown={(e) => { if (e.key === "-" || e.key === "+" || e.key === "e") e.preventDefault(); }}
                        onBlur={(e) => { updateExerciseRest(exIdx, Math.max(0, +e.target.value || 90)); setEditingRestFor(null); }}
                        style={{ width: 46, padding: "2px 4px", borderRadius: 6, border: `1px solid ${palette.panelBorder}`, background: palette.inputBg, color: palette.ink, fontSize: 12 }}
                      />
                      s
                    </div>
                  ) : (
                    <button onClick={() => setEditingRestFor(exIdx)} style={{ ...pillStyle(palette), color: palette.inkDim }}>
                      <Timer size={13} /> Descanso {ex.restSeconds}s
                    </button>
                  )}
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "0 0 6px" }}>
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
                  const prev = previousMap[ex.id]?.[i + 1];
                  const prevLabel = prev
                    ? (ex.measurement_type === "reps_weight" ? `${prev.weight ?? "-"}×${prev.reps ?? "-"}` : ex.measurement_type === "distance" ? `${prev.distance_m ?? "-"}m` : `${prev.time_sec ?? "-"}s`)
                    : "—";
                  return (
                    <WorkoutSetRow
                      key={i}
                      exercise={ex} set={s} index={i}
                      previousLabel={prevLabel}
                      highlighted={highlightSet?.exIdx === exIdx && highlightSet?.setIdx === i}
                      trackRpe={trackRpe}
                      onOpenTypeMenu={(r) => setEditingType({ exIdx, setIdx: i, x: r.left, y: r.bottom })}
                      onChangeField={(field, v) => field === "weight" ? handleWeightChange(exIdx, i, v) : updateSet(exIdx, i, field, v)}
                      onToggleDone={() => handleToggleSet(exIdx, i)}
                      onRemove={() => removeSet(exIdx, i)}
                      onSetRpe={(n) => updateSet(exIdx, i, "rpe", n)}
                    />
                  );
                })}

                <button onClick={() => addSet(exIdx)} style={{
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 6, width: "100%",
                  background: `${palette.accent}12`, border: `1.5px dashed ${palette.accent}55`, borderRadius: 12,
                  color: palette.accent, fontSize: 12.5, fontWeight: 700, cursor: "pointer", padding: "10px 0", marginTop: 8,
                }}>
                  <Plus size={14} /> Agregar serie
                </button>

                {showRestHere && (
                  <RestBar secondsLeft={restLeft} totalSeconds={ex.restSeconds ?? 90} onAdjust={adjustRest} onSkip={skipRest} />
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Sobre la marcha se puede sumar un ejercicio que no venía en la rutina, por
          ejemplo si la máquina prevista está ocupada. */}
      <button onClick={() => setShowPicker(true)} style={{
        display: "flex", alignItems: "center", justifyContent: "center", gap: 7, width: "100%", padding: 13, borderRadius: 14,
        border: `1px solid ${palette.accent}55`, background: `${palette.accent}18`, color: palette.accent,
        fontWeight: 700, fontSize: 13.5, cursor: "pointer", marginBottom: 16,
      }}>
        <Plus size={15} /> Agregar ejercicio
      </button>

      {finishError && (
        <p style={{ color: "#f87171", fontSize: 12, textAlign: "center", marginBottom: 10, lineHeight: 1.5 }}>{finishError}</p>
      )}

      <div style={{ display: "flex", gap: 10 }}>
        <button onClick={() => setConfirmCancel(true)} style={{
          padding: "13px 18px", borderRadius: 14, border: `1px solid ${palette.panelBorder}`,
          background: "none", color: palette.inkDim, fontSize: 13.5, cursor: "pointer",
        }}>Cancelar</button>
        <button onClick={finishWorkout} disabled={finishing} style={{
          flex: 1, padding: 14, borderRadius: 14, border: "none",
          background: `linear-gradient(135deg, ${palette.accent}, ${palette.accentDeep})`, color: palette.bg,
          fontWeight: 700, fontSize: 14.5, cursor: "pointer", opacity: finishing ? 0.6 : 1,
        }}>
          {finishing ? "Guardando..." : finishError ? "Reintentar" : "Terminar entreno"}
        </button>
      </div>

      {detailFor && (
        <ExerciseDetailModal exerciseId={detailFor.id} fallbackName={detailFor.name} onClose={() => setDetailFor(null)} />
      )}

      {showPicker && (
        <ExercisePicker
          alreadyAddedIds={session!.exercises.map((ex) => ex.id)}
          onClose={() => setShowPicker(false)}
          onPick={(ex) => {
            addExercise({
              id: ex.id, name: ex.name, media_url: ex.media_url,
              measurement_type: ex.measurement_type, muscle_group: ex.muscle_group, equipment: ex.equipment,
              restSeconds: defaultRest,
            });
            setShowPicker(false);
          }}
        />
      )}

      {confirmRemoveEx !== null && session!.exercises[confirmRemoveEx] && (
        <Overlay onClose={() => setConfirmRemoveEx(null)} zIndex={100}>
          <div onClick={(e) => e.stopPropagation()} style={{ ...palette.modalPanel, padding: 22, width: "100%", maxWidth: 340 }}>
            <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 8 }}>¿Quitar este ejercicio?</h3>
            <p style={{ fontSize: 12.5, color: palette.inkDim, marginBottom: 18, lineHeight: 1.5 }}>
              “{session!.exercises[confirmRemoveEx].name}” sale de este entreno y se pierden las series que ya marcaste ahí. La rutina guardada no cambia.
            </p>
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => setConfirmRemoveEx(null)} style={{ flex: 1, padding: 11, borderRadius: 11, border: `1px solid ${palette.panelBorder}`, background: "none", color: palette.ink, cursor: "pointer", fontSize: 13 }}>Cancelar</button>
              <button onClick={() => { removeExercise(confirmRemoveEx); setConfirmRemoveEx(null); }} style={{ flex: 1, padding: 11, borderRadius: 11, border: "none", background: "#c0392b", color: "#fff", cursor: "pointer", fontSize: 13, fontWeight: 700 }}>Sí, quitar</button>
            </div>
          </div>
        </Overlay>
      )}

      {editingType && (
        <SetTypePopover
          current={session!.exercises[editingType.exIdx].sets[editingType.setIdx].set_type}
          x={editingType.x} y={editingType.y}
          onSelect={(type) => updateSet(editingType.exIdx, editingType.setIdx, "set_type", type)}
          onClose={() => setEditingType(null)}
          onDelete={() => removeSet(editingType.exIdx, editingType.setIdx)}
        />
      )}

      {warmupFor !== null && (
        <WarmupCalculator
          onClose={() => { setWarmupFor(null); setWarmupTarget(undefined); }}
          onApply={applyWarmup}
          initialTarget={warmupTarget}
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
        <Overlay onClose={() => setConfirmCancel(false)} zIndex={100}>
          <div onClick={(e) => e.stopPropagation()} style={{ ...palette.modalPanel, padding: 22, width: "100%", maxWidth: 340 }}>
            <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 8 }}>¿Cancelar entrenamiento?</h3>
            <p style={{ fontSize: 12.5, color: palette.inkDim, marginBottom: 18 }}>Se perderá todo el progreso de esta sesión, no se guarda nada.</p>
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => setConfirmCancel(false)} style={{ flex: 1, padding: 11, borderRadius: 11, border: `1px solid ${palette.panelBorder}`, background: "none", color: palette.ink, cursor: "pointer", fontSize: 13 }}>Seguir</button>
              <button onClick={cancelWorkout} style={{ flex: 1, padding: 11, borderRadius: 11, border: "none", background: "#c0392b", color: "#fff", cursor: "pointer", fontSize: 13, fontWeight: 700 }}>Sí, cancelar</button>
            </div>
          </div>
        </Overlay>
      )}
    </div>
  );
}

function formatElapsed(ms: number) {
  const totalSec = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function SessionStat({ label, value }: { label: string; value: string }) {
  const palette = usePalette();
  return (
    <div style={{ textAlign: "center" }}>
      <div style={{ fontSize: 15, fontWeight: 700 }}>{value}</div>
      <div style={{ fontSize: 9.5, color: palette.inkDim, textTransform: "uppercase" }}>{label}</div>
    </div>
  );
}

function InfoLine({ label, value }: { label: string; value: string }) {
  const palette = usePalette();
  return (
    <div style={{ marginBottom: 8 }}>
      <div style={{ fontSize: 10.5, color: palette.accent, fontWeight: 700, textTransform: "uppercase" }}>{label}</div>
      <div style={{ fontSize: 12.5, color: palette.ink }}>{value}</div>
    </div>
  );
}

/** Pastilla para las acciones secundarias de la tarjeta (calentamiento, descanso). */
function pillStyle(palette: ReturnType<typeof usePalette>): React.CSSProperties {
  return {
    display: "flex", alignItems: "center", gap: 5,
    padding: "7px 12px", borderRadius: 999,
    border: `1px solid ${palette.panelBorder}`, background: palette.inputBg,
    fontSize: 12, fontWeight: 700, cursor: "pointer",
  };
}
