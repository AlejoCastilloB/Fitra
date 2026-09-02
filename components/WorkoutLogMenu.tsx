"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { usePalette, type Palette } from "@/lib/theme";
import { MoreVertical, Save, Trash2, X } from "lucide-react";
import Overlay from "@/components/Overlay";

type ExerciseGroup = {
  exercise_id: string;
  name: string;
  measurement_type: string;
  sets: { weight: number | null; reps: number | null; time_sec: number | null; distance_m: number | null; set_type: string }[];
};

export default function WorkoutLogMenu({
  workoutLogId, routineName, exercises,
}: { workoutLogId: string; routineName: string; exercises: ExerciseGroup[] }) {
  const palette = usePalette();
  const router = useRouter();
  const supabase = createClient();
  const [open, setOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function saveAsRoutine() {
    setSaving(true);
    const { data: auth } = await supabase.auth.getUser();
    const uid = auth.user!.id;

    const { data: routine, error } = await supabase.from("routines").insert({
      created_by: uid, client_id: uid, source: "client",
      name: `${routineName} (copia)`,
    }).select().single();

    if (!error && routine) {
      const rows = exercises.map((ex, i) => ({
        routine_id: routine.id, exercise_id: ex.exercise_id, order_index: i,
        target_sets: ex.sets.map((s) => ({
          set_type: s.set_type,
          ...(s.weight != null ? { weight: s.weight } : {}),
          ...(s.reps != null ? { reps: s.reps } : {}),
          ...(s.time_sec != null ? { time_sec: s.time_sec } : {}),
          ...(s.distance_m != null ? { distance_m: s.distance_m } : {}),
        })),
      }));
      await supabase.from("routine_exercises").insert(rows);
      router.push("/app/routines");
    }
    setSaving(false);
    setOpen(false);
  }

  async function handleDelete() {
    setDeleting(true);
    await supabase.from("set_logs").delete().eq("workout_log_id", workoutLogId);
    await supabase.from("workout_logs").delete().eq("id", workoutLogId);
    router.push("/app/profile");
  }

  return (
    <>
      <button onClick={() => setOpen((v) => !v)} style={{ background: "none", border: "none", color: palette.inkDim, cursor: "pointer", padding: 6 }}>
        <MoreVertical size={20} />
      </button>

      {open && (
        <>
          <div onClick={() => setOpen(false)} style={{ position: "fixed", inset: 0, zIndex: 90 }} />
          <div style={{
            ...palette.modalPanel, borderRadius: 14, padding: 6,
            position: "absolute", right: 0, top: "100%", marginTop: 6, zIndex: 100, width: 210,
          }}>
            <button onClick={saveAsRoutine} disabled={saving} style={menuItem(palette)}>
              <Save size={14} /> {saving ? "Guardando..." : "Guardar como rutina"}
            </button>
            <button onClick={() => { setConfirmDelete(true); setOpen(false); }} style={{ ...menuItem(palette), color: "#f87171" }}>
              <Trash2 size={14} /> Borrar entrenamiento
            </button>
          </div>
        </>
      )}

      {confirmDelete && (
        <Overlay onClose={() => setConfirmDelete(false)}>
          <div onClick={(e) => e.stopPropagation()} style={{ ...palette.modalPanel, padding: 22, width: "100%", maxWidth: 320 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
              <h3 style={{ fontSize: 15, fontWeight: 700 }}>¿Borrar este entreno?</h3>
              <button onClick={() => setConfirmDelete(false)} style={{ background: "none", border: "none", color: palette.inkDim, cursor: "pointer" }}><X size={18} /></button>
            </div>
            <p style={{ fontSize: 12.5, color: palette.inkDim, marginBottom: 18 }}>No se puede deshacer. Se borra el registro y todas sus series.</p>
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => setConfirmDelete(false)} style={{ flex: 1, padding: 11, borderRadius: 11, border: `1px solid ${palette.panelBorder}`, background: "none", color: palette.ink, cursor: "pointer", fontSize: 13 }}>Cancelar</button>
              <button onClick={handleDelete} disabled={deleting} style={{ flex: 1, padding: 11, borderRadius: 11, border: "none", background: "#c0392b", color: "#fff", cursor: "pointer", fontSize: 13, fontWeight: 700, opacity: deleting ? 0.6 : 1 }}>
                {deleting ? "Borrando..." : "Sí, borrar"}
              </button>
            </div>
          </div>
        </Overlay>
      )}
    </>
  );
}

function menuItem(palette: Palette): React.CSSProperties {
  return {
    display: "flex", alignItems: "center", gap: 8, width: "100%", padding: "10px 10px",
    borderRadius: 9, background: "none", border: "none", cursor: "pointer", fontSize: 13, fontWeight: 600,
    color: palette.ink, textAlign: "left",
  };
}
