"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { palette, glassPanel } from "@/lib/theme";
import { Plus, Dumbbell } from "lucide-react";

export default function RoutinesPage() {
  const supabase = createClient();
  const [routines, setRoutines] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data: auth } = await supabase.auth.getUser();
      const { data } = await supabase
        .from("routines")
        .select("id, name, client_id, clients(users(email))")
        .eq("trainer_id", auth.user!.id)
        .order("created_at", { ascending: false });
      setRoutines(data ?? []);
      setLoading(false);
    })();
  }, []);

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 4 }}>Rutinas</h1>
          <p style={{ color: palette.inkDim, fontSize: 14 }}>Plantillas y rutinas asignadas</p>
        </div>
        <Link href="/coach/routines/new" style={{
          display: "flex", alignItems: "center", gap: 6, padding: "10px 16px", borderRadius: 12,
          background: `linear-gradient(135deg, ${palette.accent}, ${palette.accentDeep})`, color: "#0A0C10",
          fontWeight: 700, fontSize: 13.5, textDecoration: "none",
        }}>
          <Plus size={15} /> Nueva rutina
        </Link>
      </div>

      {loading ? (
        <div style={{ ...glassPanel, padding: 32, textAlign: "center", color: palette.inkDim }}>Cargando...</div>
      ) : routines.length === 0 ? (
        <div style={{ ...glassPanel, padding: 32, textAlign: "center", color: palette.inkDim }}>
          Todavía no armaste ninguna rutina.
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {routines.map((r) => (
            <div key={r.id} style={{ ...glassPanel, padding: 16, display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: `${palette.accent}22`, display: "flex", alignItems: "center", justifyContent: "center", color: palette.accent }}>
                <Dumbbell size={16} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 600 }}>{r.name}</div>
                <div style={{ fontSize: 12, color: palette.inkDim }}>
                  {r.client_id ? `Asignada a ${r.clients?.users?.email}` : "Plantilla (sin asignar)"}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
