"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { usePalette, type Palette } from "@/lib/theme";
import { Plus, Dumbbell, Pencil, Trash2, RefreshCw } from "lucide-react";
import { ROUTINE_DURATION_OPTIONS } from "@/lib/units";

export default function RoutinesPage() {
  const palette = usePalette();
  const supabase = createClient();
  const [routines, setRoutines] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    const { data: auth } = await supabase.auth.getUser();

    const { data: r } = await supabase
      .from("routines")
      .select("id, name, client_id, assigned_at, duration_days, auto_renew")
      .eq("trainer_id", auth.user!.id)
      .order("created_at", { ascending: false });
    setRoutines(r ?? []);

    const { data: c } = await supabase.from("clients").select("user_id, users(email)").eq("trainer_id", auth.user!.id);
    setClients(c ?? []);

    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function reassign(routineId: string, newClientId: string) {
    await supabase.from("routines").update({
      client_id: newClientId || null,
      assigned_at: newClientId ? new Date().toISOString() : null,
    }).eq("id", routineId);
    load();
  }

  async function updateDuration(routineId: string, durationDays: number | null) {
    await supabase.from("routines").update({ duration_days: durationDays }).eq("id", routineId);
    load();
  }

  async function toggleAutoRenew(routineId: string, autoRenew: boolean) {
    await supabase.from("routines").update({ auto_renew: autoRenew }).eq("id", routineId);
    load();
  }

  async function deleteRoutine(routineId: string) {
    if (!confirm("¿Eliminar esta rutina? No se puede deshacer.")) return;
    await supabase.from("routines").delete().eq("id", routineId);
    load();
  }

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 4 }}>Rutinas</h1>
          <p style={{ color: palette.inkDim, fontSize: 14 }}>Plantillas y rutinas asignadas</p>
        </div>
        <Link href="/coach/routines/new" style={{
          display: "flex", alignItems: "center", gap: 6, padding: "10px 16px", borderRadius: 12,
          background: `linear-gradient(135deg, ${palette.accent}, ${palette.accentDeep})`, color: palette.bg,
          fontWeight: 700, fontSize: 13.5, textDecoration: "none",
        }}>
          <Plus size={15} /> Nueva rutina
        </Link>
      </div>

      {loading ? (
        <div style={{ ...palette.glassPanel, padding: 32, textAlign: "center", color: palette.inkDim }}>Cargando...</div>
      ) : routines.length === 0 ? (
        <div style={{ ...palette.glassPanel, padding: 32, textAlign: "center", color: palette.inkDim }}>Todavía no armaste ninguna rutina.</div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {routines.map((r, i) => {
            const daysLeft = r.assigned_at && r.duration_days
              ? r.duration_days - Math.floor((Date.now() - new Date(r.assigned_at).getTime()) / 86400000)
              : null;
            return (
            <div key={r.id} className="ft-fade-in-up" style={{ ...palette.glassPanel, padding: 16, display: "flex", flexDirection: "column", gap: 10, animationDelay: `${Math.min(i, 8) * 0.03}s` }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: `${palette.accent}22`, display: "flex", alignItems: "center", justifyContent: "center", color: palette.accent, flexShrink: 0 }}>
                  <Dumbbell size={16} />
                </div>
                <div style={{ flex: 1, minWidth: 140 }}>
                  <div style={{ fontSize: 14, fontWeight: 600 }}>{r.name}</div>
                  {r.client_id && (
                    <div style={{ fontSize: 11, color: palette.inkDim }}>
                      {r.duration_days == null
                        ? "Sin vencimiento"
                        : r.auto_renew
                        ? `Se renueva cada ${r.duration_days} días`
                        : daysLeft !== null && daysLeft <= 0
                        ? "Vencida"
                        : `Vence en ${daysLeft} días`}
                    </div>
                  )}
                </div>

                <select
                  value={r.client_id || ""}
                  onChange={(e) => reassign(r.id, e.target.value)}
                  style={{ padding: "7px 10px", borderRadius: 9, border: `1px solid ${palette.panelBorder}`, background: palette.inputBg, color: palette.ink, fontSize: 12.5 }}
                >
                  <option value="">Sin asignar</option>
                  {clients.map((c) => <option key={c.user_id} value={c.user_id}>{c.users?.email}</option>)}
                </select>

                <Link href={`/coach/routines/${r.id}/edit`} style={{ display: "flex", background: "none", border: "none", color: palette.accent, cursor: "pointer" }}>
                  <Pencil size={16} />
                </Link>
                <button onClick={() => deleteRoutine(r.id)} style={{ background: "none", border: "none", color: palette.inkDim, cursor: "pointer", display: "flex" }}>
                  <Trash2 size={16} />
                </button>
              </div>

              {r.client_id && (
                <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap", paddingLeft: 48 }}>
                  {ROUTINE_DURATION_OPTIONS.map((o) => (
                    <button key={String(o.value)} onClick={() => updateDuration(r.id, o.value)} style={{
                      padding: "5px 10px", borderRadius: 999, fontSize: 11, cursor: "pointer", fontWeight: 600,
                      border: `1px solid ${r.duration_days === o.value ? palette.accent : palette.panelBorder}`,
                      background: r.duration_days === o.value ? `${palette.accent}22` : palette.inputBg,
                      color: r.duration_days === o.value ? palette.accent : palette.inkDim,
                    }}>{o.label}</button>
                  ))}
                  {r.duration_days != null && (
                    <button onClick={() => toggleAutoRenew(r.id, !r.auto_renew)} style={{
                      display: "flex", alignItems: "center", gap: 5, padding: "5px 10px", borderRadius: 999, fontSize: 11, cursor: "pointer", fontWeight: 600,
                      border: `1px solid ${r.auto_renew ? palette.accent : palette.panelBorder}`,
                      background: r.auto_renew ? `${palette.accent}22` : palette.inputBg,
                      color: r.auto_renew ? palette.accent : palette.inkDim,
                    }}>
                      <RefreshCw size={11} /> Renovar automático
                    </button>
                  )}
                </div>
              )}
            </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
