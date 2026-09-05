import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Lectura de los entrenamientos de los clientes desde el portal del entrenador.
 *
 * Va con la service role porque el RLS de workout_logs y set_logs solo deja a cada quien
 * leer lo suyo, y el entrenador necesita ver lo de sus clientes. Eso quiere decir que la
 * comprobación de permisos la hace este archivo y no la base: TODA función de aquí exige
 * el id del entrenador y confirma contra la tabla `clients` que esa persona es suya.
 * Nada de esto debe llamarse sin ese id.
 */

export type CoachWorkoutRow = {
  id: string;
  clientId: string;
  clientName: string;
  date: string;
  routineName: string;
  durationSec: number;
  totalVolume: number;
};

/** ¿Este cliente es de este entrenador? Puerta obligatoria antes de mostrar nada suyo. */
export async function coachOwnsClient(coachId: string, clientId: string): Promise<boolean> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("clients")
    .select("user_id")
    .eq("user_id", clientId)
    .eq("trainer_id", coachId)
    .maybeSingle();
  return !!data;
}

/** Nombres de los clientes de un entrenador, por id. */
async function clientNames(coachId: string): Promise<Record<string, string>> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("clients")
    .select("user_id, users(display_name, email)")
    .eq("trainer_id", coachId);

  return Object.fromEntries(
    (data ?? []).map((c: any) => [c.user_id, c.users?.display_name || c.users?.email || "Cliente"])
  );
}

/** Últimos entrenamientos de TODOS los clientes del entrenador, para el panel. */
async function recentForClients(names: Record<string, string>, limit: number): Promise<CoachWorkoutRow[]> {
  const ids = Object.keys(names);
  if (ids.length === 0) return [];

  const admin = createAdminClient();
  const { data } = await admin
    .from("workout_logs")
    .select("id, client_id, date, duration_sec, total_volume, routines(name)")
    .in("client_id", ids)
    .order("date", { ascending: false })
    .limit(limit);

  return (data ?? []).map((w: any) => ({
    id: w.id,
    clientId: w.client_id,
    clientName: names[w.client_id] ?? "Cliente",
    date: w.date,
    routineName: w.routines?.name || "Entreno libre",
    durationSec: w.duration_sec ?? 0,
    totalVolume: w.total_volume ?? 0,
  }));
}

export type CoachTrainingOverview = {
  recent: CoachWorkoutRow[];
  weekWorkouts: number;
  weekSeconds: number;
  weekActiveClients: number;
};

/**
 * Todo lo que el panel del entrenador necesita sobre entrenamientos: los últimos de
 * cualquier cliente y el resumen de los últimos 7 días. Va junto para no pedir dos veces
 * la lista de clientes.
 */
export async function getCoachTrainingOverview(coachId: string, limit = 12): Promise<CoachTrainingOverview> {
  const names = await clientNames(coachId);
  const ids = Object.keys(names);
  if (ids.length === 0) return { recent: [], weekWorkouts: 0, weekSeconds: 0, weekActiveClients: 0 };

  const admin = createAdminClient();
  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  const [recent, week] = await Promise.all([
    recentForClients(names, limit),
    admin.from("workout_logs").select("client_id, duration_sec").in("client_id", ids).gte("date", since),
  ]);

  const rows = (week.data ?? []) as any[];
  return {
    recent,
    weekWorkouts: rows.length,
    weekSeconds: rows.reduce((s, r) => s + (r.duration_sec ?? 0), 0),
    weekActiveClients: new Set(rows.map((r) => r.client_id)).size,
  };
}

/** Historial de un cliente concreto. Devuelve null si no es cliente de este entrenador. */
export async function getClientWorkouts(
  coachId: string, clientId: string, limit = 60,
): Promise<{ name: string; workouts: CoachWorkoutRow[] } | null> {
  const admin = createAdminClient();
  const { data: client } = await admin
    .from("clients")
    .select("user_id, users(display_name, email)")
    .eq("user_id", clientId)
    .eq("trainer_id", coachId)
    .maybeSingle();

  if (!client) return null;

  const name = (client as any).users?.display_name || (client as any).users?.email || "Cliente";

  const { data } = await admin
    .from("workout_logs")
    .select("id, client_id, date, duration_sec, total_volume, routines(name)")
    .eq("client_id", clientId)
    .order("date", { ascending: false })
    .limit(limit);

  return {
    name,
    workouts: (data ?? []).map((w: any) => ({
      id: w.id,
      clientId: w.client_id,
      clientName: name,
      date: w.date,
      routineName: w.routines?.name || "Entreno libre",
      durationSec: w.duration_sec ?? 0,
      totalVolume: w.total_volume ?? 0,
    })),
  };
}

/**
 * Lo que se muestra en la ficha de un cliente: sus números de siempre y los últimos
 * entrenos con enlace al detalle. Devuelve null si no es cliente de este entrenador.
 */
export async function getClientTrainingPanel(coachId: string, clientId: string, recentLimit = 5) {
  if (!(await coachOwnsClient(coachId, clientId))) return null;

  const admin = createAdminClient();
  const [{ data: all }, { data: last }] = await Promise.all([
    admin.from("workout_logs").select("date, duration_sec, total_volume").eq("client_id", clientId),
    admin
      .from("workout_logs")
      .select("id, client_id, date, duration_sec, total_volume, routines(name)")
      .eq("client_id", clientId)
      .order("date", { ascending: false })
      .limit(recentLimit),
  ]);

  const rows = all ?? [];
  const totalSeconds = rows.reduce((s, r: any) => s + (r.duration_sec ?? 0), 0);
  const totalVolume = rows.reduce((s, r: any) => s + (r.total_volume ?? 0), 0);
  const dates = rows.map((r: any) => r.date).filter(Boolean).sort();

  return {
    totalWorkouts: rows.length,
    totalSeconds,
    totalVolume,
    averageSeconds: rows.length > 0 ? Math.round(totalSeconds / rows.length) : 0,
    lastWorkoutAt: dates.length > 0 ? dates[dates.length - 1] : null,
    recent: (last ?? []).map((w: any) => ({
      id: w.id,
      clientId: w.client_id,
      clientName: "",
      date: w.date,
      routineName: w.routines?.name || "Entreno libre",
      durationSec: w.duration_sec ?? 0,
      totalVolume: w.total_volume ?? 0,
    })) as CoachWorkoutRow[],
  };
}
