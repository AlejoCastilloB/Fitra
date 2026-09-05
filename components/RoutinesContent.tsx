"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { usePalette } from "@/lib/theme";
import { useCurrentUser } from "@/lib/useCurrentUser";
import SwipeActionsRow from "@/components/SwipeActionsRow";
import Overlay from "@/components/Overlay";
import Link from "next/link";
import { Pencil, Sparkles, Zap, ChevronRight, Copy, Trash2 } from "lucide-react";

export default function RoutinesContent() {
  const palette = usePalette();
  const supabase = createClient();
  const uid = useCurrentUser();
  const [routines, setRoutines] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!uid) return;
    const { data: clientRow } = await supabase.from("clients").select("trainer_id").eq("user_id", uid).single();
    const { data } = await supabase
      .from("routines")
      .select("id, name, source, notes")
      .or(`source.eq.platform,client_id.eq.${uid}${clientRow?.trainer_id ? `,and(trainer_id.eq.${clientRow.trainer_id},client_id.is.null)` : ""}`)
      .order("created_at", { ascending: false });
    setRoutines(data ?? []);
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
                      <p style={{ fontSize: 11.5, color: palette.accent, marginTop: 8, paddingTop: 8, borderTop: `1px solid ${palette.panelBorder}` }}>
                        📝 {r.notes}
                      </p>
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
              <button onClick={() => setConfirmDelete(null)} style={{ flex: 1, padding: 11, borderRadius: 11, border: `1px solid ${palette.panelBorder}`, background: "none", color: palette.ink, cursor: "pointer", fontSize: 13 }}>
                Cancelar
              </button>
              <button onClick={() => remove(confirmDelete)} style={{ flex: 1, padding: 11, borderRadius: 11, border: "none", background: "#c0392b", color: "#fff", cursor: "pointer", fontSize: 13, fontWeight: 700 }}>
                Sí, eliminar
              </button>
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
