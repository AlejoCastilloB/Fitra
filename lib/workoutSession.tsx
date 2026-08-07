"use client";

import { createContext, useContext, useEffect, useState, useCallback } from "react";

export type LiveSet = { set_type: string; reps?: number; weight?: number; time_sec?: number; distance_m?: number; done: boolean };
export type LiveExercise = {
  id: string; name: string; media_url?: string; measurement_type: string; notes?: string;
  description?: string; equipment?: string; muscle_group?: string; instructions?: string[];
  sets: LiveSet[];
};

type Session = {
  routineId: string; routineName: string; exercises: LiveExercise[]; startedAt: number; restEndAt: number | null;
} | null;

type Ctx = {
  session: Session; now: number;
  startSession: (routineId: string, routineName: string, exercises: LiveExercise[]) => void;
  toggleSetDone: (exIdx: number, setIdx: number, restSeconds: number) => void;
  updateSet: (exIdx: number, setIdx: number, field: string, value: any) => void;
  removeSet: (exIdx: number, setIdx: number) => void;
  skipRest: () => void;
  clearSession: () => void;
};

const WorkoutSessionContext = createContext<Ctx | null>(null);
const STORAGE_KEY = "fittrack_active_workout";

export function WorkoutSessionProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session>(null);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      try { setSession(JSON.parse(raw)); } catch {}
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
    setSession({ routineId, routineName, exercises, startedAt: Date.now(), restEndAt: null });
  }, []);

  const toggleSetDone = useCallback((exIdx: number, setIdx: number, restSeconds: number) => {
    setSession((prev) => {
      if (!prev) return prev;
      const wasDone = prev.exercises[exIdx].sets[setIdx].done;
      const exercises = prev.exercises.map((ex, i) => i !== exIdx ? ex : {
        ...ex, sets: ex.sets.map((s, j) => j !== setIdx ? s : { ...s, done: !s.done }),
      });
      return { ...prev, exercises, restEndAt: wasDone ? prev.restEndAt : Date.now() + restSeconds * 1000 };
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

  const removeSet = useCallback((exIdx: number, setIdx: number) => {
    setSession((prev) => prev && {
      ...prev,
      exercises: prev.exercises.map((ex, i) => i !== exIdx ? ex : { ...ex, sets: ex.sets.filter((_, j) => j !== setIdx) }),
    });
  }, []);

  const skipRest = useCallback(() => {
    setSession((prev) => prev && { ...prev, restEndAt: null });
  }, []);

  const clearSession = useCallback(() => setSession(null), []);

  return (
    <WorkoutSessionContext.Provider value={{ session, now, startSession, toggleSetDone, updateSet, removeSet, skipRest, clearSession }}>
      {children}
    </WorkoutSessionContext.Provider>
  );
}

export function useWorkoutSession() {
  const ctx = useContext(WorkoutSessionContext);
  if (!ctx) throw new Error("useWorkoutSession debe usarse dentro de WorkoutSessionProvider");
  return ctx;
}
