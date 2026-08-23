import { createClient } from "@/lib/supabase/server";
import CoachTodayContent from "@/components/CoachTodayContent";

export default async function CoachToday() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: clients } = await supabase
    .from("clients")
    .select("user_id, status, users(email)")
    .eq("trainer_id", user!.id);

  const activeCount = clients?.filter((c) => c.status === "active").length ?? 0;
  const total = clients?.length ?? 0;

  return (
    <CoachTodayContent
      clients={(clients ?? []).map((c: any) => ({ user_id: c.user_id, status: c.status, email: c.users?.email }))}
      activeCount={activeCount}
      total={total}
    />
  );
}
