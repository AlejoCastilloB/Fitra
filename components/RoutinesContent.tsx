"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { palette, glassPanel } from "@/lib/theme";
import Link from "next/link";
import { Play, Pencil, Sparkles, ChevronRight } from "lucide-react";

export default function RoutinesContent() {
  const supabase = createClient();
  const [routines, setRoutines] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data: auth } = await supabase.auth.getUser();
      const uid = auth.user!.id;
      const { data: clientRow } = await supabase.from("clients").select("trainer_id").eq("user_id", uid).single();
      const { data } = await supabase
        .from("routines")
        .select("id, name, source, notes")
        .or(`source.eq.platform,client_id.eq.${uid}${clientRow?.trainer_id ? `,and(trainer_id.eq.${clientRow.trainer_id},client_id.is.null)` : ""}`)
        .order("created_at", { ascending: false });
      setRoutines(data ?? []);
      setLoading(false);
    })();
  }, []);

  return (
    <div>
      <Link href="/app/routines/new" style={{
        display: "flex", alignItems: "center", gap: 14, padding: 18, borderRadius: 18, marginBottom: 20,
        background: `linear-gradient(135deg, ${palette.accent}22, ${palette.accentDeep}22)`,
        border: `1px solid ${palette.accent}44`, textDecoration: "none", position: "relative", overflow: "hidden",
      }}>
        <div style={{
          width: 46, height: 46, borderRadius: 14, background: `linear-gradient(135deg, ${palette.accent}, ${palette.accentDeep})`,
          display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
        }}>
          <Sparkles size={21} color="#0A0C10" />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 14.5, fontWeight: 700, color: palette.ink }}>Nueva rutina</div>
          <div style={{ fontSize: 11.5, color: palette.inkDim, marginTop: 1 }}>Armala vos o pedile ayuda a la IA de Alejo</div>
        </div>
        <ChevronRight size={18} color={palette.inkDim} />
      </Link>

      {loading ? (
        <p style={{ fontSize: 13, color: palette.inkDim, textAlign: "center", padding: 20 }}>Cargando...</p>
      ) : routines.length === 0 ? (
        <p style={{ fontSize: 13, color: palette.inkDim, textAlign: "center", padding: 20 }}>
          Todavía no tienes rutinas. Crea la tuya con ayuda de la IA de Alejo.
        </p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {routines.map((r) => (
            <div key={r.id} style={{ ...glassPanel, padding: 16 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <Link href={`/app/workout/${r.id}`} style={{ flex: 1, textDecoration: "none", color: palette.ink }}>
                  <div style={{ fontSize: 14, fontWeight: 600 }}>{r.name}</div>
                  <div style={{ fontSize: 11, color: palette.inkDim, marginTop: 2 }}>
                    {r.source === "platform" ? "Sugerida por FitTrack" : r.source === "client" ? "Creada por ti" : "Asignada por tu coach"}
                  </div>
                </Link>
                {r.source === "client" && (
                  <Link href={`/app/routines/${r.id}/edit`} style={{ color: palette.inkDim, display: "flex" }}><Pencil size={16} /></Link>
                )}
                <Link href={`/app/workout/${r.id}`} style={{ width: 32, height: 32, borderRadius: "50%", background: palette.accent, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <Play size={13} color="#0A0C10" fill="#0A0C10" />
                </Link>
              </div>
              {r.notes && (
                <p style={{ fontSize: 11.5, color: palette.accent, marginTop: 8, paddingTop: 8, borderTop: `1px solid ${palette.panelBorder}` }}>
                  📝 {r.notes}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
