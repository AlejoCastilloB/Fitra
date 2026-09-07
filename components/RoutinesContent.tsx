"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { usePalette } from "@/lib/theme";
import { useCurrentUser } from "@/lib/useCurrentUser";
import SwipeActionsRow from "@/components/SwipeActionsRow";
import Overlay from "@/components/Overlay";
import Button from "@/components/Button";
import Link from "next/link";
import { Pencil, Sparkles, Zap, ChevronRight, Copy, Trash2, ClipboardList, FolderOpen, StickyNote } from "lucide-react";

export default function RoutinesContent() {
  const palette = usePalette();
  const supabase = createClient();
  const uid = useCurrentUser();
  const [routines, setRoutines] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);
  /** Descripciones de programa que escribió el coach, por nombre de carpeta. */
  const [programs, setPrograms] = useState<{ name: string; description: string }[]>([]);
  /** Lo que el coach le escribió a ESTA persona sobre su plan. */
  const [coachNote, setCoachNote] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!uid) return;
    const { data: clientRow } = await supabase.from("clients").select("trainer_id, training_description").eq("user_id", uid).maybeSingle();
    setCoachNote((clientRow as any)?.training_description?.trim() || null);

    // Las dos consultas son independientes entre sí: en serie eran dos viajes al servidor
    // encadenados antes de pintar la lista.
    const [{ data }, { data: folders }] = await Promise.all([
      supabase
        .from("routines")
        .select("id, name, source, notes, folder")
        .or(`source.eq.platform,client_id.eq.${uid}${clientRow?.trainer_id ? `,and(trainer_id.eq.${clientRow.trainer_id},client_id.is.null)` : ""}`)
        .order("created_at", { ascending: false }),
      // El RLS de routine_folders solo devuelve las carpetas de rutinas asignadas a esta
      // persona, así que no hace falta filtrar aquí.
      supabase.from("routine_folders").select("name, description").not("description", "is", null),
    ]);

    setRoutines(data ?? []);
    setPrograms((folders ?? []).filter((f: any) => f.description?.trim()) as any);
    setLoading(false);
  }, [uid]);

  useEffect(() => { load(); }, [load]);

  /**
   * Copia la rutina con todos sus ejercicios, series, notas y superseries.
   *
   * La copia siempre nace como rutina propia, aunque el original sea del coach o de la
   * plataforma: así se puede tomar la del coach de punto de partida y retocarla sin tocar
   * la original.
   */
  async function duplicate(routine: any) {
    if (!uid || busyId) return;
    setBusyId(routine.id);
    setError(null);

    try {
      const [{ data: full }, { data: exercises }] = await Promise.all([
        supabase.from("routines").select("*").eq("id", routine.id).single(),
        supabase.from("routine_exercises")
          .select("exercise_id, order_index, target_sets, notes, superset_group")
          .eq("routine_id", routine.id).order("order_index"),
      ]);

      const { data: copy, error: insertError } = await supabase.from("routines").insert({
        trainer_id: null,
        created_by: uid,
        client_id: uid,
        source: "client",
        name: `${full?.name ?? routine.name} (copia)`,
        notes: full?.notes ?? null,
        days_of_week: full?.days_of_week ?? [],
      }).select().single();

      if (insertError || !copy) throw insertError ?? new Error("no se pudo crear la copia");

      if ((exercises ?? []).length > 0) {
        const { error: exError } = await supabase.from("routine_exercises").insert(
          (exercises ?? []).map((re: any) => ({ ...re, routine_id: copy.id })),
        );
        // Si fallan los ejercicios, la copia quedaría vacía y confundiría más que ayudar.
        if (exError) {
          await supabase.from("routines").delete().eq("id", copy.id);
          throw exError;
        }
      }

      await load();
    } catch (e: any) {
      setError(`No pudimos duplicar la rutina: ${e?.message ?? "error inesperado"}`);
    } finally {
      setBusyId(null);
    }
  }

  async function remove(routine: any) {
    setConfirmDelete(null);
    setBusyId(routine.id);
    setError(null);

    const { error: deleteError } = await supabase.from("routines").delete().eq("id", routine.id);
    if (deleteError) setError(`No pudimos eliminar la rutina: ${deleteError.message}`);
    else await load();

    setBusyId(null);
  }

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

      {/* Lo que el coach quiere que se entienda ANTES de mirar la lista: para qué es el
          plan y por qué tiene los días que tiene. Sin esto, seis rutinas sueltas no
          explican nada por sí solas. */}
      {coachNote && (
        <div className="ft-fade-in-up" style={{
          ...palette.glassPanel, padding: 16, marginBottom: 12,
          border: `1px solid ${palette.accent}55`, background: `${palette.accent}12`,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 8, color: palette.accent, fontWeight: 700, fontSize: 11.5, textTransform: "uppercase", letterSpacing: "0.04em" }}>
            <ClipboardList size={13} /> Indicaciones de tu coach
          </div>
          <p style={{ fontSize: 13, lineHeight: 1.65, color: palette.ink, margin: 0, whiteSpace: "pre-wrap" }}>
            {coachNote}
          </p>
        </div>
      )}

      {programs.map((p) => (
        <div key={p.name} className="ft-fade-in-up" style={{
          ...palette.glassPanel, padding: 16, marginBottom: 12,
          border: `1px solid ${palette.accent}55`, background: `${palette.accent}12`,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 6, color: palette.accent, fontWeight: 700, fontSize: 11.5, textTransform: "uppercase", letterSpacing: "0.04em" }}>
            <FolderOpen size={13} /> {p.name}
          </div>
          <p style={{ fontSize: 13, lineHeight: 1.6, color: palette.ink, margin: 0, whiteSpace: "pre-wrap" }}>
            {p.description}
          </p>
        </div>
      ))}

      {error && (
        <p style={{ fontSize: 12, color: "#f87171", textAlign: "center", marginBottom: 12, lineHeight: 1.5 }}>{error}</p>
      )}

      {loading ? (
        <p style={{ fontSize: 13, color: palette.inkDim, textAlign: "center", padding: 20 }}>Cargando...</p>
      ) : routines.length === 0 ? (
        <p style={{ fontSize: 13, color: palette.inkDim, textAlign: "center", padding: 20 }}>
          Todavía no tienes rutinas. Crea la primera desde “Nueva rutina”.
        </p>
      ) : (
        <>
          <p style={{ fontSize: 11, color: palette.inkDim, textAlign: "center", marginBottom: 10 }}>
            Desliza una rutina hacia la izquierda para duplicarla o eliminarla.
          </p>

          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {routines.map((r, i) => {
              // Solo se pueden borrar las propias: las del coach y las sugeridas por
              // FitTrack no son de este usuario. Duplicar sí vale para todas.
              const own = r.source === "client";
              const actions = [
                {
                  label: "Duplicar", icon: <Copy size={15} />, color: "#3B7DD8",
                  onClick: () => duplicate(r), disabled: busyId === r.id,
                },
                ...(own ? [{
                  label: "Eliminar", icon: <Trash2 size={15} />, color: "#c0392b",
                  onClick: () => setConfirmDelete(r), disabled: busyId === r.id,
                }] : []),
              ];

              return (
                <SwipeActionsRow key={r.id} actions={actions}>
                  <div className="ft-fade-in-up" style={{
                    ...palette.glassPanel, padding: 16,
                    animationDelay: `${Math.min(i, 8) * 0.03}s`,
                    opacity: busyId === r.id ? 0.5 : 1,
                  }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <Link href={`/app/workout/${r.id}`} style={{ flex: 1, textDecoration: "none", color: palette.ink }}>
                        <div style={{ fontSize: 14, fontWeight: 600 }}>{r.name}</div>
                        <div style={{ fontSize: 11, color: palette.inkDim, marginTop: 2 }}>
                          {busyId === r.id
                            ? "Trabajando..."
                            : r.source === "platform" ? "Sugerida por FitTrack" : own ? "Creada por ti" : "Asignada por tu coach"}
                        </div>
                      </Link>
                      {own && (
                        <Link href={`/app/routines/${r.id}/edit`} aria-label="Editar rutina" style={{ color: palette.inkDim, display: "flex" }}><Pencil size={16} /></Link>
                      )}
                      <Link href={`/app/workout/${r.id}`} aria-label="Ver rutina" style={{ display: "flex", color: palette.inkDim, flexShrink: 0 }}>
                        <ChevronRight size={18} />
                      </Link>
                    </div>
                    {r.notes && (
                      <div style={{ display: "flex", gap: 7, marginTop: 10, paddingTop: 10, borderTop: `1px solid ${palette.panelBorder}` }}>
                        <StickyNote size={13} color={palette.accent} style={{ flexShrink: 0, marginTop: 2 }} />
                        <p style={{ fontSize: 12.5, lineHeight: 1.55, color: palette.inkDim, margin: 0, whiteSpace: "pre-wrap" }}>
                          {r.notes}
                        </p>
                      </div>
                    )}
                  </div>
                </SwipeActionsRow>
              );
            })}
          </div>
        </>
      )}

      {confirmDelete && (
        <Overlay onClose={() => setConfirmDelete(null)}>
          <div onClick={(e) => e.stopPropagation()} style={{ ...palette.modalPanel, padding: 22, width: "100%", maxWidth: 340 }}>
            <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 8 }}>¿Eliminar esta rutina?</h3>
            <p style={{ fontSize: 12.5, color: palette.inkDim, marginBottom: 18, lineHeight: 1.5 }}>
              “{confirmDelete.name}” se borra para siempre. Los entrenos que ya registraste con ella se conservan.
            </p>
            <div style={{ display: "flex", gap: 10 }}>
              <Button variant="ghost" fullWidth onClick={() => setConfirmDelete(null)}>Cancelar</Button>
              <Button variant="danger" fullWidth onClick={() => remove(confirmDelete)}>
                Sí, eliminar
              </Button>
            </div>
          </div>
        </Overlay>
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
