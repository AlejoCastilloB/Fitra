import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import CoachTodayContent from "@/components/CoachTodayContent";

export default async function CoachToday() {
  const supabase = await createClient();
  const admin = createAdminClient();
  const { data: { user } } = await supabase.auth.getUser();

  // El join a "users" necesita la service role — el RLS de esa tabla solo deja
  // a cada quien leer su propia fila, así que el nombre de los clientes vuelve
  // null si se consulta con el cliente normal.
  const [{ data: clients }, { data: reminders }] = await Promise.all([
    admin.from("clients").select("user_id, status, users(display_name, email)").eq("trainer_id", user!.id),
    supabase
      .from("trainer_reminders")
      .select("id, note, remind_at, client_id")
      .eq("trainer_id", user!.id)
      .eq("done", false)
      .order("remind_at", { ascending: true })
      .limit(5),
  ]);

  const activeCount = clients?.filter((c) => c.status === "active").length ?? 0;
  const total = clients?.length ?? 0;

  const nameByClientId = Object.fromEntries(
    (clients ?? []).map((c: any) => [c.user_id, c.users?.display_name || c.users?.email || "Cliente"])
  );

  return (
    <CoachTodayContent
      clients={(clients ?? []).map((c: any) => ({ user_id: c.user_id, status: c.status, email: c.users?.display_name || c.users?.email }))}
      activeCount={activeCount}
      total={total}
      reminders={(reminders ?? []).map((r: any) => ({
        id: r.id, note: r.note, remind_at: r.remind_at,
        clientName: r.client_id ? nameByClientId[r.client_id] ?? null : null,
      }))}
    />
  );
}
