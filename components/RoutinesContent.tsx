"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { usePalette } from "@/lib/theme";
import { useCurrentUser } from "@/lib/useCurrentUser";
import Link from "next/link";
import { Pencil, Sparkles, Zap, ChevronRight } from "lucide-react";

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
      {/* Las dos formas de arrancar algo nuevo, juntas: armar una rutina para repetirla,
          o entrenar sobre la marcha. El entreno vacío vivía en el botón flotante, donde
          costaba encontrarlo y no se leía como hermano de "nueva rutina". */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 20 }}>
        <StartCard
          href="/app/routines/new"
          icon={<Sparkles size={20} color={palette.bg} />}
          title="Nueva rutina"
          subtitle="Ármala ejercicio por ejercicio"
          highlighted
        />
        <StartCard
          href="/app/workout/empty"
          icon={<Zap size={20} color={palette.accent} />}
          title="Entreno vacío"
          subtitle="Empieza y ve agregando"
        />
      </div>

      {loading ? (
        <p style={{ fontSize: 13, color: palette.inkDim, textAlign: "center", padding: 20 }}>Cargando...</p>
      ) : routines.length === 0 ? (
        <p style={{ fontSize: 13, color: palette.inkDim, textAlign: "center", padding: 20 }}>
          Todavía no tienes rutinas. Crea la primera desde “Nueva rutina”.
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
                <Link href={`/app/workout/${r.id}`} aria-label="Ver rutina" style={{ display: "flex", color: palette.inkDim, flexShrink: 0 }}>
                  <ChevronRight size={18} />
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

/** Tarjeta de "empezar algo": rutina nueva o entreno vacío. */
function StartCard({
  href, icon, title, subtitle, highlighted,
}: { href: string; icon: React.ReactNode; title: string; subtitle: string; highlighted?: boolean }) {
  const palette = usePalette();
  return (
    <Link href={href} style={{
      display: "flex", flexDirection: "column", gap: 8, padding: 16, borderRadius: 18,
      textDecoration: "none",
      background: highlighted
        ? `linear-gradient(135deg, ${palette.accent}22, ${palette.accentDeep}22)`
        : palette.inputBg,
      border: `1px solid ${highlighted ? `${palette.accent}44` : palette.panelBorder}`,
    }}>
      <div style={{
        width: 40, height: 40, borderRadius: 13, flexShrink: 0,
        display: "flex", alignItems: "center", justifyContent: "center",
        background: highlighted
          ? `linear-gradient(135deg, ${palette.accent}, ${palette.accentDeep})`
          : `${palette.accent}1F`,
      }}>
        {icon}
      </div>
      <div>
        <div style={{ fontSize: 14, fontWeight: 700, color: palette.ink }}>{title}</div>
        <div style={{ fontSize: 11, color: palette.inkDim, marginTop: 2, lineHeight: 1.35 }}>{subtitle}</div>
      </div>
    </Link>
  );
}
