import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { muscleVolume, combineMuscleVolume, effectiveSetCount, type MuscleVolume } from "@/lib/muscleVolume";

/**
 * Una carpeta con todo lo que hay dentro, lista para pintar.
 *
 * La carpeta es el programa: seis días que se leen juntos. Aquí se calcula el reparto de
 * series por músculo de cada día y el del conjunto, que es el número con el que de verdad
 * se planifica —"¿cuánto pecho a la semana?"—.
 */

export type FolderRoutine = {
  id: string;
  name: string;
  description: string | null;
  daysOfWeek: number[];
  clientName: string | null;
  exerciseCount: number;
  /** Series efectivas: sin calentamiento ni dropsets. */
  effectiveSets: number;
  muscles: MuscleVolume[];
};

export type FolderView = {
  folder: string;
  description: string | null;
  routines: FolderRoutine[];
  /** El reparto del programa entero. */
  totalMuscles: MuscleVolume[];
  totalEffectiveSets: number;
};

export async function getFolderView(folder: string): Promise<FolderView | null> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  // Filtrado por entrenador: sin esto, cambiando el nombre de la carpeta en la URL se
  // vería la de cualquier otro.
  const { data: routines } = await supabase
    .from("routines")
    .select("id, name, notes, days_of_week, client_id, sort_order, created_at, routine_exercises(target_sets, exercises(muscle_group, secondary_muscles))")
    .eq("trainer_id", user.id)
    .eq("folder", folder)
    .order("sort_order", { ascending: true, nullsFirst: false })
    .order("created_at", { ascending: true });

  if (!routines || routines.length === 0) return null;

  const { data: folderRow } = await supabase
    .from("routine_folders").select("description").eq("trainer_id", user.id).eq("name", folder).maybeSingle();

  // Los nombres de los clientes necesitan la service role: el RLS de `users` no deja al
  // entrenador leer la fila de otra persona. Se acota a SUS clientes.
  const admin = createAdminClient();
  const { data: clients } = await admin
    .from("clients").select("user_id, users(display_name, email)").eq("trainer_id", user.id);
  const nameByClient = Object.fromEntries(
    (clients ?? []).map((c: any) => [c.user_id, c.users?.display_name || c.users?.email || "Cliente"])
  );

  const shaped: FolderRoutine[] = (routines as any[]).map((r) => {
    const filas = (r.routine_exercises ?? []) as any[];
    const paraVolumen = filas.map((re) => ({
      muscleGroup: re.exercises?.muscle_group,
      secondaryMuscles: re.exercises?.secondary_muscles,
      sets: (re.target_sets ?? []) as { set_type?: string | null }[],
    }));

    return {
      id: r.id,
      name: r.name || "Rutina",
      description: r.notes ?? null,
      daysOfWeek: Array.isArray(r.days_of_week) ? r.days_of_week : [],
      clientName: r.client_id ? nameByClient[r.client_id] ?? null : null,
      exerciseCount: filas.length,
      effectiveSets: paraVolumen.reduce((n, ex) => n + effectiveSetCount(ex.sets), 0),
      muscles: muscleVolume(paraVolumen),
    };
  });

  return {
    folder,
    description: folderRow?.description ?? null,
    routines: shaped,
    totalMuscles: combineMuscleVolume(shaped.map((r) => r.muscles)),
    totalEffectiveSets: shaped.reduce((n, r) => n + r.effectiveSets, 0),
  };
}
