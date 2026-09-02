import { createClient } from "@/lib/supabase/server";
import { getCoachClients } from "@/lib/coachClients";
import { getClientStats, type ClientStats } from "@/lib/coachClientStats";
import CoachClientsContent from "@/components/CoachClientsContent";

export default async function ClientsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const trainerId = user?.id ?? "";

  // Antes esto se pedía por fetch desde el navegador y cualquier fallo dejaba la lista
  // vacía en silencio: la pantalla decía "no tienes clientes" aunque sí los hubiera.
  // Ahora se resuelve en el servidor y, si falla, se dice.
  let clients: Awaited<ReturnType<typeof getCoachClients>> = [];
  let loadError: string | null = null;
  try {
    clients = await getCoachClients();
  } catch (e: any) {
    loadError = e?.message || "No pudimos cargar tus clientes. Recarga la página.";
  }

  const ids = clients.map((c) => c.user_id);

  const [stats, { data: invites }] = await Promise.all([
    ids.length ? getClientStats(ids) : Promise.resolve({} as Record<string, ClientStats>),
    supabase.from("invites").select("id, client_email").eq("trainer_id", trainerId).is("used_by", null).order("created_at", { ascending: false }),
  ]);

  return (
    <CoachClientsContent
      trainerId={trainerId}
      loadError={loadError}
      invites={(invites ?? []).map((i: any) => ({ id: i.id, client_email: i.client_email }))}
      clients={clients.map((c) => ({
        user_id: c.user_id,
        status: c.status,
        display_name: c.display_name,
        email: c.email,
        stats: stats[c.user_id] ?? {
          workoutsThisWeek: 0, plannedThisWeek: 0,
          lastWorkoutAt: null, daysLoggedFoodThisWeek: 0, kcalToday: 0, activeDaysThisWeek: 0,
        },
      }))}
    />
  );
}
