import { createClient } from "@/lib/supabase/server";
import RoutineBuilder from "@/components/RoutineBuilder";
import { redirect } from "next/navigation";

export default async function EditClientRoutinePage({ params }: { params: { id: string } }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: routine } = await supabase.from("routines").select("*").eq("id", params.id).single();
  if (!routine || routine.created_by !== user!.id) redirect("/app/routines");

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
    // Sin esto, abrir la rutina para editarla borraba las superseries y el descanso.
    supersetGroup: typeof re.superset_group === "number" ? re.superset_group : undefined,
    restSeconds: re.target_sets?.[0]?.rest_sec ?? undefined,
  }));

  return (
        <RoutineBuilder
      role="client"
      routineId={routine.id}
      initialName={routine.name}
      initialNotes={routine.notes || ""}
      initialExercises={initialExercises}
      initialDays={routine.days_of_week || []}
    />
  );
}
