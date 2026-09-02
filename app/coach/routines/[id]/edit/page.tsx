import { createClient } from "@/lib/supabase/server";
import RoutineBuilder from "@/components/RoutineBuilder";
import { getCoachClients } from "@/lib/coachClients";
import { redirect } from "next/navigation";

export default async function EditRoutinePage({ params }: { params: { id: string } }) {
  const supabase = await createClient();

  const [{ data: routine }, clients] = await Promise.all([
    supabase.from("routines").select("*").eq("id", params.id).single(),
    getCoachClients(),
  ]);
  if (!routine) redirect("/coach/routines");

  const { data: routineExercises } = await supabase
    .from("routine_exercises")
    .select("exercise_id, order_index, target_sets, notes, superset_group, exercises(id, name, media_url, measurement_type)")
    .eq("routine_id", params.id)
    .order("order_index");

  const initialExercises = (routineExercises ?? []).map((re: any) => ({
    id: re.exercises.id,
    name: re.exercises.name,
    media_url: re.exercises.media_url,
    measurement_type: re.exercises.measurement_type,
    sets: re.target_sets ?? [],
    notes: re.notes || "",
    // La superserie no se estaba leyendo: al abrir la rutina para editarla se perdía.
    supersetGroup: typeof re.superset_group === "number" ? re.superset_group : undefined,
    // El descanso viaja dentro del JSON de las series (no hay columna propia).
    restSeconds: re.target_sets?.[0]?.rest_sec ?? undefined,
  }));

  return (
    <RoutineBuilder
      routineId={routine.id}
      initialName={routine.name}
      initialClientId={routine.client_id || ""}
      initialNotes={routine.notes || ""}
      initialExercises={initialExercises}
      initialDays={routine.days_of_week || []}
      clients={clients}
    />
  );
}
