"use client";

import { createContext, useContext, useEffect, useState, useCallback } from "react";

/** Valores objetivo que trae la rutina. Sirven de dos cosas: se muestran en gris dentro
 *  del campo vacío (para saber qué tocaba hacer) y se rellenan solos al marcar la serie
 *  como hecha si el campo quedó en blanco. */
export type SetTarget = { reps?: number; weight?: number; time_sec?: number; distance_m?: number };

export type LiveSet = {
  set_type: string; reps?: number; weight?: number; time_sec?: number; distance_m?: number; rpe?: number; done: boolean;
  target?: SetTarget;
};
export type LiveExercise = {
  id: string; name: string; media_url?: string; measurement_type: string; notes?: string;
  description?: string; equipment?: string; muscle_group?: string; instructions?: string[];
  restSeconds?: number; supersetGroup?: number;
  sets: LiveSet[];
};

type Session = {
  routineId: string; routineName: string; exercises: LiveExercise[]; startedAt: number;
  restEndAt: number | null; restForExIdx: number | null;
} | null;

type Ctx = {
  session: Session; now: number;
  /** false hasta que se leyó la sesión persistida en localStorage. */
  hydrated: boolean;
  startSession: (routineId: string, routineName: string, exercises: LiveExercise[]) => void;
  addExercise: (exercise: Omit<LiveExercise, "sets"> & { sets?: LiveSet[] }) => void;
  removeExercise: (exIdx: number) => void;
  toggleSetDone: (exIdx: number, setIdx: number, restSeconds: number) => void;
  updateSet: (exIdx: number, setIdx: number, field: string, value: any) => void;
  addSet: (exIdx: number) => void;
  removeSet: (exIdx: number, setIdx: number) => void;
  updateExerciseRest: (exIdx: number, seconds: number) => void;
  adjustRest: (deltaSeconds: number) => void;
  skipRest: () => void;
  insertWarmupSets: (exIdx: number, sets: { weight: number; reps: number }[]) => void;
  clearSession: () => void;
};

const WorkoutSessionContext = createContext<Ctx | null>(null);
const STORAGE_KEY = "fittrack_active_workout";

// Las series nuevas nacen SIN valores: el número sugerido va en `target`, que se pinta en
// gris dentro del campo. Así el campo se puede dejar en blanco y escribir directo, en vez
// de tener que borrar primero un cero que no se dejaba borrar.
function emptySetFor(ex: LiveExercise): LiveSet {
  const last = ex.sets[ex.sets.length - 1];
  if (last) return { ...last, done: false, rpe: undefined };
  if (ex.measurement_type === "time") return { set_type: "normal", done: false, target: { time_sec: 30 } };
  if (ex.measurement_type === "time_distance") return { set_type: "normal", done: false, target: { time_sec: 60, distance_m: 200 } };
  if (ex.measurement_type === "distance") return { set_type: "normal", done: false, target: { distance_m: 100 } };
  return { set_type: "normal", done: false, target: { reps: 10 } };
}

/** Al confirmar una serie, los campos que quedaron vacíos toman el valor objetivo. */
function applyTarget(s: LiveSet): LiveSet {
  const t = s.target;
  if (!t) return s;
  return {
    ...s,
    reps: s.reps ?? t.reps,
    weight: s.weight ?? t.weight,
    time_sec: s.time_sec ?? t.time_sec,
    distance_m: s.distance_m ?? t.distance_m,
  };
}

export function WorkoutSessionProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session>(null);
  const [hydrated, setHydrated] = useState(false);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        if (parsed && parsed.restForExIdx === undefined) parsed.restForExIdx = null;
        setSession(parsed);
      } catch {}
    }
    setHydrated(true);
  }, []);

  // Recién persistimos después de hidratar, para no borrar la sesión guardada
  // con el `session: null` del primer render.
  useEffect(() => {
    if (!hydrated) return;
    if (session) localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
    else localStorage.removeItem(STORAGE_KEY);
  }, [session, hydrated]);

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const startSession = useCallback((routineId: string, routineName: string, exercises: LiveExercise[]) => {
    setSession({
      routineId, routineName,
      exercises: exercises.map((e) => ({ restSeconds: 90, ...e })),
      startedAt: Date.now(), restEndAt: null, restForExIdx: null,
    });
  }, []);

  // Agrega un ejercicio a la sesión en curso (entrenamiento vacío / sobre la marcha).
  const addExercise = useCallback((exercise: Omit<LiveExercise, "sets"> & { sets?: LiveSet[] }) => {
    setSession((prev) => {
      if (!prev) return prev;
      if (prev.exercises.some((e) => e.id === exercise.id)) return prev;
      const next: LiveExercise = { restSeconds: 90, ...exercise, sets: exercise.sets ?? [] };
      if (next.sets.length === 0) next.sets = [emptySetFor(next)];
      return { ...prev, exercises: [...prev.exercises, next] };
    });
  }, []);

  // Sacar un ejercicio de la sesión en curso (ej. la máquina está ocupada y se cambia).
  const removeExercise = useCallback((exIdx: number) => {
    setSession((prev) => {
      if (!prev) return prev;
      const exercises = prev.exercises.filter((_, i) => i !== exIdx);
      // Si el descanso pertenecía al ejercicio borrado se corta; si era de uno posterior,
      // su índice se corre una posición hacia arriba.
      let { restEndAt, restForExIdx } = prev;
      if (restForExIdx === exIdx) { restEndAt = null; restForExIdx = null; }
      else if (restForExIdx != null && restForExIdx > exIdx) restForExIdx -= 1;
      return { ...prev, exercises, restEndAt, restForExIdx };
    });
  }, []);

  const toggleSetDone = useCallback((exIdx: number, setIdx: number, restSeconds: number) => {
    setSession((prev) => {
      if (!prev) return prev;
      const current = prev.exercises[exIdx];
      const wasDone = current.sets[setIdx].done;
      const exRest = current.restSeconds ?? restSeconds;
      const exercises = prev.exercises.map((ex, i) => i !== exIdx ? ex : {
        ...ex,
        sets: ex.sets.map((s, j) => j !== setIdx ? s : (wasDone ? { ...s, done: false } : { ...applyTarget(s), done: true })),
      });

      let shouldRest = true;
      if (current.supersetGroup != null) {
        const groupIndices = prev.exercises
          .map((ex, i) => (ex.supersetGroup === current.supersetGroup ? i : -1))
          .filter((i) => i >= 0);
        shouldRest = exIdx === Math.max(...groupIndices);
      }
      if (current.sets[setIdx + 1]?.set_type === "dropset") shouldRest = false;

      if (wasDone || !shouldRest) {
        return { ...prev, exercises };
      }
      return { ...prev, exercises, restEndAt: Date.now() + exRest * 1000, restForExIdx: exIdx };
    });
  }, []);

  const updateSet = useCallback((exIdx: number, setIdx: number, field: string, value: any) => {
    setSession((prev) => prev && {
      ...prev,
      exercises: prev.exercises.map((ex, i) => i !== exIdx ? ex : {
        ...ex, sets: ex.sets.map((s, j) => j !== setIdx ? s : { ...s, [field]: value }),
      }),
    });
  }, []);

  const addSet = useCallback((exIdx: number) => {
    setSession((prev) => prev && {
      ...prev,
      exercises: prev.exercises.map((ex, i) => i !== exIdx ? ex : { ...ex, sets: [...ex.sets, emptySetFor(ex)] }),
    });
  }, []);

  const removeSet = useCallback((exIdx: number, setIdx: number) => {
    setSession((prev) => prev && {
      ...prev,
      exercises: prev.exercises.map((ex, i) => i !== exIdx ? ex : { ...ex, sets: ex.sets.filter((_, j) => j !== setIdx) }),
    });
  }, []);

  const updateExerciseRest = useCallback((exIdx: number, seconds: number) => {
    setSession((prev) => prev && {
      ...prev,
      exercises: prev.exercises.map((ex, i) => i !== exIdx ? ex : { ...ex, restSeconds: seconds }),
    });
  }, []);

  const adjustRest = useCallback((deltaSeconds: number) => {
    setSession((prev) => {
      if (!prev || !prev.restEndAt) return prev;
      const next = Math.max(Date.now(), prev.restEndAt + deltaSeconds * 1000);
      return { ...prev, restEndAt: next };
    });
  }, []);

  const skipRest = useCallback(() => {
    setSession((prev) => prev && { ...prev, restEndAt: null, restForExIdx: null });
  }, []);

  const insertWarmupSets = useCallback((exIdx: number, sets: { weight: number; reps: number }[]) => {
    setSession((prev) => {
      if (!prev) return prev;
      const warmupSets: LiveSet[] = sets.map((s) => ({ set_type: "warmup", weight: s.weight, reps: s.reps, done: false }));
      return {
        ...prev,
        exercises: prev.exercises.map((ex, i) => i !== exIdx ? ex : { ...ex, sets: [...warmupSets, ...ex.sets] }),
      };
    });
  }, []);

  const clearSession = useCallback(() => setSession(null), []);

  return (
    <WorkoutSessionContext.Provider value={{ session, now, hydrated, startSession, addExercise, removeExercise, toggleSetDone, updateSet, addSet, removeSet, updateExerciseRest, adjustRest, skipRest, insertWarmupSets, clearSession }}>
      {children}
    </WorkoutSessionContext.Provider>
  );
}

export function useWorkoutSession() {
  const ctx = useContext(WorkoutSessionContext);
  if (!ctx) throw new Error("useWorkoutSession debe usarse dentro de WorkoutSessionProvider");
  return ctx;
}
