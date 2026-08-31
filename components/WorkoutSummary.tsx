"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { usePalette } from "@/lib/theme";
import { getWeightComparison } from "@/lib/weightComparisons";
import type { LiveExercise } from "@/lib/workoutSession";
import { Camera, Flame, Save, Trophy } from "lucide-react";

const TAG_SUGGESTION = "Compartido desde FitTrack — etiquétanos @alejocastillob en tu historia 💪";

export default function WorkoutSummary({
  workoutLogId, routineName, volume, durationSec, prs, breakdown, exercises, suggestedRoutineName, onDone,
}: {
  workoutLogId: string;
  routineName: string;
  volume: number;
  durationSec: number;
  prs: string[];
  breakdown: Record<string, number>;
  exercises: LiveExercise[];
  suggestedRoutineName: string;
  onDone: () => void;
}) {
  const palette = usePalette();
  const supabase = createClient();
  const minutes = Math.floor(durationSec / 60);
  const capitalized = routineName.charAt(0).toUpperCase() + routineName.slice(1);
  const comparison = getWeightComparison(volume);
  const cardRef = useRef<HTMLDivElement>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const [sharing, setSharing] = useState(false);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  const [showSaveRoutine, setShowSaveRoutine] = useState(false);
  const [newRoutineName, setNewRoutineName] = useState(suggestedRoutineName);
  const [savingRoutine, setSavingRoutine] = useState(false);
  const [routineSaved, setRoutineSaved] = useState(false);
  const [saveRoutineError, setSaveRoutineError] = useState<string | null>(null);

  const loggedExercises = exercises.filter((ex) => ex.sets.some((s) => s.done));

  async function handleAddPhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingPhoto(true);
    const { data: auth } = await supabase.auth.getUser();
    const path = `${auth.user!.id}/${workoutLogId}.jpg`;
    await supabase.storage.from("food-photos").upload(path, file, { contentType: file.type, upsert: true });
    const { data: pub } = supabase.storage.from("food-photos").getPublicUrl(path);
    await supabase.from("workout_logs").update({ photo_url: pub.publicUrl }).eq("id", workoutLogId);
    setPhotoUrl(pub.publicUrl);
    setUploadingPhoto(false);
  }

  async function saveAsRoutine() {
    const name = newRoutineName.trim();
    if (!name || loggedExercises.length === 0 || savingRoutine) return;
    setSavingRoutine(true);
    setSaveRoutineError(null);

    const { data: auth } = await supabase.auth.getUser();
    const uid = auth.user?.id;
    if (!uid) { setSaveRoutineError("No pudimos guardar la rutina, intenta de nuevo."); setSavingRoutine(false); return; }

    const { data: routine, error } = await supabase.from("routines").insert({
      created_by: uid, client_id: uid, source: "client", name,
    }).select().single();

    if (error || !routine) {
      setSaveRoutineError("No pudimos guardar la rutina, intenta de nuevo.");
      setSavingRoutine(false);
      return;
    }

    const rows = loggedExercises.map((ex, i) => ({
      routine_id: routine.id,
      exercise_id: ex.id,
      order_index: i,
      target_sets: ex.sets.filter((s) => s.done).map((s) => ({
        set_type: s.set_type,
        ...(s.weight != null ? { weight: s.weight } : {}),
        ...(s.reps != null ? { reps: s.reps } : {}),
        ...(s.time_sec != null ? { time_sec: s.time_sec } : {}),
        ...(s.distance_m != null ? { distance_m: s.distance_m } : {}),
      })),
      notes: ex.notes || null,
      superset_group: ex.supersetGroup ?? null,
    }));

    const { error: rowsError } = await supabase.from("routine_exercises").insert(rows);
    if (rowsError) {
      setSaveRoutineError("Guardamos la rutina pero no sus ejercicios. Revísala en Rutinas.");
      setSavingRoutine(false);
      return;
    }

    setRoutineSaved(true);
    setSavingRoutine(false);
  }

  async function share() {
    if (!cardRef.current) return;
    setSharing(true);
    try {
      const { toPng } = await import("html-to-image");
      const dataUrl = await toPng(cardRef.current, { pixelRatio: 2 });
      const blob = await (await fetch(dataUrl)).blob();
      const file = new File([blob], "entreno-fittrack.png", { type: "image/png" });

      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({ files: [file], text: TAG_SUGGESTION });
      } else {
        const link = document.createElement("a");
        link.href = dataUrl;
        link.download = "entreno-fittrack.png";
        link.click();
      }
    } catch {
      alert("No pudimos generar la imagen, intenta de nuevo.");
    } finally {
      setSharing(false);
    }
  }

  const BADGE_LABELS: Record<string, { label: string; color: string }> = {
    normal: { label: "Efectivas", color: palette.accent },
    warmup: { label: "Calentamiento", color: "#FBBF24" },
    dropset: { label: "Dropset", color: "#C77DFF" },
    failure: { label: "Al fallo", color: "#F87171" },
  };

  return (
    <div>
      <style>{`
        @keyframes ftStoryIn { from { opacity: 0; transform: scale(0.94) translateY(10px); } to { opacity: 1; transform: none; } }
        @keyframes ftEmojiPop { 0% { transform: scale(0.5); opacity: 0; } 60% { transform: scale(1.15); } 100% { transform: scale(1); opacity: 1; } }
        .ft-story-card { animation: ftStoryIn .45s cubic-bezier(.16,.8,.24,1) both; }
        .ft-emoji-pop { animation: ftEmojiPop .5s cubic-bezier(.16,.8,.24,1) .15s both; }
      `}</style>

      <div ref={cardRef} className="ft-story-card" style={{
        borderRadius: 26, padding: "36px 24px 28px", textAlign: "center", marginBottom: 20,
        background: `${palette.bg}66`,
        border: "1px solid rgba(255,255,255,0.14)",
        boxShadow: "inset 0 1px 0 rgba(255,255,255,0.10), 0 10px 30px -10px rgba(0,0,0,0.35)",
        position: "relative", overflow: "hidden",
      }}>
        <div style={{
          width: 60, height: 60, borderRadius: "50%", background: `${palette.accent}22`,
          display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 14px", color: palette.accent,
        }}>
          <Flame size={26} />
        </div>
        <p style={{ fontSize: 12, color: palette.inkDim, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4 }}>Entreno completado</p>
        <h1 style={{ fontSize: 19, fontWeight: 800, marginBottom: 16 }}>{capitalized}</h1>

        <input ref={photoInputRef} type="file" accept="image/*" onChange={handleAddPhoto} style={{ display: "none" }} />
        {photoUrl ? (
          <img src={photoUrl} alt="" style={{ width: "100%", maxHeight: 180, objectFit: "cover", borderRadius: 14, marginBottom: 18 }} />
        ) : (
          <button onClick={() => photoInputRef.current?.click()} disabled={uploadingPhoto} style={{
            display: "flex", alignItems: "center", justifyContent: "center", gap: 6, width: "100%", padding: 10, borderRadius: 12,
            border: `1px dashed ${palette.panelBorder}`, background: "none", color: palette.inkDim, fontSize: 12, cursor: "pointer", marginBottom: 18,
          }}>
            <Camera size={14} /> {uploadingPhoto ? "Subiendo..." : "Agregar foto (opcional)"}
          </button>
        )}

        <div style={{ fontSize: 38, fontWeight: 900, lineHeight: 1 }}>{volume.toLocaleString("es-CO")}</div>
        <div style={{ fontSize: 13, color: palette.inkDim, marginBottom: 18 }}>kg de volumen total</div>

        <div className="ft-emoji-pop" style={{ fontSize: 40, marginBottom: 8 }}>{comparison.emoji}</div>
        <p style={{ fontSize: 13, color: palette.ink, lineHeight: 1.5, maxWidth: 280, margin: "0 auto 22px" }}>
          Eso es como mover <strong>{comparison.text}</strong>
        </p>

        <div style={{ display: "flex", justifyContent: "center", gap: 24 }}>
          <div>
            <div style={{ fontSize: 17, fontWeight: 700 }}>{minutes} min</div>
            <div style={{ fontSize: 9.5, color: palette.inkDim, textTransform: "uppercase" }}>Duración</div>
          </div>
          <div>
            <div style={{ fontSize: 17, fontWeight: 700 }}>{Object.values(breakdown).reduce((a, b) => a + b, 0)}</div>
            <div style={{ fontSize: 9.5, color: palette.inkDim, textTransform: "uppercase" }}>Series</div>
          </div>
          {prs.length > 0 && (
            <div>
              <div style={{ fontSize: 17, fontWeight: 700, color: palette.accent }}>{prs.length}</div>
              <div style={{ fontSize: 9.5, color: palette.inkDim, textTransform: "uppercase" }}>Récords</div>
            </div>
          )}
        </div>

        {prs.length > 0 && (
          <div style={{ marginTop: 20, paddingTop: 16, borderTop: `1px solid ${palette.panelBorder}`, textAlign: "left" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8, color: palette.accent, fontWeight: 700, fontSize: 12.5 }}>
              <Trophy size={14} /> Hiciste récord en:
            </div>
            {prs.map((p) => <div key={p} style={{ fontSize: 12.5, marginBottom: 3, display: "flex", alignItems: "center", gap: 6 }}><Trophy size={11} /> {p}</div>)}
          </div>
        )}

        <div style={{ marginTop: 20, fontSize: 10, color: palette.inkDim, letterSpacing: "0.04em" }}>FitTrack</div>
      </div>

      <div style={{ marginBottom: 22 }}>
        <div style={{ fontSize: 11, color: palette.inkDim, marginBottom: 10, textTransform: "uppercase", fontWeight: 700 }}>Series por tipo</div>
        <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
          {Object.entries(breakdown).filter(([, count]) => count > 0).map(([type, count]) => (
            <div key={type} style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ width: 8, height: 8, borderRadius: "50%", background: BADGE_LABELS[type]?.color }} />
              <span style={{ fontSize: 12.5 }}>{count} {BADGE_LABELS[type]?.label}</span>
            </div>
          ))}
        </div>
      </div>

      <button onClick={share} disabled={sharing} style={{ width: "100%", padding: 13, borderRadius: 12, border: "none", marginBottom: 10, background: `linear-gradient(135deg, ${palette.accent}, ${palette.accentDeep})`, color: palette.bg, fontWeight: 700, fontSize: 14, cursor: "pointer", opacity: sharing ? 0.7 : 1 }}>
        {sharing ? "Generando imagen..." : "Compartir como imagen"}
      </button>

      {loggedExercises.length > 0 && (
        routineSaved ? (
          <div style={{ ...palette.glassPanel, padding: 12, marginBottom: 10, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
            <span style={{ fontSize: 12.5, color: palette.ink }}>Rutina guardada ✓</span>
            <Link href="/app/routines" style={{ fontSize: 12.5, fontWeight: 700, color: palette.accent, textDecoration: "none" }}>Ver rutinas</Link>
          </div>
        ) : showSaveRoutine ? (
          <div style={{ ...palette.glassPanel, padding: 12, marginBottom: 10 }}>
            <input
              value={newRoutineName} onChange={(e) => setNewRoutineName(e.target.value)} autoFocus
              placeholder="Nombre de la rutina"
              style={{ width: "100%", padding: "9px 12px", borderRadius: 10, border: `1px solid ${palette.panelBorder}`, background: palette.inputBg, color: palette.ink, fontSize: 13.5, fontFamily: "inherit", marginBottom: 10 }}
            />
            <p style={{ fontSize: 11, color: palette.inkDim, marginBottom: 10 }}>
              Se guarda con los {loggedExercises.length} ejercicios que completaste y sus series.
            </p>
            {saveRoutineError && <p style={{ fontSize: 11.5, color: "#f87171", marginBottom: 10 }}>{saveRoutineError}</p>}
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => setShowSaveRoutine(false)} style={{ flex: 1, padding: 11, borderRadius: 11, border: `1px solid ${palette.panelBorder}`, background: "none", color: palette.inkDim, cursor: "pointer", fontSize: 13 }}>Cancelar</button>
              <button onClick={saveAsRoutine} disabled={savingRoutine || !newRoutineName.trim()} style={{
                flex: 1, padding: 11, borderRadius: 11, border: "none", background: palette.accent, color: palette.bg,
                cursor: "pointer", fontSize: 13, fontWeight: 700, opacity: (savingRoutine || !newRoutineName.trim()) ? 0.5 : 1,
              }}>{savingRoutine ? "Guardando..." : "Guardar"}</button>
            </div>
          </div>
        ) : (
          <button onClick={() => setShowSaveRoutine(true)} style={{
            display: "flex", alignItems: "center", justifyContent: "center", gap: 7, width: "100%", padding: 13, borderRadius: 12,
            border: `1px solid ${palette.accent}55`, background: `${palette.accent}18`, color: palette.accent,
            fontWeight: 700, fontSize: 13.5, cursor: "pointer", marginBottom: 10,
          }}>
            <Save size={15} /> Guardar como rutina
          </button>
        )
      )}

      <button onClick={onDone} style={{ width: "100%", padding: 13, borderRadius: 12, border: `1px solid ${palette.panelBorder}`, background: "none", color: palette.inkDim, fontSize: 13.5, cursor: "pointer" }}>
        Volver a Inicio
      </button>
    </div>
  );
}
