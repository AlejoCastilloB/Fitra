"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { usePalette, type Palette } from "@/lib/theme";
import { Plus, Dumbbell, Pencil, Trash2, RefreshCw, Folder, Copy } from "lucide-react";
import { ROUTINE_DURATION_OPTIONS } from "@/lib/units";

export default function RoutinesPage() {
  const palette = usePalette();
  const supabase = createClient();
  const [routines, setRoutines] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [duplicatingId, setDuplicatingId] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    const { data: auth } = await supabase.auth.getUser();

    const { data: r } = await supabase
      .from("routines")
      .select("id, name, client_id, assigned_at, duration_days, auto_renew, folder")
      .eq("trainer_id", auth.user!.id)
      .order("created_at", { ascending: false });
    setRoutines(r ?? []);

    const clientsRes = await fetch("/api/coach/client-names").then((res) => res.json());
    setClients(clientsRes.clients ?? []);

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

  async function updateFolder(routineId: string, folder: string) {
    await supabase.from("routines").update({ folder: folder.trim() || null }).eq("id", routineId);
    load();
  }

  // Duplica la rutina con todos sus ejercicios, series, notas, descansos y superseries.
  async function duplicateRoutine(routine: any) {
    setDuplicatingId(routine.id);
    const { data: auth } = await supabase.auth.getUser();

    const { data: full } = await supabase.from("routines").select("*").eq("id", routine.id).single();
    const { data: exercises } = await supabase
      .from("routine_exercises")
      .select("exercise_id, order_index, target_sets, notes, superset_group")
      .eq("routine_id", routine.id)
      .order("order_index");

    const { data: copy, error } = await supabase.from("routines").insert({
      trainer_id: auth.user!.id,
      created_by: auth.user!.id,
      client_id: null,              // la copia nace sin asignar, para no duplicar asignaciones
      source: "trainer",
      name: `${full?.name ?? routine.name} (copia)`,
      notes: full?.notes ?? null,
      days_of_week: full?.days_of_week ?? [],
      folder: full?.folder ?? null,
      duration_days: full?.duration_days ?? null,
    }).select().single();

    if (!error && copy && (exercises ?? []).length > 0) {
      await supabase.from("routine_exercises").insert(
        (exercises ?? []).map((re: any) => ({ ...re, routine_id: copy.id })),
      );
    }

    setDuplicatingId(null);
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
        <RoutineFolders
          routines={routines}
          clients={clients}
          reassign={reassign}
          updateDuration={updateDuration}
          toggleAutoRenew={toggleAutoRenew}
          updateFolder={updateFolder}
          deleteRoutine={deleteRoutine}
          duplicateRoutine={duplicateRoutine}
          duplicatingId={duplicatingId}
          palette={palette}
        />
      )}
    </div>
  );
}

function RoutineFolders({ routines, clients, reassign, updateDuration, toggleAutoRenew, updateFolder, deleteRoutine, duplicateRoutine, duplicatingId, palette }: {
  routines: any[]; clients: any[];
  reassign: (id: string, clientId: string) => void;
  updateDuration: (id: string, days: number | null) => void;
  toggleAutoRenew: (id: string, on: boolean) => void;
  updateFolder: (id: string, folder: string) => void;
  deleteRoutine: (id: string) => void;
  duplicateRoutine: (routine: any) => void;
  duplicatingId: string | null;
  palette: Palette;
}) {
  const folderNames = Array.from(new Set(routines.map((r) => r.folder).filter(Boolean))).sort();
  const groups: Record<string, any[]> = {};
  routines.forEach((r) => {
    const key = r.folder || "Sin carpeta";
    if (!groups[key]) groups[key] = [];
    groups[key].push(r);
  });
  const orderedKeys = [...folderNames, ...(groups["Sin carpeta"] ? ["Sin carpeta"] : [])];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
      <datalist id="routine-folder-options">
        {folderNames.map((f) => <option key={f} value={f} />)}
      </datalist>
      {orderedKeys.map((key) => (
        <div key={key}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10, color: palette.inkDim, fontSize: 12.5, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.04em" }}>
            <Folder size={13} /> {key} <span style={{ fontWeight: 400, textTransform: "none" }}>({groups[key].length})</span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {groups[key].map((r, i) => {
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
                  {clients.map((c) => <option key={c.user_id} value={c.user_id}>{c.display_name || c.email}</option>)}
                </select>

                <input
                  list="routine-folder-options"
                  defaultValue={r.folder || ""}
                  placeholder="Carpeta..."
                  onBlur={(e) => { if (e.target.value !== (r.folder || "")) updateFolder(r.id, e.target.value); }}
                  style={{ width: 110, padding: "7px 10px", borderRadius: 9, border: `1px solid ${palette.panelBorder}`, background: palette.inputBg, color: palette.ink, fontSize: 12.5 }}
                />

                <button
                  onClick={() => duplicateRoutine(r)}
                  disabled={duplicatingId === r.id}
                  title="Duplicar rutina"
                  style={{ display: "flex", background: "none", border: "none", color: palette.inkDim, cursor: "pointer", opacity: duplicatingId === r.id ? 0.5 : 1 }}
                >
                  <Copy size={16} />
                </button>
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
        </div>
      ))}
    </div>
  );
}
