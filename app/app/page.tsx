import { createClient } from "@/lib/supabase/server";
import { palette } from "@/lib/theme";
import Link from "next/link";
import { Play } from "lucide-react";
import DayStrip from "@/components/DayStrip";
import TodayCards from "@/components/TodayCards";

export default async function ClientToday() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const uid = user!.id;

  const { data: clientRow } = await supabase.from("clients").select("trainer_id").eq("user_id", uid).single();

  const { data: routines } = await supabase
    .from("routines")
    .select("id, name, notes, source, days_of_week")
    .or(`source.eq.platform,client_id.eq.${uid}${clientRow?.trainer_id ? `,and(trainer_id.eq.${clientRow.trainer_id},client_id.is.null)` : ""}`)
    .limit(20);

  const todayDow = new Date().getDay();
  const todaysRoutine = (routines ?? []).find((r) => r.days_of_week?.includes(todayDow));
  const otherRoutines = (routines ?? []).filter((r) => r.id !== todaysRoutine?.id).slice(0, 10);

  return (
    <div>
      <div style={{ marginBottom: 18 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 2 }}>Hoy</h1>
        <p style={{ color: palette.inkDim, fontSize: 14 }}>Listo para entrenar</p>
      </div>

      <DayStrip />

      <TodayCards todaysRoutine={todaysRoutine ? { id: todaysRoutine.id, name: todaysRoutine.name } : null} />

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
    </div>
  );
}

const sectionLabel: React.CSSProperties = {
  fontSize: 12.5, fontWeight: 700, color: palette.accent, textTransform: "uppercase",
  letterSpacing: "0.04em", marginBottom: 10, marginTop: 4,
};
