import { createAdminClient } from "@/lib/supabase/admin";

export type ClientStats = {
  workoutsThisWeek: number;
  plannedThisWeek: number;
  lastWorkoutAt: string | null;
  daysLoggedFoodThisWeek: number;
  kcalToday: number;
  activeDaysThisWeek: number;
};

function startOfWeek(): Date {
  const d = new Date();
  const day = d.getDay();               // 0 = domingo
  const diffToMonday = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diffToMonday);
  d.setHours(0, 0, 0, 0);
  return d;
}

/**
 * Estadísticas de todos los clientes de un entrenador en tres consultas, no una por
 * cliente. Usa la service role porque el RLS no deja que el entrenador lea las filas
 * de entrenamiento y nutrición de sus clientes; quien llama ya verificó que esos
 * user_id le pertenecen.
 */
export async function getClientStats(clientIds: string[]): Promise<Record<string, ClientStats>> {
  const empty = (): ClientStats => ({
    workoutsThisWeek: 0, plannedThisWeek: 0, lastWorkoutAt: null,
    daysLoggedFoodThisWeek: 0, kcalToday: 0, activeDaysThisWeek: 0,
  });

  if (clientIds.length === 0) return {};

  const admin = createAdminClient();
  const weekStart = startOfWeek();
  const since = new Date(weekStart);
  since.setDate(since.getDate() - 60); // ventana amplia para sacar la última actividad

  const [{ data: workouts }, { data: meals }, { data: routines }] = await Promise.all([
    admin.from("workout_logs").select("client_id, date").in("client_id", clientIds).gte("date", since.toISOString()),
    admin.from("nutrition_logs").select("client_id, date, kcal").in("client_id", clientIds).gte("date", weekStart.toISOString()),
    admin.from("routines").select("client_id, days_of_week").in("client_id", clientIds),
  ]);

  const stats: Record<string, ClientStats> = {};
  clientIds.forEach((id) => { stats[id] = empty(); });

  const todayKey = new Date().toISOString().slice(0, 10);
  const weekStartMs = weekStart.getTime();
  const trainedDays: Record<string, Set<string>> = {};
  const foodDays: Record<string, Set<string>> = {};

  (workouts ?? []).forEach((w: any) => {
    const s = stats[w.client_id];
    if (!s || !w.date) return;
    if (!s.lastWorkoutAt || new Date(w.date) > new Date(s.lastWorkoutAt)) s.lastWorkoutAt = w.date;
    if (new Date(w.date).getTime() >= weekStartMs) {
      s.workoutsThisWeek += 1;
      (trainedDays[w.client_id] ??= new Set()).add(w.date.slice(0, 10));
    }
  });

  (meals ?? []).forEach((m: any) => {
    const s = stats[m.client_id];
    if (!s || !m.date) return;
    const day = m.date.slice(0, 10);
    (foodDays[m.client_id] ??= new Set()).add(day);
    if (day === todayKey) s.kcalToday += m.kcal ?? 0;
  });

  // Entrenamientos previstos = días de la semana marcados en las rutinas del cliente.
  const plannedDays: Record<string, Set<number>> = {};
  (routines ?? []).forEach((r: any) => {
    if (!r.client_id || !Array.isArray(r.days_of_week)) return;
    const set = (plannedDays[r.client_id] ??= new Set());
    r.days_of_week.forEach((d: number) => set.add(d));
  });

  clientIds.forEach((id) => {
    stats[id].plannedThisWeek = plannedDays[id]?.size ?? 0;
    stats[id].daysLoggedFoodThisWeek = foodDays[id]?.size ?? 0;
    const trained = trainedDays[id] ?? new Set<string>();
    const ate = foodDays[id] ?? new Set<string>();
    stats[id].activeDaysThisWeek = new Set([...trained, ...ate]).size;
  });

  return stats;
}
