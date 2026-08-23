import { createClient } from "@/lib/supabase/server";
import CoachTodayContent from "@/components/CoachTodayContent";

export default async function CoachToday() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const [{ data: clients }, { data: reminders }] = await Promise.all([
    supabase.from("clients").select("user_id, status, users(display_name, email)").eq("trainer_id", user!.id),
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
      clients={(clients ?? []).map((c: any) => ({ user_id: c.user_id, status: c.status, email: c.users?.email }))}
      activeCount={activeCount}
      total={total}
      reminders={(reminders ?? []).map((r: any) => ({
        id: r.id, note: r.note, remind_at: r.remind_at,
        clientName: r.client_id ? nameByClientId[r.client_id] ?? null : null,
      }))}
    />
  );
}
