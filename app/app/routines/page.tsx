import { createClient } from "@/lib/supabase/server";
import { palette, glassPanel } from "@/lib/theme";
import Link from "next/link";
import { Plus, Play, Pencil } from "lucide-react";

export default async function ClientRoutinesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: clientRow } = await supabase.from("clients").select("trainer_id").eq("user_id", user!.id).single();

  const { data: routines } = await supabase
    .from("routines")
    .select("id, name, source")
    .or(`source.eq.platform,client_id.eq.${user!.id}${clientRow?.trainer_id ? `,and(trainer_id.eq.${clientRow.trainer_id},client_id.is.null)` : ""}`)
    .order("created_at", { ascending: false });

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 4 }}>Rutinas</h1>
          <p style={{ color: palette.inkDim, fontSize: 14 }}>Tuyas, del coach, y sugeridas</p>
        </div>
        <Link href="/app/routines/new" style={{
          display: "flex", alignItems: "center", gap: 6, padding: "9px 14px", borderRadius: 11,
          background: `linear-gradient(135deg, ${palette.accent}, ${palette.accentDeep})`, color: "#0A0C10",
          fontWeight: 700, fontSize: 12.5, textDecoration: "none",
        }}>
          <Plus size={14} /> Nueva
        </Link>
      </div>

      {(!routines || routines.length === 0) ? (
        <div style={{ ...glassPanel, padding: 28, textAlign: "center", color: palette.inkDim }}>
          Todavía no tienes rutinas. Crea la tuya con ayuda de la IA de Alejo.
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {routines.map((r) => (
            <div key={r.id} style={{ ...glassPanel, padding: 16, display: "flex", alignItems: "center", gap: 10 }}>
              <Link href={`/app/workout/${r.id}`} style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "space-between", textDecoration: "none", color: palette.ink }}>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 600 }}>{r.name}</div>
                  <div style={{ fontSize: 11, color: palette.inkDim, marginTop: 2 }}>
                    {r.source === "platform" ? "Sugerida por FitTrack" : r.source === "client" ? "Creada por ti" : "Asignada por tu coach"}
                  </div>
                </div>
              </Link>
              {r.source === "client" && (
                <Link href={`/app/routines/${r.id}/edit`} style={{ color: palette.inkDim, display: "flex" }}>
                  <Pencil size={16} />
                </Link>
              )}
              <Link href={`/app/workout/${r.id}`} style={{ width: 32, height: 32, borderRadius: "50%", background: palette.accent, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <Play size={13} color="#0A0C10" fill="#0A0C10" />
              </Link>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
