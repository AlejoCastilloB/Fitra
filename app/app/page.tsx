import { createClient } from "@/lib/supabase/server";
import TodayScreen from "@/components/TodayScreen";

export default async function ClientToday() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const uid = user!.id;

  const [{ data: clientRow }, { data: userRow }] = await Promise.all([
    supabase.from("clients").select("trainer_id").eq("user_id", uid).single(),
    supabase.from("users").select("display_name").eq("id", uid).single(),
  ]);

  const { data: routines } = await supabase
    .from("routines")
    .select("id, name, notes, source, days_of_week")
    .or(`source.eq.platform,client_id.eq.${uid}${clientRow?.trainer_id ? `,and(trainer_id.eq.${clientRow.trainer_id},client_id.is.null)` : ""}`)
    .limit(20);

  const todayDow = new Date().getDay();
  const todaysRoutine = (routines ?? []).find((r) => r.days_of_week?.includes(todayDow));
  const otherRoutines = (routines ?? []).filter((r) => r.id !== todaysRoutine?.id).slice(0, 10);

  return (
    <TodayScreen
      displayName={userRow?.display_name ?? null}
      todaysRoutine={todaysRoutine ? { id: todaysRoutine.id, name: todaysRoutine.name, source: todaysRoutine.source } : null}
      otherRoutines={otherRoutines.map((r) => ({ id: r.id, name: r.name, source: r.source }))}
    />
  );
}
