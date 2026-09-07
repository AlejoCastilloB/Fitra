import { createAdminClient } from "@/lib/supabase/admin";
import { dateKeyInTimeZone, startOfWeekInTimeZone, pickTimeZone } from "@/lib/timeZoneDate";

export type ClientStats = {
  workoutsThisWeek: number;
  plannedThisWeek: number;
  lastWorkoutAt: string | null;
  daysLoggedFoodThisWeek: number;
  kcalToday: number;
  activeDaysThisWeek: number;
};

/**
 * Estadísticas de todos los clientes de un entrenador en tres consultas, no una por
 * cliente. Usa la service role porque el RLS no deja que el entrenador lea las filas
 * de entrenamiento y nutrición de sus clientes; quien llama ya verificó que esos
 * user_id le pertenecen.
 */
export async function getClientStats(clientIds: string[], coachTimeZone?: string | null): Promise<Record<string, ClientStats>> {
  const empty = (): ClientStats => ({
    workoutsThisWeek: 0, plannedThisWeek: 0, lastWorkoutAt: null,
    daysLoggedFoodThisWeek: 0, kcalToday: 0, activeDaysThisWeek: 0,
  });

  if (clientIds.length === 0) return {};

  const admin = createAdminClient();

  // Cada cliente cuenta su semana y su "hoy" con SU reloj. El proceso corre en el
  // servidor —UTC en Vercel—, así que sin esto una cena a las 8 de la noche en Colombia
  // caía en el día siguiente y el entrenador veía otra cosa que su cliente.
  const { data: zoneRows } = await admin.from("users").select("id, timezone").in("id", clientIds);
  const zoneByClient: Record<string, string> = {};
  clientIds.forEach((id) => {
    const suya = (zoneRows ?? []).find((u: any) => u.id === id)?.timezone;
    zoneByClient[id] = pickTimeZone(suya, coachTimeZone);
  });

  // La consulta se abre con la semana MÁS TEMPRANA de todas las zonas y luego cada
  // cliente se filtra con la suya: una sola consulta para todos, sin perder filas de
  // quien vaya por delante en el calendario.
  const now = new Date();
  const weekStartByClient: Record<string, number> = {};
  clientIds.forEach((id) => { weekStartByClient[id] = startOfWeekInTimeZone(zoneByClient[id], now).getTime(); });
  const earliestWeekStart = new Date(Math.min(...Object.values(weekStartByClient)));

  const since = new Date(earliestWeekStart);
  since.setDate(since.getDate() - 60); // ventana amplia para sacar la última actividad

  const [{ data: workouts }, { data: meals }, { data: routines }, { data: lastEver }] = await Promise.all([
    admin.from("workout_logs").select("client_id, date").in("client_id", clientIds).gte("date", since.toISOString()),
    admin.from("nutrition_logs").select("client_id, date, kcal").in("client_id", clientIds).gte("date", earliestWeekStart.toISOString()),
    admin.from("routines").select("client_id, days_of_week").in("client_id", clientIds),
    // La última sesión de cada quien, aunque fuera hace un año: con la ventana de 60 días
    // la lista decía "Sin entrenos aún" de alguien cuya ficha sí mostraba entrenos. Viene
    // de más reciente a más antigua y solo se usa la primera fila de cada cliente, así que
    // el tope de 1000 no estorba —haría falta que un solo cliente tuviera mil entrenos más
    // recientes que el último de otro para dejar a alguien fuera—.
    admin.from("workout_logs").select("client_id, date").in("client_id", clientIds)
      .order("date", { ascending: false }).limit(1000),
  ]);

  const stats: Record<string, ClientStats> = {};
  clientIds.forEach((id) => { stats[id] = empty(); });

  const todayKeyByClient: Record<string, string | null> = {};
  clientIds.forEach((id) => { todayKeyByClient[id] = dateKeyInTimeZone(now, zoneByClient[id]); });

  const trainedDays: Record<string, Set<string>> = {};
  const foodDays: Record<string, Set<string>> = {};

  // Viene ordenado de más reciente a más antiguo: la primera fila de cada cliente es la
  // que vale.
  (lastEver ?? []).forEach((w: any) => {
    const s = stats[w.client_id];
    if (s && w.date && !s.lastWorkoutAt) s.lastWorkoutAt = w.date;
  });

  (workouts ?? []).forEach((w: any) => {
    const s = stats[w.client_id];
    if (!s || !w.date) return;
    if (new Date(w.date).getTime() >= weekStartByClient[w.client_id]) {
      s.workoutsThisWeek += 1;
      const day = dateKeyInTimeZone(w.date, zoneByClient[w.client_id]);
      if (day) (trainedDays[w.client_id] ??= new Set()).add(day);
    }
  });

  (meals ?? []).forEach((m: any) => {
    const s = stats[m.client_id];
    if (!s || !m.date) return;
    if (new Date(m.date).getTime() < weekStartByClient[m.client_id]) return;
    const day = dateKeyInTimeZone(m.date, zoneByClient[m.client_id]);
    if (!day) return;
    (foodDays[m.client_id] ??= new Set()).add(day);
    if (day === todayKeyByClient[m.client_id]) s.kcalToday += m.kcal ?? 0;
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
