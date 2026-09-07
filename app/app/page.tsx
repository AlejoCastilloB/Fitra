import { createClient } from "@/lib/supabase/server";
import { getAppUser } from "@/lib/getAppUser";
import TodayScreen from "@/components/TodayScreen";
import { dayOfWeekInTimeZone, pickTimeZone } from "@/lib/timeZoneDate";

export default async function ClientToday() {
  // Ya lo resolvió el layout en este mismo request: acá sale de la caché, sin red.
  const { userId, row } = await getAppUser();
  const uid = userId!;

  const supabase = await createClient();
  const { data: clientRow } = await supabase.from("clients").select("trainer_id").eq("user_id", uid).single();

  const { data: routines } = await supabase
    .from("routines")
    .select("id, name, notes, source, days_of_week")
    .or(`source.eq.platform,client_id.eq.${uid}${clientRow?.trainer_id ? `,and(trainer_id.eq.${clientRow.trainer_id},client_id.is.null)` : ""}`)
    .limit(20);

  // Con el reloj del servidor —UTC en Vercel— todos los días entre las 7 de la tarde y
  // medianoche hora de Colombia ya era el día siguiente, así que se mostraba la rutina de
  // mañana. La zona horaria del usuario la guarda TimezoneSync al abrir la app.
  const todayDow = dayOfWeekInTimeZone(pickTimeZone(row?.timezone));
  const todaysRoutine = (routines ?? []).find((r) => r.days_of_week?.includes(todayDow));
  const otherRoutines = (routines ?? []).filter((r) => r.id !== todaysRoutine?.id).slice(0, 10);

  return (
    <TodayScreen
      displayName={row?.display_name ?? null}
      todaysRoutine={todaysRoutine ? { id: todaysRoutine.id, name: todaysRoutine.name, source: todaysRoutine.source } : null}
      otherRoutines={otherRoutines.map((r) => ({ id: r.id, name: r.name, source: r.source }))}
    />
  );
}
