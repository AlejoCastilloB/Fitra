import { createClient } from "@/lib/supabase/server";
import { palette, glassPanel } from "@/lib/theme";
import Link from "next/link";
import { Flame, Play, MessageSquare } from "lucide-react";

export default async function ClientToday() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: clientRow } = await supabase.from("clients").select("trainer_id").eq("user_id", user!.id).single();

  const { data: routines } = await supabase
    .from("routines")
    .select("id, name, notes, source")
    .or(`source.eq.platform,client_id.eq.${user!.id}${clientRow?.trainer_id ? `,and(trainer_id.eq.${clientRow.trainer_id},client_id.is.null)` : ""}`)
    .limit(10);

  const { data: streak } = await supabase.from("streaks").select("current_weeks").eq("client_id", user!.id).single();

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


      <div style={{ ...glassPanel, padding: 18, display: "flex", alignItems: "center", gap: 14, marginBottom: 24 }}>
        <div style={{ width: 42, height: 42, borderRadius: 12, background: `${palette.accent}22`, display: "flex", alignItems: "center", justifyContent: "center", color: palette.accent }}>
          <Flame size={20} />
        </div>
        <div>
          <div style={{ fontSize: 18, fontWeight: 700 }}>{streak?.current_weeks ?? 0} semanas</div>
          <div style={{ fontSize: 12, color: palette.inkDim }}>de racha activa</div>
        </div>
      </div>

      <h2 style={{ fontSize: 13, fontWeight: 700, color: palette.accent, textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 10 }}>
        Tus rutinas
      </h2>

      {(!routines || routines.length === 0) ? (
        <div style={{ ...glassPanel, padding: 28, textAlign: "center", color: palette.inkDim }}>
          Todavía no tenés rutinas disponibles. {!clientRow?.trainer_id && "Podés crear la tuya propia."}
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {routines.map((r) => (
            <Link key={r.id} href={`/app/workout/${r.id}`} style={{
              ...glassPanel, padding: 16, display: "flex", alignItems: "center", justifyContent: "space-between",
              textDecoration: "none", color: palette.ink,
            }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 600 }}>{r.name}</div>
                <div style={{ fontSize: 11, color: palette.inkDim, marginTop: 2 }}>
                  {r.source === "platform" ? "Sugerida por FitTrack" : "Asignada por tu coach"}
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
