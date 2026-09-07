import { createAdminClient } from "@/lib/supabase/admin";
import { coachOwnsClient } from "@/lib/coachClientWorkouts";

/**
 * El plan completo de un cliente, visto desde el portal del entrenador.
 *
 * Hasta ahora las rutinas se veían como una lista suelta y las carpetas solo servían para
 * separarlas. Esto las junta como lo que son: un programa con un propósito, y dentro los
 * días que lo componen. Es la vista que responde "¿por qué son seis días y no cuatro?".
 *
 * Va con la service role, así que —como todo lo de este portal— la comprobación de
 * permisos la hace el código: sin `coachOwnsClient` no se devuelve nada.
 */

export type ProgramDay = {
  id: string;
  name: string;
  /** La descripción que el cliente lee antes de entrenar (columna `notes`). */
  description: string | null;
  daysOfWeek: number[];
  exerciseCount: number;
  setCount: number;
  /** Los grupos musculares que más aparecen, ya ordenados. */
  muscles: string[];
};

export type Program = {
  /** null = las rutinas sueltas, sin carpeta. */
  folder: string | null;
  description: string | null;
  days: ProgramDay[];
};

export type ClientProgram = {
  clientName: string;
  /** Lo que el entrenador le explica a ESTA persona sobre su plan. La lee ella. */
  trainingDescription: string | null;
  programs: Program[];
};

export async function getClientProgram(coachId: string, clientId: string): Promise<ClientProgram | null> {
  if (!(await coachOwnsClient(coachId, clientId))) return null;

  const admin = createAdminClient();

  const [{ data: client }, { data: routines }, { data: folders }] = await Promise.all([
    admin.from("clients").select("training_description, users(display_name, email)").eq("user_id", clientId).maybeSingle(),
    admin
      .from("routines")
      .select("id, name, notes, folder, days_of_week, created_at, routine_exercises(target_sets, exercises(muscle_group))")
      .eq("client_id", clientId)
      .order("created_at", { ascending: true }),
    admin.from("routine_folders").select("name, description").eq("trainer_id", coachId),
  ]);

  const clientName = (client as any)?.users?.display_name || (client as any)?.users?.email || "Cliente";
  const descriptionByFolder = Object.fromEntries((folders ?? []).map((f: any) => [f.name, f.description ?? null]));

  return {
    clientName,
    trainingDescription: (client as any)?.training_description ?? null,
    programs: groupIntoPrograms(routines ?? [], descriptionByFolder),
  };
}

/** Separado de la consulta para poder probarlo sin base de datos. */
export function groupIntoPrograms(routines: any[], descriptionByFolder: Record<string, string | null>): Program[] {
  const byFolder = new Map<string | null, ProgramDay[]>();

  for (const r of routines) {
    const rows = (r.routine_exercises ?? []) as any[];
    const setCount = rows.reduce((n, re) => n + ((re.target_sets ?? []).length || 0), 0);

    const muscleCounts: Record<string, number> = {};
    for (const re of rows) {
      const mg = re.exercises?.muscle_group;
      if (mg) muscleCounts[mg] = (muscleCounts[mg] ?? 0) + 1;
    }

    const day: ProgramDay = {
      id: r.id,
      name: r.name || "Rutina",
      description: r.notes ?? null,
      daysOfWeek: Array.isArray(r.days_of_week) ? r.days_of_week : [],
      exerciseCount: rows.length,
      setCount,
      muscles: Object.entries(muscleCounts).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([m]) => m),
    };

    const key = r.folder || null;
    const lista = byFolder.get(key);
    if (lista) lista.push(day);
    else byFolder.set(key, [day]);
  }

  // Los programas con nombre van primero y en orden alfabético; las rutinas sueltas, al
  // final, porque son el cajón de sastre y no un plan.
  return [...byFolder.entries()]
    .sort(([a], [b]) => {
      if (a === null) return 1;
      if (b === null) return -1;
      return a.localeCompare(b, "es");
    })
    .map(([folder, days]) => ({
      folder,
      description: folder ? descriptionByFolder[folder] ?? null : null,
      days,
    }));
}
