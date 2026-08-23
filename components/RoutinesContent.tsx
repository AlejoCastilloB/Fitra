"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { usePalette } from "@/lib/theme";
import { useCurrentUser } from "@/lib/useCurrentUser";
import Link from "next/link";
import { Play, Pencil, Sparkles, ChevronRight } from "lucide-react";

export default function RoutinesContent() {
  const palette = usePalette();
  const supabase = createClient();
  const uid = useCurrentUser();
  const [routines, setRoutines] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!uid) return;
    (async () => {
      const { data: clientRow } = await supabase.from("clients").select("trainer_id").eq("user_id", uid).single();
      const { data } = await supabase
        .from("routines")
        .select("id, name, source, notes")
        .or(`source.eq.platform,client_id.eq.${uid}${clientRow?.trainer_id ? `,and(trainer_id.eq.${clientRow.trainer_id},client_id.is.null)` : ""}`)
        .order("created_at", { ascending: false });
      setRoutines(data ?? []);
      setLoading(false);
    })();
  }, [uid]);

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
          <Sparkles size={21} color={palette.bg} />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 14.5, fontWeight: 700, color: palette.ink }}>Nueva rutina</div>
          <div style={{ fontSize: 11.5, color: palette.inkDim, marginTop: 1 }}>Créala tú o pídele ayuda a Fitra</div>
        </div>
        <ChevronRight size={18} color={palette.inkDim} />
      </Link>

      {loading ? (
        <p style={{ fontSize: 13, color: palette.inkDim, textAlign: "center", padding: 20 }}>Cargando...</p>
      ) : routines.length === 0 ? (
        <p style={{ fontSize: 13, color: palette.inkDim, textAlign: "center", padding: 20 }}>
          Todavía no tienes rutinas. Crea la tuya con ayuda de Fitra.
        </p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {routines.map((r, i) => (
            <div key={r.id} className="ft-fade-in-up" style={{ ...palette.glassPanel, padding: 16, animationDelay: `${Math.min(i, 8) * 0.03}s` }}>
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
                  <Play size={13} color={palette.bg} fill={palette.bg} />
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
