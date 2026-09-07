"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { usePalette, type Palette } from "@/lib/theme";
import { Plus, Dumbbell, Pencil, Trash2, RefreshCw, Folder, Copy, Info, Check, X, ChevronDown, ChevronRight, GripVertical, BarChart3, ArrowUp, ArrowDown } from "lucide-react";
import { ROUTINE_DURATION_OPTIONS } from "@/lib/units";

/** Las rutinas sin carpeta van juntas bajo este nombre; no es una carpeta de verdad. */
const SIN_CARPETA = "Sin carpeta";
/** Qué carpetas dejó cerradas este entrenador. Es preferencia suya, va en el navegador. */
const COLLAPSED_KEY = "fitra_carpetas_cerradas";

export default function RoutinesPage() {
  const palette = usePalette();
  const supabase = createClient();
  const [routines, setRoutines] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [duplicatingId, setDuplicatingId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [clientsError, setClientsError] = useState<string | null>(null);
  const [folderDescriptions, setFolderDescriptions] = useState<Record<string, string>>({});
  const [uid, setUid] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    const { data: auth } = await supabase.auth.getUser();
    setUid(auth.user?.id ?? null);

    // Las dos consultas no dependen una de la otra: en serie eran dos esperas seguidas.
    const [{ data: r }, { data: folders }] = await Promise.all([
      supabase
        .from("routines")
        .select("id, name, client_id, assigned_at, duration_days, auto_renew, folder, sort_order")
        .eq("trainer_id", auth.user!.id)
        // El orden manual manda; las que nunca se arrastraron van detrás, por fecha.
        .order("sort_order", { ascending: true, nullsFirst: false })
        .order("created_at", { ascending: false }),
      supabase.from("routine_folders").select("name, description").eq("trainer_id", auth.user!.id),
    ]);

    setRoutines(r ?? []);
    setFolderDescriptions(Object.fromEntries(
      (folders ?? []).filter((f: any) => f.description).map((f: any) => [f.name, f.description as string])
    ));

    try {
      const res = await fetch("/api/coach/client-names");
      const body = await res.json();
      if (!res.ok) throw new Error(body?.error || `error ${res.status}`);
      setClients(body.clients ?? []);
      setClientsError(null);
    } catch (e: any) {
      setClients([]);
      setClientsError(`No pudimos cargar tus clientes, por eso no aparecen para asignar: ${e.message}`);
    }

    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function reassign(routineId: string, newClientId: string) {
    setActionError(null);
    const { error } = await supabase.from("routines").update({
      client_id: newClientId || null,
      assigned_at: newClientId ? new Date().toISOString() : null,
    }).eq("id", routineId);
    if (error) { setActionError(`No pudimos asignar la rutina: ${error.message}`); return; }
    load();
  }

  async function updateDuration(routineId: string, durationDays: number | null) {
    setActionError(null);
    const { error } = await supabase.from("routines").update({ duration_days: durationDays }).eq("id", routineId);
    if (error) { setActionError(`No pudimos cambiar la duración: ${error.message}`); return; }
    load();
  }

  async function toggleAutoRenew(routineId: string, autoRenew: boolean) {
    setActionError(null);
    const { error } = await supabase.from("routines").update({ auto_renew: autoRenew }).eq("id", routineId);
    if (error) { setActionError(`No pudimos cambiar la renovación: ${error.message}`); return; }
    load();
  }

  async function updateFolder(routineId: string, folder: string) {
    setActionError(null);
    const { error } = await supabase.from("routines").update({ folder: folder.trim() || null }).eq("id", routineId);
    if (error) { setActionError(`No pudimos cambiar la carpeta: ${error.message}`); return; }
    load();
  }

  /**
   * Guarda el orden de las rutinas de una carpeta.
   *
   * Se numeran TODAS las de esa carpeta de cero en adelante, no solo la que se movió: así
   * el orden queda completo aunque nunca se hubiera tocado antes.
   */
  async function saveOrder(ids: string[]) {
    setActionError(null);
    // Optimista: la lista ya se pintó en el orden nuevo, esto solo lo persiste.
    const results = await Promise.all(
      ids.map((id, i) => supabase.from("routines").update({ sort_order: i }).eq("id", id))
    );
    const fallo = results.find((r) => r.error);
    if (fallo?.error) { setActionError(`No pudimos guardar el orden: ${fallo.error.message}`); load(); }
  }

  /** La descripción del programa entero, la que el cliente lee arriba de sus rutinas. */
  async function saveFolderDescription(folder: string, description: string) {
    if (!uid) return "Se cerró tu sesión, vuelve a entrar.";
    const { error } = await supabase.from("routine_folders").upsert(
      { trainer_id: uid, name: folder, description: description.trim() || null, updated_at: new Date().toISOString() },
      { onConflict: "trainer_id,name" },
    );
    if (error) return `No pudimos guardarla: ${error.message}`;
    setFolderDescriptions((prev) => {
      const next = { ...prev };
      if (description.trim()) next[folder] = description.trim();
      else delete next[folder];
      return next;
    });
    return null;
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

      {(actionError || clientsError) && (
        <div style={{
          padding: 13, borderRadius: 12, marginBottom: 16, fontSize: 13, lineHeight: 1.5,
          background: "#f8717118", border: "1px solid #f8717155", color: "#b91c1c",
        }}>
          {actionError || clientsError}
        </div>
      )}

      {loading ? (
        <div style={{ ...palette.glassPanel, padding: 32, textAlign: "center", color: palette.inkDim }}>Cargando...</div>
      ) : routines.length === 0 ? (
        <div style={{ ...palette.glassPanel, padding: 32, textAlign: "center", color: palette.inkDim }}>Todavía no armaste ninguna rutina.</div>
      ) : (
        <RoutineFolders
          setRoutines={setRoutines}
          saveOrder={saveOrder}
          folderDescriptions={folderDescriptions}
          saveFolderDescription={saveFolderDescription}
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

function RoutineFolders({ routines, setRoutines, saveOrder, clients, folderDescriptions, saveFolderDescription, reassign, updateDuration, toggleAutoRenew, updateFolder, deleteRoutine, duplicateRoutine, duplicatingId, palette }: {
  routines: any[]; clients: any[];
  setRoutines: (r: any[]) => void;
  saveOrder: (ids: string[]) => void;
  folderDescriptions: Record<string, string>;
  saveFolderDescription: (folder: string, description: string) => Promise<string | null>;
  reassign: (id: string, clientId: string) => void;
  updateDuration: (id: string, days: number | null) => void;
  toggleAutoRenew: (id: string, on: boolean) => void;
  updateFolder: (id: string, folder: string) => void;
  deleteRoutine: (id: string) => void;
  duplicateRoutine: (routine: any) => void;
  duplicatingId: string | null;
  palette: Palette;
}) {
  // Qué carpetas están cerradas. Se recuerda entre visitas: con seis programas abiertos
  // la pantalla es un muro y hay que hacer scroll para llegar al que se busca.
  const [collapsed, setCollapsed] = useState<string[]>(() => {
    if (typeof window === "undefined") return [];
    try { return JSON.parse(localStorage.getItem(COLLAPSED_KEY) ?? "[]"); } catch { return []; }
  });
  const [dragging, setDragging] = useState<{ folder: string; id: string } | null>(null);

  function toggleFolder(key: string) {
    setCollapsed((prev) => {
      const next = prev.includes(key) ? prev.filter((f) => f !== key) : [...prev, key];
      try { localStorage.setItem(COLLAPSED_KEY, JSON.stringify(next)); } catch {}
      return next;
    });
  }

  /**
   * Mueve una rutina dentro de su carpeta y guarda el orden.
   *
   * Se reordena la lista completa —no solo el grupo— para que la pantalla se repinte al
   * instante; la numeración que se guarda es solo la de esa carpeta.
   */
  function moveWithinFolder(folderKey: string, fromId: string, toId: string) {
    if (fromId === toId) return;
    const delGrupo = routines.filter((r) => (r.folder || SIN_CARPETA) === folderKey);
    const desde = delGrupo.findIndex((r) => r.id === fromId);
    const hasta = delGrupo.findIndex((r) => r.id === toId);
    if (desde < 0 || hasta < 0) return;

    const reordenado = [...delGrupo];
    const [movida] = reordenado.splice(desde, 1);
    reordenado.splice(hasta, 0, movida);

    // Se reconstruye la lista entera respetando la posición de las otras carpetas.
    let i = 0;
    setRoutines(routines.map((r) => ((r.folder || SIN_CARPETA) === folderKey ? reordenado[i++] : r)));
    saveOrder(reordenado.map((r) => r.id));
  }

  const folderNames = Array.from(new Set(routines.map((r) => r.folder).filter(Boolean))).sort();
  const groups: Record<string, any[]> = {};
  routines.forEach((r) => {
    const key = r.folder || SIN_CARPETA;
    if (!groups[key]) groups[key] = [];
    groups[key].push(r);
  });
  const orderedKeys = [...folderNames, ...(groups[SIN_CARPETA] ? [SIN_CARPETA] : [])];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
      <datalist id="routine-folder-options">
        {folderNames.map((f) => <option key={f} value={f} />)}
      </datalist>
      {orderedKeys.map((key) => {
        const estaCerrada = collapsed.includes(key);
        return (
        <div key={key}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10 }}>
            <button
              onClick={() => toggleFolder(key)}
              aria-expanded={!estaCerrada}
              style={{
                display: "flex", alignItems: "center", gap: 6, flex: 1, minWidth: 0, textAlign: "left",
                background: "none", border: "none", cursor: "pointer", padding: "6px 0",
                color: palette.inkDim, fontSize: 12.5, fontWeight: 700, textTransform: "uppercase",
                letterSpacing: "0.04em", fontFamily: "inherit", touchAction: "manipulation",
              }}
            >
              {estaCerrada ? <ChevronRight size={14} /> : <ChevronDown size={14} />}
              <Folder size={13} /> {key}
              <span style={{ fontWeight: 400, textTransform: "none" }}>({groups[key].length})</span>
            </button>

            {key !== SIN_CARPETA && (
              <Link
                href={`/coach/routines/folder/${encodeURIComponent(key)}`}
                title="Ver el programa completo con sus series por músculo"
                style={{
                  display: "flex", alignItems: "center", gap: 5, flexShrink: 0, textDecoration: "none",
                  padding: "6px 11px", borderRadius: 9, fontSize: 11.5, fontWeight: 700,
                  border: `1px solid ${palette.accent}55`, background: `${palette.accent}14`, color: palette.accent,
                }}
              >
                <BarChart3 size={12} /> Ver programa
              </Link>
            )}
          </div>

          {key !== SIN_CARPETA && !estaCerrada && (
            <FolderDescription
              folder={key}
              description={folderDescriptions[key] ?? null}
              onSave={saveFolderDescription}
              palette={palette}
            />
          )}
          {!estaCerrada && (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {groups[key].map((r, i) => {
            const daysLeft = r.assigned_at && r.duration_days
              ? r.duration_days - Math.floor((Date.now() - new Date(r.assigned_at).getTime()) / 86400000)
              : null;
            const arrastrando = dragging?.id === r.id;
            return (
            <div
              key={r.id}
              className="ft-fade-in-up"
              onDragOver={(e) => { if (dragging?.folder === key) e.preventDefault(); }}
              onDrop={(e) => { e.preventDefault(); const d = dragging; setDragging(null); if (d && d.folder === key) moveWithinFolder(key, d.id, r.id); }}
              style={{
                ...palette.glassPanel, padding: 16, display: "flex", flexDirection: "column", gap: 10,
                animationDelay: `${Math.min(i, 8) * 0.03}s`,
                opacity: arrastrando ? 0.45 : 1,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                {/* El asa de arrastre. En escritorio se arrastra; en móvil el arrastre
                    nativo no existe, por eso al lado van las flechas de subir y bajar. */}
                <div
                  draggable
                  onDragStart={() => setDragging({ folder: key, id: r.id })}
                  onDragEnd={() => setDragging(null)}
                  title="Arrastra para reordenar"
                  style={{
                    width: 36, height: 36, borderRadius: 10, background: `${palette.accent}22`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    color: palette.accent, flexShrink: 0, cursor: "grab",
                  }}
                >
                  {groups[key].length > 1 ? <GripVertical size={16} /> : <Dumbbell size={16} />}
                </div>

                {groups[key].length > 1 && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 2, flexShrink: 0 }}>
                    <button
                      onClick={() => i > 0 && moveWithinFolder(key, r.id, groups[key][i - 1].id)}
                      disabled={i === 0} aria-label="Subir"
                      style={arrowStyle(palette, i === 0)}
                    ><ArrowUp size={11} /></button>
                    <button
                      onClick={() => i < groups[key].length - 1 && moveWithinFolder(key, r.id, groups[key][i + 1].id)}
                      disabled={i === groups[key].length - 1} aria-label="Bajar"
                      style={arrowStyle(palette, i === groups[key].length - 1)}
                    ><ArrowDown size={11} /></button>
                  </div>
                )}

                <div style={{ flex: 1, minWidth: 140 }}>
                  {/* El nombre abre el editor: es lo primero que uno intenta tocar. */}
                  <Link href={`/coach/routines/${r.id}/edit`} style={{ fontSize: 14, fontWeight: 600, color: palette.ink, textDecoration: "none" }}>
                    {r.name}
                  </Link>
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
          )}
        </div>
        );
      })}
    </div>
  );
}

/**
 * La descripción del programa: para qué es el conjunto, no cada día.
 *
 * Vive en la carpeta porque es lo que agrupa los días de un mismo plan, y el cliente la
 * lee arriba de su lista de rutinas — es lo primero que ve al entrar a entrenar.
 */
function FolderDescription({ folder, description, onSave, palette }: {
  folder: string; description: string | null;
  onSave: (folder: string, description: string) => Promise<string | null>;
  palette: Palette;
}) {
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(description ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    setSaving(true);
    const err = await onSave(folder, text);
    setSaving(false);
    if (err) { setError(err); return; }
    setError(null);
    setEditing(false);
  }

  if (editing) {
    return (
      <div style={{ ...palette.glassPanel, padding: 14, marginBottom: 10 }}>
        <textarea
          value={text} onChange={(e) => setText(e.target.value)} rows={5} autoFocus
          placeholder="Ej: son seis días porque repartimos el volumen para tocar cada grupo dos veces por semana sin sesiones eternas. Este mes vamos por estrés metabólico: más repeticiones y menos descanso. En un mes pasamos a tensión mecánica."
          style={{
            width: "100%", padding: "10px 12px", borderRadius: 11, resize: "vertical",
            border: `1px solid ${palette.panelBorder}`, background: palette.inputBg, color: palette.ink,
            fontSize: 13.5, fontFamily: "inherit", lineHeight: 1.6, marginBottom: 10,
          }}
        />
        {error && <p style={{ fontSize: 11.5, color: "#f87171", marginBottom: 10 }}>{error}</p>}
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={() => { setEditing(false); setText(description ?? ""); setError(null); }} style={{
            flex: 1, padding: 10, borderRadius: 10, border: `1px solid ${palette.panelBorder}`,
            background: "none", color: palette.inkDim, fontSize: 13, cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
          }}><X size={13} /> Cancelar</button>
          <button onClick={save} disabled={saving} style={{
            flex: 1, padding: 10, borderRadius: 10, border: "none", background: palette.accent,
            color: palette.bg, fontSize: 13, fontWeight: 700, cursor: "pointer", opacity: saving ? 0.6 : 1,
            display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
          }}><Check size={13} /> {saving ? "Guardando..." : "Guardar"}</button>
        </div>
      </div>
    );
  }

  return (
    <button
      onClick={() => setEditing(true)}
      style={{
        width: "100%", textAlign: "left", cursor: "pointer", marginBottom: 10,
        ...palette.glassPanel, padding: 13,
        display: "flex", alignItems: "flex-start", gap: 9,
        border: description ? `1px solid ${palette.accent}44` : `1px dashed ${palette.panelBorder}`,
        color: palette.ink,
      }}
    >
      <Info size={13} color={description ? palette.accent : palette.inkDim} style={{ flexShrink: 0, marginTop: 2 }} />
      <span style={{ flex: 1, minWidth: 0, fontSize: 12.5, lineHeight: 1.55, color: description ? palette.ink : palette.inkDim, whiteSpace: "pre-wrap" }}>
        {description ?? "Sin descripción del programa. Explica para qué es este plan y por qué tiene estos días — tus clientes lo leen antes de entrenar."}
      </span>
      <Pencil size={13} color={palette.inkDim} style={{ flexShrink: 0, marginTop: 2 }} />
    </button>
  );
}

/** Las flechas de subir y bajar, para cuando no se puede arrastrar (móvil). */
function arrowStyle(palette: Palette, disabled: boolean): React.CSSProperties {
  return {
    width: 22, height: 18, borderRadius: 5, cursor: disabled ? "default" : "pointer",
    display: "flex", alignItems: "center", justifyContent: "center",
    border: `1px solid ${palette.panelBorder}`, background: "none",
    color: palette.inkDim, opacity: disabled ? 0.35 : 1, padding: 0,
    touchAction: "manipulation",
  };
}
