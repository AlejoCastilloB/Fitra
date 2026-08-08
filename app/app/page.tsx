import { createClient } from "@/lib/supabase/server";
import { palette, glassPanel } from "@/lib/theme";
import Link from "next/link";
import { Flame, Play, MessageSquare, Camera, Sparkles, Phone } from "lucide-react";

const WHATSAPP_NUMBER = "573218660796"; // reemplaza por el número real de soporte de Alejo (con código de país, sin +)

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
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 2 }}>Hoy</h1>
        <p style={{ color: palette.inkDim, fontSize: 14 }}>Listo para entrenar</p>
      </div>

      <div style={{ display: "flex", gap: 10, marginBottom: 22 }}>
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
          <Link href="/app/nutrition/recipes" style={{ ...quickAction, flex: 1 }}>
            <Sparkles size={17} color={palette.accent} />
            <span>Hablar con la IA</span>
          </Link>
        )}
      </div>

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

      <div style={{ display: "flex", gap: 10, marginTop: 28 }}>
        <Link href="/app/nutrition/recipes" style={{
          ...contactBtn, flex: 1,
          background: `linear-gradient(135deg, ${palette.accent}22, ${palette.accentDeep}22)`,
          border: `1px solid ${palette.accent}55`, color: palette.accent,
        }}>
          <Sparkles size={16} />
          <span>Hablar con la IA</span>
        </Link>
        <a href={`https://wa.me/${WHATSAPP_NUMBER}`} target="_blank" rel="noopener noreferrer" style={{
          ...contactBtn, flex: 1, background: "#25D36622", border: "1px solid #25D36655", color: "#25D366",
        }}>
          <Phone size={16} />
          <span>Contactar a Alejo</span>
        </a>
      </div>
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

const quickAction: React.CSSProperties = {
  display: "flex", alignItems: "center", gap: 8, padding: "13px 14px", borderRadius: 14,
  border: `1px solid ${palette.panelBorder}`, background: palette.panel, textDecoration: "none",
  color: palette.ink, fontSize: 13, fontWeight: 600,
};

const contactBtn: React.CSSProperties = {
  display: "flex", alignItems: "center", justifyContent: "center", gap: 8, padding: "13px", borderRadius: 14,
  textDecoration: "none", fontSize: 13, fontWeight: 700,
};
