import { createClient } from "@/lib/supabase/server";
import { palette, glassPanel } from "@/lib/theme";
import Link from "next/link";
import { Flame, Play } from "lucide-react";
import HomeFab from "@/components/HomeFab";
import DayStrip, { DaySummary } from "@/components/DayStrip";

export default async function ClientToday() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const uid = user!.id;

  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);

  const [{ data: clientRow }, { data: streak }, { data: weekLogs }, { data: weekNutrition }] = await Promise.all([
    supabase.from("clients").select("trainer_id").eq("user_id", uid).single(),
    supabase.from("streaks").select("current_weeks").eq("client_id", uid).single(),
    supabase.from("workout_logs").select("date, total_volume").eq("client_id", uid).gte("date", weekAgo.toISOString()),
    supabase.from("nutrition_logs").select("date, kcal").eq("client_id", uid).gte("date", weekAgo.toISOString()),
  ]);

  const { data: routines } = await supabase
    .from("routines")
    .select("id, name, notes, source, days_of_week")
    .or(`source.eq.platform,client_id.eq.${uid}${clientRow?.trainer_id ? `,and(trainer_id.eq.${clientRow.trainer_id},client_id.is.null)` : ""}`)
    .limit(20);

  const todayDow = new Date().getDay();
  const todaysRoutine = (routines ?? []).find((r) => r.days_of_week?.includes(todayDow));
  const otherRoutines = (routines ?? []).filter((r) => r.id !== todaysRoutine?.id).slice(0, 10);

  const weekVolume = (weekLogs ?? []).reduce((sum, l) => sum + (l.total_volume ?? 0), 0);
  const weekWorkouts = weekLogs?.length ?? 0;

  const days: DaySummary[] = Array.from({ length: 7 }).map((_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    const dateStr = d.toISOString().slice(0, 10);
    const trained = (weekLogs ?? []).some((l) => l.date?.slice(0, 10) === dateStr);
    const kcal = (weekNutrition ?? []).filter((n) => n.date?.slice(0, 10) === dateStr).reduce((s, n) => s + (n.kcal ?? 0), 0);
    return { date: dateStr, trained, kcal };
  });

  return (
    <div>
      <div style={{ marginBottom: 18 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 2 }}>Hoy</h1>
        <p style={{ color: palette.inkDim, fontSize: 14 }}>Listo para entrenar</p>
      </div>

      <DayStrip days={days} />

      <div style={{ display: "flex", justifyContent: "space-between", padding: "4px 4px 22px", borderBottom: `1px solid ${palette.panelBorder}`, marginBottom: 22 }}>
        <StatText icon={<Flame size={15} color={palette.accent} />} value={`${streak?.current_weeks ?? 0}`} label="semanas de racha" />
        <StatText value={`${Math.round(weekVolume).toLocaleString()} kg`} label={`${weekWorkouts} entrenos esta semana`} />
      </div>

      {todaysRoutine && (
        <>
          <h2 style={sectionLabel}>Tu rutina de hoy</h2>
          <Link href={`/app/workout/${todaysRoutine.id}`} style={{
            ...glassPanel, padding: 18, display: "flex", alignItems: "center", justifyContent: "space-between",
            textDecoration: "none", color: palette.ink, marginBottom: 24, border: `1px solid ${palette.accent}55`,
          }}>
            <div>
              <div style={{ fontSize: 15, fontWeight: 700 }}>{todaysRoutine.name}</div>
              <div style={{ fontSize: 11.5, color: palette.inkDim, marginTop: 2 }}>Programada para hoy</div>
            </div>
            <div style={{ width: 38, height: 38, borderRadius: "50%", background: palette.accent, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <Play size={16} color="#0A0C10" fill="#0A0C10" />
            </div>
          </Link>
        </>
      )}

      <h2 style={sectionLabel}>{todaysRoutine ? "Otras rutinas" : "Tus rutinas"}</h2>

      {otherRoutines.length === 0 && !todaysRoutine ? (
        <p style={{ fontSize: 13, color: palette.inkDim, padding: "12px 4px" }}>Todavía no tienes rutinas disponibles.</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column" }}>
          {otherRoutines.map((r, i) => (
            <Link key={r.id} href={`/app/workout/${r.id}`} style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              padding: "13px 4px", textDecoration: "none", color: palette.ink,
              borderBottom: i < otherRoutines.length - 1 ? `1px solid ${palette.panelBorder}` : "none",
            }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 600 }}>{r.name}</div>
                <div style={{ fontSize: 11, color: palette.inkDim, marginTop: 2 }}>
                  {r.source === "platform" ? "Sugerida por FitTrack" : r.source === "client" ? "Creada por ti" : "Asignada por tu coach"}
                </div>
              </div>
              <Play size={15} color={palette.inkDim} />
            </Link>
          ))}
        </div>
      )}

      <HomeFab todaysRoutineId={todaysRoutine?.id ?? null} />
    </div>
  );
}

function StatText({ icon, value, label }: { icon?: React.ReactNode; value: string; label: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
      {icon}
      <div>
        <div style={{ fontSize: 15, fontWeight: 700 }}>{value}</div>
        <div style={{ fontSize: 10.5, color: palette.inkDim }}>{label}</div>
      </div>
    </div>
  );
}

const sectionLabel: React.CSSProperties = {
  fontSize: 12.5, fontWeight: 700, color: palette.accent, textTransform: "uppercase",
  letterSpacing: "0.04em", marginBottom: 10, marginTop: 4,
};
