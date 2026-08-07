import { createClient } from "@/lib/supabase/server";
import { palette, glassPanel } from "@/lib/theme";
import Link from "next/link";
import { Flame, Play, MessageSquare, Camera, Sparkles } from "lucide-react";

export default async function ClientToday() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: clientRow } = await supabase.from("clients").select("trainer_id").eq("user_id", user!.id).single();

  const { data: routines } = await supabase
    .from("routines")
    .select("id, name, notes, source, days_of_week")
    .or(`source.eq.platform,client_id.eq.${user!.id}${clientRow?.trainer_id ? `,and(trainer_id.eq.${clientRow.trainer_id},client_id.is.null)` : ""}`)
    .limit(20);

  const { data: streak } = await supabase.from("streaks").select("current_weeks").eq("client_id", user!.id).single();

  const todayDow = new Date().getDay();
  const todaysRoutine = (routines ?? []).find((r) => r.days_of_week?.includes(todayDow));
  const otherRoutines = (routines ?? []).filter((r) => r.id !== todaysRoutine?.id).slice(0, 10);

  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);
  const { data: weekLogs } = await supabase.from("workout_logs").select("total_volume").eq("client_id", user!.id).gte("date", weekAgo.toISOString());
  const weekVolume = (weekLogs ?? []).reduce((sum, l) => sum + (l.total_volume ?? 0), 0);
  const weekWorkouts = weekLogs?.length ?? 0;

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 4 }}>Hoy</h1>
          <p style={{ color: palette.inkDim, fontSize: 14 }}>Listo para entrenar</p>
        </div>
        <Link href="/app/messages" style={{
          width: 40, height: 40, borderRadius: 12, background: palette.panel, border: `1px solid ${palette.panelBorder}`,
          display: "flex", alignItems: "center", justifyContent: "center", color: palette.ink, textDecoration: "none",
        }}>
          <MessageSquare size={17} />
        </Link>
      </div>

      {/* atajos rápidos */}
      <div style={{ display: "flex", gap: 10, marginBottom: 18 }}>
        <Link href="/app/nutrition" style={{ ...quickAction, flex: 1 }}>
          <Camera size={17} color={palette.accent} />
          <span>Registrar comida</span>
        </Link>
        {todaysRoutine ? (
          <Link href={`/app/workout/${todaysRoutine.id}`} style={{ ...quickAction, flex: 1, background: `${palette.accent}18`, borderColor: `${palette.accent}55` }}>
            <Play size={17} color={palette.accent} />
            <span>Entrenar hoy</span>
          </Link>
        ) : (
          <Link href="/app/routines" style={{ ...quickAction, flex: 1 }}>
            <Sparkles size={17} color={palette.accent} />
            <span>Ver rutinas</span>
          </Link>
        )}
      </div>

      {/* racha + resumen semanal */}
      <div style={{ display: "flex", gap: 10, marginBottom: 20 }}>
        <div className="ft-count" style={{ ...glassPanel, flex: 1, padding: 16, display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 38, height: 38, borderRadius: 11, background: `${palette.accent}22`, display: "flex", alignItems: "center", justifyContent: "center", color: palette.accent, flexShrink: 0 }}>
            <Flame size={17} />
          </div>
          <div>
            <div style={{ fontSize: 17, fontWeight: 700 }}>{streak?.current_weeks ?? 0}</div>
            <div style={{ fontSize: 10.5, color: palette.inkDim }}>semanas de racha</div>
          </div>
        </div>
        <div className="ft-count" style={{ ...glassPanel, flex: 1, padding: 16, animationDelay: "0.08s" }}>
          <div style={{ fontSize: 17, fontWeight: 700 }}>{Math.round(weekVolume).toLocaleString()} kg</div>
          <div style={{ fontSize: 10.5, color: palette.inkDim }}>{weekWorkouts} entrenos esta semana</div>
        </div>
      </div>

      <style>{`
        @keyframes ftCountIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: none; } }
        .ft-count { animation: ftCountIn .4s cubic-bezier(.16,.8,.24,1) both; }
      `}</style>

      {todaysRoutine && (
        <>
          <h2 style={{ fontSize: 13, fontWeight: 700, color: palette.accent, textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 10 }}>
            Tu rutina de hoy
          </h2>
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

      <h2 style={{ fontSize: 13, fontWeight: 700, color: palette.accent, textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 10 }}>
        {todaysRoutine ? "Otras rutinas" : "Tus rutinas"}
      </h2>

      {otherRoutines.length === 0 && !todaysRoutine ? (
        <div style={{ ...glassPanel, padding: 28, textAlign: "center", color: palette.inkDim }}>
          Todavía no tienes rutinas disponibles.
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {otherRoutines.map((r) => (
            <Link key={r.id} href={`/app/workout/${r.id}`} style={{
              ...glassPanel, padding: 16, display: "flex", alignItems: "center", justifyContent: "space-between",
              textDecoration: "none", color: palette.ink,
            }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 600 }}>{r.name}</div>
                <div style={{ fontSize: 11, color: palette.inkDim, marginTop: 2 }}>
                  {r.source === "platform" ? "Sugerida por FitTrack" : r.source === "client" ? "Creada por ti" : "Asignada por tu coach"}
                </div>
              </div>
              <div style={{ width: 34, height: 34, borderRadius: "50%", background: palette.accent, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <Play size={14} color="#0A0C10" fill="#0A0C10" />
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

const quickAction: React.CSSProperties = {
  display: "flex", alignItems: "center", gap: 8, padding: "13px 14px", borderRadius: 14,
  border: `1px solid ${palette.panelBorder}`, background: palette.panel, textDecoration: "none",
  color: palette.ink, fontSize: 13, fontWeight: 600,
};
