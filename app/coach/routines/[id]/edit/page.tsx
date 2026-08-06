import { createClient } from "@/lib/supabase/server";
import RoutineBuilder from "@/components/RoutineBuilder";
import { redirect } from "next/navigation";

export default async function EditRoutinePage({ params }: { params: { id: string } }) {
  const supabase = await createClient();

  const { data: routine } = await supabase.from("routines").select("*").eq("id", params.id).single();
  if (!routine) redirect("/coach/routines");

  const { data: routineExercises } = await supabase
    .from("routine_exercises")
    .select("exercise_id, order_index, target_sets, notes, exercises(id, name, media_url, measurement_type)")
    .eq("routine_id", params.id)
    .order("order_index");

  const initialExercises = (routineExercises ?? []).map((re: any) => ({
    id: re.exercises.id,
    name: re.exercises.name,
    media_url: re.exercises.media_url,
    measurement_type: re.exercises.measurement_type,
    sets: re.target_sets,
    notes: re.notes || "",
  }));

  return (
    <RoutineBuilder
      routineId={routine.id}
      initialName={routine.name}
      initialClientId={routine.client_id || ""}
      initialNotes={routine.notes || ""}
      initialExercises={initialExercises}
    />
  );
}
