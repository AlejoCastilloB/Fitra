import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getClientWorkouts } from "@/lib/coachClientWorkouts";
import CoachClientWorkoutsContent from "@/components/CoachClientWorkoutsContent";

export default async function CoachClientWorkoutsPage({ params }: { params: { id: string } }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // getClientWorkouts comprueba que este cliente sea de este entrenador y devuelve null
  // si no lo es; sin eso, la service role dejaría ver el historial de cualquiera.
  const data = await getClientWorkouts(user.id, params.id);
  if (!data) redirect("/coach/clients");

  return (
    <CoachClientWorkoutsContent
      clientId={params.id}
      clientName={data.name}
      workouts={data.workouts}
    />
  );
}
