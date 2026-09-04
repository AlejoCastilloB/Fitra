"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { usePalette } from "@/lib/theme";
import { muscleLabel } from "@/lib/muscleLabels";
import { useCurrentUser } from "@/lib/useCurrentUser";
import { useWorkoutSession } from "@/lib/workoutSession";
import { finishWorkoutSession, type FinishedWorkout } from "@/lib/finishWorkout";
import { X, Plus, Timer, Trash2 } from "lucide-react";
import GifThumb from "@/components/GifThumb";
import SetTypePopover from "@/components/SetTypePopover";
import WorkoutSetRow from "@/components/WorkoutSetRow";
import RestBar from "@/components/RestBar";
import ExercisePicker from "@/components/ExercisePicker";
import ExerciseDetailModal from "@/components/ExerciseDetailModal";
import WorkoutSummary from "@/components/WorkoutSummary";
import Overlay from "@/components/Overlay";

const EMPTY_ROUTINE_ID = "empty";
const EMPTY_WORKOUT_NAME = "Entreno libre";

export default function EmptyWorkoutPage() {
  const palette = usePalette();
  const router = useRouter();
  const supabase = createClient();
  const uid = useCurrentUser();
  const { session, now, hydrated, startSession, addExercise, removeExercise, toggleSetDone, updateSet, addSet, removeSet, updateExerciseRest, adjustRest, skipRest, clearSession } = useWorkoutSession();

  const [leaving, setLeaving] = useState(false);
  const [showPicker, setShowPicker] = useState(false);
  const [editingType, setEditingType] = useState<{ exIdx: number; setIdx: number; x: number; y: number } | null>(null);
  const [editingRestFor, setEditingRestFor] = useState<number | null>(null);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [finished, setFinished] = useState<FinishedWorkout | null>(null);
  const [finishing, setFinishing] = useState(false);
  const [finishError, setFinishError] = useState<string | null>(null);
  const [detailFor, setDetailFor] = useState<{ id: string; name: string } | null>(null);
  const [confirmRemoveEx, setConfirmRemoveEx] = useState<number | null>(null);

  // El entreno vacío arranca sin tocar Supabase: no hay rutina que cargar.
  // La primera consulta ocurre recién cuando el usuario abre el buscador.
  // Esperamos a `hydrated` para no pisar una sesión guardada, y a que no estemos
  // saliendo para no revivir la sesión que el usuario acaba de cancelar.
  useEffect(() => {
    if (!hydrated || finished || leaving) return;
    if (!session) startSession(EMPTY_ROUTINE_ID, EMPTY_WORKOUT_NAME, []);
  }, [hydrated, session, finished, leaving]);

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
        supabase, uid, routineId: null, routineName: session.routineName,
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

  if (finished) {
    return <WorkoutSummary {...finished} suggestedRoutineName={EMPTY_WORKOUT_NAME} onDone={() => router.push("/app")} />;
  }

  if (!hydrated || leaving) return null;

  // Ya hay una rutina en curso: no la pisamos con un entreno vacío.
  if (session && session.routineId !== EMPTY_ROUTINE_ID) {
    return (
      <div style={{ ...palette.glassPanel, padding: 24, textAlign: "center" }}>
        <p style={{ fontSize: 14, fontWeight: 700, marginBottom: 6 }}>Ya tienes un entreno en curso</p>
        <p style={{ fontSize: 12.5, color: palette.inkDim, marginBottom: 18 }}>
          Termina o cancela "{session.routineName}" antes de empezar uno vacío.
        </p>
        <Link href={`/app/workout/${session.routineId}`} style={{
          display: "inline-block", padding: "11px 18px", borderRadius: 12, textDecoration: "none",
          background: `linear-gradient(135deg, ${palette.accent}, ${palette.accentDeep})`, color: palette.bg,
          fontWeight: 700, fontSize: 13.5,
        }}>Volver a ese entreno</Link>
      </div>
    );
  }

  if (!session) return null;

  const doneSets = session.exercises.reduce((s, ex) => s + ex.sets.filter((s2) => s2.done).length, 0);
  const volume = session.exercises.reduce((s, ex) => s + ex.sets.filter((s2) => s2.done && s2.set_type !== "warmup" && s2.weight && s2.reps).reduce((s3, s2) => s3 + s2.weight! * s2.reps!, 0), 0);
  const restLeft = session.restEndAt ? Math.max(0, Math.ceil((session.restEndAt - now) / 1000)) : 0;

  return (
    <div>
      <div style={{ ...palette.glassPanel, padding: "14px 16px", marginBottom: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: session.exercises.length ? 10 : 0 }}>
          <button onClick={() => router.push("/app")} style={{ background: "none", border: "none", color: palette.inkDim, cursor: "pointer" }}><X size={20} /></button>
          <span style={{ fontSize: 14, fontWeight: 700 }}>{session.routineName}</span>
          <button onClick={() => setConfirmCancel(true)} style={{ background: "none", border: "none", color: "#f87171", cursor: "pointer" }}><Trash2 size={18} /></button>
        </div>

        {session.exercises.length > 0 && (
          <div style={{ display: "flex", justifyContent: "space-around", paddingTop: 10, borderTop: `1px solid ${palette.panelBorder}` }}>
            <SessionStat label="Series" value={`${doneSets}`} />
            <SessionStat label="Tiempo" value={formatElapsed(now - session.startedAt)} />
            <SessionStat label="Volumen" value={`${Math.round(volume).toLocaleString("es-CO")} kg`} />
          </div>
        )}
      </div>

      {session.exercises.length === 0 ? (
        <div style={{ ...palette.glassPanel, padding: 32, textAlign: "center", marginBottom: 16 }}>
          <p style={{ fontSize: 13.5, fontWeight: 700, marginBottom: 6 }}>Entreno en blanco</p>
          <p style={{ fontSize: 12.5, color: palette.inkDim, lineHeight: 1.5 }}>
            Agrega ejercicios sobre la marcha, como te vaya saliendo. Al terminar puedes guardarlo como rutina.
          </p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", marginBottom: 16 }}>
          {session.exercises.map((ex, exIdx) => {
            const showRestHere = session.restForExIdx === exIdx && restLeft > 0;
            return (
              <div key={ex.id} style={{ ...palette.glassPanel, padding: 16, marginBottom: 14 }}>
                {/* Tocar la imagen o el nombre abre la ficha del ejercicio; el bote lo saca
                    del entreno. */}
                <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 10 }}>
                  <button
                    onClick={() => setDetailFor({ id: ex.id, name: ex.name })}
                    aria-label={`Ver la ficha de ${ex.name}`}
                    style={{ background: "none", border: "none", padding: 0, cursor: "pointer", display: "flex", flexShrink: 0 }}
                  >
                    <GifThumb src={ex.media_url} size={52} />
                  </button>
                  <button
                    onClick={() => setDetailFor({ id: ex.id, name: ex.name })}
                    style={{ flex: 1, minWidth: 0, background: "none", border: "none", padding: 0, cursor: "pointer", textAlign: "left" }}
                  >
                    <div style={{ fontSize: 14.5, fontWeight: 700, color: palette.ink }}>{ex.name}</div>
                    <div style={{ fontSize: 11.5, color: palette.inkDim, marginTop: 2 }}>
                      {muscleLabel(ex.muscle_group)} · {ex.sets.filter((s) => s.done).length}/{ex.sets.length} series
                    </div>
                  </button>
                  <button
                    onClick={() => setConfirmRemoveEx(exIdx)}
                    aria-label={`Quitar ${ex.name} del entreno`}
                    style={{ background: "none", border: "none", padding: 4, cursor: "pointer", color: palette.inkDim, display: "flex", flexShrink: 0 }}
                  >
                    <Trash2 size={15} />
                  </button>
                </div>

                <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", marginBottom: 10 }}>
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

                {ex.sets.map((s, i) => (
                  <WorkoutSetRow
                    key={i}
                    exercise={ex} set={s} index={i}
                    onOpenTypeMenu={(r) => setEditingType({ exIdx, setIdx: i, x: r.left, y: r.bottom })}
                    onChangeField={(field, v) => updateSet(exIdx, i, field, v)}
                    onToggleDone={() => toggleSetDone(exIdx, i, ex.restSeconds ?? 90)}
                    onRemove={() => removeSet(exIdx, i)}
                    onSetRpe={(n) => updateSet(exIdx, i, "rpe", n)}
                  />
                ))}

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
        <button onClick={finishWorkout} disabled={finishing || doneSets === 0} style={{
          flex: 1, padding: 14, borderRadius: 14, border: "none",
          background: `linear-gradient(135deg, ${palette.accent}, ${palette.accentDeep})`, color: palette.bg,
          fontWeight: 700, fontSize: 14.5, cursor: "pointer", opacity: (finishing || doneSets === 0) ? 0.5 : 1,
        }}>
          {finishing ? "Guardando..." : finishError ? "Reintentar" : "Terminar entreno"}
        </button>
      </div>

      {showPicker && (
        <ExercisePicker
          alreadyAddedIds={session.exercises.map((ex) => ex.id)}
          onClose={() => setShowPicker(false)}
          onPick={(ex) => {
            addExercise({
              id: ex.id, name: ex.name, media_url: ex.media_url,
              measurement_type: ex.measurement_type, muscle_group: ex.muscle_group, equipment: ex.equipment,
            });
            setShowPicker(false);
          }}
        />
      )}

      {detailFor && (
        <ExerciseDetailModal exerciseId={detailFor.id} fallbackName={detailFor.name} onClose={() => setDetailFor(null)} />
      )}

      {confirmRemoveEx !== null && session.exercises[confirmRemoveEx] && (
        <Overlay onClose={() => setConfirmRemoveEx(null)} zIndex={100}>
          <div onClick={(e) => e.stopPropagation()} style={{ ...palette.modalPanel, padding: 22, width: "100%", maxWidth: 340 }}>
            <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 8 }}>¿Quitar este ejercicio?</h3>
            <p style={{ fontSize: 12.5, color: palette.inkDim, marginBottom: 18, lineHeight: 1.5 }}>
              “{session.exercises[confirmRemoveEx].name}” sale de este entreno y se pierden las series que ya marcaste ahí.
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
          current={session.exercises[editingType.exIdx].sets[editingType.setIdx].set_type}
          x={editingType.x} y={editingType.y}
          onSelect={(type) => updateSet(editingType.exIdx, editingType.setIdx, "set_type", type)}
          onClose={() => setEditingType(null)}
          onDelete={() => removeSet(editingType.exIdx, editingType.setIdx)}
        />
      )}

      {confirmCancel && (
        <Overlay onClose={() => setConfirmCancel(false)} zIndex={100}>
          <div onClick={(e) => e.stopPropagation()} style={{ ...palette.modalPanel, padding: 22, width: "100%", maxWidth: 340 }}>
            <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 8 }}>¿Cancelar entrenamiento?</h3>
            <p style={{ fontSize: 12.5, color: palette.inkDim, marginBottom: 18 }}>Se perderá todo el progreso de esta sesión, no se guarda nada.</p>
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => setConfirmCancel(false)} style={{ flex: 1, padding: 11, borderRadius: 11, border: `1px solid ${palette.panelBorder}`, background: "none", color: palette.ink, cursor: "pointer", fontSize: 13 }}>Seguir</button>
              <button onClick={() => { setLeaving(true); clearSession(); router.push("/app"); }} style={{ flex: 1, padding: 11, borderRadius: 11, border: "none", background: "#c0392b", color: "#fff", cursor: "pointer", fontSize: 13, fontWeight: 700 }}>Sí, cancelar</button>
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

/** Pastilla para las acciones secundarias de la tarjeta (descanso). */
function pillStyle(palette: ReturnType<typeof usePalette>): React.CSSProperties {
  return {
    display: "flex", alignItems: "center", gap: 5,
    padding: "7px 12px", borderRadius: 999,
    border: `1px solid ${palette.panelBorder}`, background: palette.inputBg,
    fontSize: 12, fontWeight: 700, cursor: "pointer",
  };
}
