import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { coachOwnsClient } from "@/lib/coachClientWorkouts";
import { buildWorkoutLogView } from "@/lib/workoutLogView";
import CoachWorkoutLogContent from "@/components/CoachWorkoutLogContent";

export default async function CoachWorkoutLogPage({ params }: { params: { id: string; logId: string } }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  if (!(await coachOwnsClient(user.id, params.id))) redirect("/coach/clients");

  const view = await buildWorkoutLogView(createAdminClient(), params.logId);

  // Doble comprobación: que el entreno pertenezca de verdad al cliente de la URL. Sin
  // esto, cambiando el id del registro a mano se podría ver el de cualquier otra persona
  // teniendo un solo cliente propio.
  if (!view || view.clientId !== params.id) redirect(`/coach/clients/${params.id}/workouts`);

  const { data: client } = await createAdminClient()
    .from("clients").select("users(display_name, email)").eq("user_id", params.id).maybeSingle();
  const clientName = (client as any)?.users?.display_name || (client as any)?.users?.email || "Cliente";

  return <CoachWorkoutLogContent clientId={params.id} clientName={clientName} view={view} />;
}
