import { createClient } from "@/lib/supabase/server";
import { buildWorkoutLogView } from "@/lib/workoutLogView";
import WorkoutLogDetail from "@/components/WorkoutLogDetail";

export default async function WorkoutLogDetailPage({ params }: { params: { id: string } }) {
  const supabase = await createClient();
  // Con el cliente normal: el RLS ya impide leer un entreno que no sea de esta persona.
  const view = await buildWorkoutLogView(supabase, params.id);

  if (!view) {
    return (
      <div style={{ textAlign: "center", padding: 40, color: "#8A93A0" }}>
        No encontramos este entrenamiento.
      </div>
    );
  }

  return (
    <WorkoutLogDetail
      workoutLogId={view.id}
      routineName={view.routineName}
      date={view.date}
      durationSec={view.durationSec}
      totalVolume={view.totalVolume}
      totalSets={view.totalSets}
      muscleDistribution={view.muscleDistribution}
      exercises={view.exercises}
      exercisesForMenu={view.exercises.map((ex) => ({ exercise_id: ex.id, name: ex.name, measurement_type: ex.measurement_type, sets: ex.sets }))}
    />
  );
}
