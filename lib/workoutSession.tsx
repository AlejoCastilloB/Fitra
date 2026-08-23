"use client";

import { createContext, useContext, useEffect, useState, useCallback } from "react";

export type LiveSet = { set_type: string; reps?: number; weight?: number; time_sec?: number; distance_m?: number; done: boolean };
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
  startSession: (routineId: string, routineName: string, exercises: LiveExercise[]) => void;
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

function emptySetFor(ex: LiveExercise): LiveSet {
  const last = ex.sets[ex.sets.length - 1];
  if (last) return { ...last, done: false };
  if (ex.measurement_type === "time") return { set_type: "normal", time_sec: 30, done: false };
  if (ex.measurement_type === "time_distance") return { set_type: "normal", time_sec: 60, distance_m: 200, done: false };
  if (ex.measurement_type === "distance") return { set_type: "normal", distance_m: 100, done: false };
  return { set_type: "normal", reps: 10, weight: 0, done: false };
}

export function WorkoutSessionProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session>(null);
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
  }, []);

  useEffect(() => {
    if (session) localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
    else localStorage.removeItem(STORAGE_KEY);
  }, [session]);

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

  const toggleSetDone = useCallback((exIdx: number, setIdx: number, restSeconds: number) => {
    setSession((prev) => {
      if (!prev) return prev;
      const current = prev.exercises[exIdx];
      const wasDone = current.sets[setIdx].done;
      const exRest = current.restSeconds ?? restSeconds;
      const exercises = prev.exercises.map((ex, i) => i !== exIdx ? ex : {
        ...ex, sets: ex.sets.map((s, j) => j !== setIdx ? s : { ...s, done: !s.done }),
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
    <WorkoutSessionContext.Provider value={{ session, now, startSession, toggleSetDone, updateSet, addSet, removeSet, updateExerciseRest, adjustRest, skipRest, insertWarmupSets, clearSession }}>
      {children}
    </WorkoutSessionContext.Provider>
  );
}

export function useWorkoutSession() {
  const ctx = useContext(WorkoutSessionContext);
  if (!ctx) throw new Error("useWorkoutSession debe usarse dentro de WorkoutSessionProvider");
  return ctx;
}
