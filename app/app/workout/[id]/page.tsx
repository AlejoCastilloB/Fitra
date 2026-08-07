"use client";

import { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { palette, glassPanel } from "@/lib/theme";
import { Check, ChevronLeft, ChevronRight, X, Trophy, Flame } from "lucide-react";
import GifThumb from "@/components/GifThumb";

const REST_SECONDS = 90;

type LiveSet = { set_type: string; reps?: number; weight?: number; time_sec?: number; distance_m?: number; done: boolean };
type LiveExercise = {
  id: string; name: string; media_url?: string; measurement_type: string; notes?: string;
  sets: LiveSet[];
};

export default function WorkoutPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const supabase = createClient();

  const [loading, setLoading] = useState(true);
  const [routineName, setRoutineName] = useState("");
  const [exercises, setExercises] = useState<LiveExercise[]>([]);
  const [current, setCurrent] = useState(0);
  const [restLeft, setRestLeft] = useState(0);
  const [startedAt] = useState(Date.now());
  const [finished, setFinished] = useState<null | { volume: number; durationSec: number; prs: string[] }>(null);
  const audioRef = useRef<AudioContext | null>(null);
  const [timerSound, setTimerSound] = useState("clasico");

  useEffect(() => {
    (async () => {
      const { data: re } = await supabase
        .from("routine_exercises")
        .select("order_index, target_sets, notes, exercises(id, name, media_url, measurement_type)")
        .eq("routine_id", id)
        .order("order_index");

      const { data: routine } = await supabase.from("routines").select("name").eq("id", id).single();
      setRoutineName(routine?.name ?? "Entrenamiento");

      const { data: auth } = await supabase.auth.getUser();
      const { data: userRow } = await supabase.from("users").select("timer_sound").eq("id", auth.user!.id).single();
      if (userRow) setTimerSound(userRow.timer_sound);

      const built: LiveExercise[] = (re ?? []).map((r: any) => ({
        id: r.exercises.id,
        name: r.exercises.name,
        media_url: r.exercises.media_url,
        measurement_type: r.exercises.measurement_type,
        notes: r.notes,
        sets: (r.target_sets ?? []).map((s: any) => ({ ...s, done: false })),
      }));
      setExercises(built);
      setLoading(false);
    })();
  }, [id]);

  useEffect(() => {
    if (restLeft <= 0) return;
    const t = setInterval(() => {
      setRestLeft((s) => {
        if (s <= 1) {
          playBeep();
          if (navigator.vibrate) navigator.vibrate([200, 100, 200]);
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [restLeft]);

    function playBeep() {
    const sounds: Record<string, { freq: number; pattern: number[] }> = {
      clasico: { freq: 880, pattern: [0.35] },
      suave: { freq: 660, pattern: [0.5] },
      energico: { freq: 990, pattern: [0.12, 0.12, 0.12] },
    };
    const s = sounds[timerSound] || sounds.clasico;
    try {
      const ctx = audioRef.current ?? new (window.AudioContext || (window as any).webkitAudioContext)();
      audioRef.current = ctx;
      let t = ctx.currentTime;
      s.pattern.forEach((dur) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.frequency.value = s.freq;
        osc.connect(gain);
        gain.connect(ctx.destination);
        gain.gain.setValueAtTime(0.15, t);
        osc.start(t);
        osc.stop(t + dur);
        t += dur + 0.08;
      });
    } catch {}
  }

  function updateSet(exIdx: number, setIdx: number, field: string, value: any) {
    setExercises((prev) => prev.map((ex, i) => i !== exIdx ? ex : {
      ...ex, sets: ex.sets.map((s, j) => j !== setIdx ? s : { ...s, [field]: value }),
    }));
  }

  function toggleDone(exIdx: number, setIdx: number) {
    setExercises((prev) => prev.map((ex, i) => i !== exIdx ? ex : {
      ...ex, sets: ex.sets.map((s, j) => j !== setIdx ? s : { ...s, done: !s.done }),
    }));
    const set = exercises[exIdx].sets[setIdx];
    if (!set.done) setRestLeft(REST_SECONDS);
  }

  async function finishWorkout() {
    const { data: auth } = await supabase.auth.getUser();
    const uid = auth.user!.id;
    const durationSec = Math.round((Date.now() - startedAt) / 1000);

    let totalVolume = 0;
    const prsHit: string[] = [];

    const { data: workoutLog } = await supabase.from("workout_logs").insert({
      client_id: uid, routine_id: id, duration_sec: durationSec, total_volume: 0,
    }).select().single();

    for (const ex of exercises) {
      let bestWeight = 0;
      const rows = ex.sets.filter((s) => s.done).map((s, i) => {
        if (s.weight && s.reps) {
          totalVolume += s.weight * s.reps;
          if (s.weight > bestWeight) bestWeight = s.weight;
        }
        return {
          workout_log_id: workoutLog!.id, exercise_id: ex.id, set_number: i + 1,
          weight: s.weight ?? null, reps: s.reps ?? null, time_sec: s.time_sec ?? null,
          distance_m: s.distance_m ?? null, set_type: s.set_type,
        };
      });
      if (rows.length > 0) await supabase.from("set_logs").insert(rows);

      if (bestWeight > 0) {
        const { data: prevPr } = await supabase
          .from("personal_records").select("value").eq("client_id", uid).eq("exercise_id", ex.id).eq("type", "1rm")
          .order("value", { ascending: false }).limit(1).single();

        if (!prevPr || bestWeight > prevPr.value) {
          await supabase.from("personal_records").insert({ client_id: uid, exercise_id: ex.id, type: "1rm", value: bestWeight });
          prsHit.push(ex.name);
        }
      }
    }

    await supabase.from("workout_logs").update({ total_volume: totalVolume }).eq("id", workoutLog!.id);

    const { data: streakRow } = await supabase.from("streaks").select("*").eq("client_id", uid).single();
    if (streakRow) {
      await supabase.from("streaks").update({ current_weeks: streakRow.current_weeks + 1, last_workout_date: new Date().toISOString() }).eq("client_id", uid);
    } else {
      await supabase.from("streaks").insert({ client_id: uid, current_weeks: 1, last_workout_date: new Date().toISOString() });
    }

    setFinished({ volume: totalVolume, durationSec, prs: prsHit });
  }

  if (loading) return <p style={{ color: palette.inkDim, textAlign: "center", marginTop: 60 }}>Cargando entrenamiento...</p>;

  if (finished) {
    return <SummaryScreen routineName={routineName} volume={finished.volume} durationSec={finished.durationSec} prs={finished.prs} onDone={() => router.push("/app")} />;
  }

  const ex = exercises[current];
  if (!ex) return <p style={{ color: palette.inkDim, textAlign: "center", marginTop: 60 }}>Esta rutina no tiene ejercicios.</p>;

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
        <button onClick={() => router.push("/app")} style={{ background: "none", border: "none", color: palette.inkDim, cursor: "pointer" }}><X size={20} /></button>
        <span style={{ fontSize: 12.5, color: palette.inkDim }}>{current + 1} / {exercises.length}</span>
      </div>

      {restLeft > 0 && (
        <div style={{ ...glassPanel, padding: 14, display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16, border: `1px solid ${palette.accent}55` }}>
          <span style={{ fontSize: 13, color: palette.accent, fontWeight: 700 }}>Descanso</span>
          <span style={{ fontSize: 20, fontWeight: 700 }}>{Math.floor(restLeft / 60)}:{String(restLeft % 60).padStart(2, "0")}</span>
          <button onClick={() => setRestLeft(0)} style={{ fontSize: 11.5, color: palette.inkDim, background: "none", border: "none", cursor: "pointer" }}>Saltar</button>
        </div>
      )}

      <div style={{ ...glassPanel, padding: 20, marginBottom: 20 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 6 }}>
          <GifThumb src={ex.media_url} size={44} />
          <h1 style={{ fontSize: 18, fontWeight: 700 }}>{ex.name}</h1>
        </div>
        {ex.notes && <p style={{ fontSize: 12.5, color: palette.accent, marginTop: 6 }}>📝 {ex.notes}</p>}
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 24 }}>
        {ex.sets.map((s, i) => (
          <div key={i} style={{
            ...glassPanel, padding: 12, display: "flex", alignItems: "center", gap: 10,
            opacity: s.done ? 0.6 : 1,
          }}>
            <span style={{ fontSize: 11, color: palette.inkDim, width: 20 }}>{i + 1}</span>

            {ex.measurement_type === "reps_weight" && (
              <>
                <SetInput value={s.weight} onChange={(v) => updateSet(current, i, "weight", v)} placeholder="kg" />
                <SetInput value={s.reps} onChange={(v) => updateSet(current, i, "reps", v)} placeholder="reps" />
              </>
            )}
            {(ex.measurement_type === "time" || ex.measurement_type === "time_distance") && (
              <SetInput value={s.time_sec} onChange={(v) => updateSet(current, i, "time_sec", v)} placeholder="seg" />
            )}
            {(ex.measurement_type === "distance" || ex.measurement_type === "time_distance") && (
              <SetInput value={s.distance_m} onChange={(v) => updateSet(current, i, "distance_m", v)} placeholder="m" />
            )}

            <div style={{ flex: 1 }} />
            <button onClick={() => toggleDone(current, i)} style={{
              width: 30, height: 30, borderRadius: 9, border: `1px solid ${s.done ? palette.accent : palette.panelBorder}`,
              background: s.done ? palette.accent : "transparent", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer",
            }}>
              <Check size={15} color={s.done ? "#0A0C10" : palette.inkDim} />
            </button>
          </div>
        ))}
      </div>

      <div style={{ display: "flex", gap: 10 }}>
        <NavBtn disabled={current === 0} onClick={() => setCurrent((c) => c - 1)}><ChevronLeft size={16} /> Anterior</NavBtn>
        {current < exercises.length - 1 ? (
          <NavBtn primary onClick={() => setCurrent((c) => c + 1)}>Siguiente <ChevronRight size={16} /></NavBtn>
        ) : (
          <NavBtn primary onClick={finishWorkout}>Terminar entreno</NavBtn>
        )}
      </div>
    </div>
  );
}

function SetInput({ value, onChange, placeholder }: { value?: number; onChange: (v: number) => void; placeholder: string }) {
  return (
    <input
      type="number"
      value={value ?? ""}
      onChange={(e) => onChange(+e.target.value)}
      placeholder={placeholder}
      style={{ width: 56, padding: "7px 8px", borderRadius: 8, border: `1px solid ${palette.panelBorder}`, background: palette.inputBg, color: palette.ink, fontSize: 13, textAlign: "center" }}
    />
  );
}

function NavBtn({ children, onClick, disabled, primary }: { children: React.ReactNode; onClick: () => void; disabled?: boolean; primary?: boolean }) {
  return (
    <button onClick={onClick} disabled={disabled} style={{
      flex: 1, padding: 13, borderRadius: 12, border: primary ? "none" : `1px solid ${palette.panelBorder}`,
      background: primary ? `linear-gradient(135deg, ${palette.accent}, ${palette.accentDeep})` : palette.inputBg,
      color: primary ? "#0A0C10" : palette.ink, fontWeight: 700, fontSize: 13.5, cursor: disabled ? "default" : "pointer",
      opacity: disabled ? 0.35 : 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 4,
    }}>
      {children}
    </button>
  );
}

function SummaryScreen({ routineName, volume, durationSec, prs, onDone }: {
  routineName: string; volume: number; durationSec: number; prs: string[]; onDone: () => void;
}) {
  const minutes = Math.floor(durationSec / 60);

  async function share() {
    const text = `Completé "${routineName}" en FitTrack 💪\n${volume.toLocaleString()} kg de volumen total en ${minutes} min${prs.length ? `\n🏆 ${prs.length} nuevo(s) PR: ${prs.join(", ")}` : ""}`;
    if (navigator.share) {
      await navigator.share({ text });
    } else {
      await navigator.clipboard.writeText(text);
      alert("Copiado al portapapeles");
    }
  }

  return (
    <div style={{ textAlign: "center", paddingTop: 40 }}>
      <div style={{ width: 64, height: 64, borderRadius: "50%", background: `${palette.accent}22`, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 18px", color: palette.accent }}>
        <Flame size={28} />
      </div>
      <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 4 }}>¡Entreno completado!</h1>
      <p style={{ color: palette.inkDim, fontSize: 14, marginBottom: 28 }}>{routineName}</p>

      <div style={{ display: "flex", gap: 10, marginBottom: 20 }}>
        <div style={{ ...glassPanel, flex: 1, padding: 16 }}>
          <div style={{ fontSize: 20, fontWeight: 700 }}>{volume.toLocaleString()} kg</div>
          <div style={{ fontSize: 11, color: palette.inkDim }}>Volumen total</div>
        </div>
        <div style={{ ...glassPanel, flex: 1, padding: 16 }}>
          <div style={{ fontSize: 20, fontWeight: 700 }}>{minutes} min</div>
          <div style={{ fontSize: 11, color: palette.inkDim }}>Duración</div>
        </div>
      </div>

      {prs.length > 0 && (
        <div style={{ ...glassPanel, padding: 16, marginBottom: 20, textAlign: "left", border: `1px solid ${palette.accent}55` }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8, color: palette.accent, fontWeight: 700, fontSize: 13 }}>
            <Trophy size={16} /> Nuevos récords
          </div>
          {prs.map((p) => <div key={p} style={{ fontSize: 13, marginBottom: 3 }}>{p}</div>)}
        </div>
      )}

      <button onClick={share} style={{
        width: "100%", padding: 13, borderRadius: 12, border: "none", marginBottom: 10,
        background: `linear-gradient(135deg, ${palette.accent}, ${palette.accentDeep})`, color: "#0A0C10", fontWeight: 700, fontSize: 14, cursor: "pointer",
      }}>
        Compartir
      </button>
      <button onClick={onDone} style={{ width: "100%", padding: 13, borderRadius: 12, border: `1px solid ${palette.panelBorder}`, background: "none", color: palette.inkDim, fontSize: 13.5, cursor: "pointer" }}>
        Volver a Hoy
      </button>
    </div>
  );
}
