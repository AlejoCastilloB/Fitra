"use client";

import { useRef, useState } from "react";
import { usePalette } from "@/lib/theme";
import { Mic, Square, Loader2, Sparkles } from "lucide-react";
import { FOOD_TASTE_OPTIONS } from "@/lib/foodTastes";

function fileToBase64(file: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve((reader.result as string).split(",")[1]);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export default function FoodAnamnesisFlow({ onDone }: { onDone: () => void }) {
  const palette = usePalette();
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const [likes, setLikes] = useState<string[]>([]);
  const [dislikes, setDislikes] = useState<string[]>([]);
  const [text, setText] = useState("");
  const [recording, setRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  function toggle(list: string[], setList: (v: string[]) => void, item: string) {
    setList(list.includes(item) ? list.filter((i) => i !== item) : [...list, item]);
  }

  async function toggleRecording() {
    if (recording) { mediaRecorderRef.current?.stop(); setRecording(false); return; }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      audioChunksRef.current = [];
      recorder.ondataavailable = (e) => audioChunksRef.current.push(e.data);
      recorder.onstop = () => { setAudioBlob(new Blob(audioChunksRef.current, { type: "audio/webm" })); stream.getTracks().forEach((t) => t.stop()); };
      recorder.start();
      mediaRecorderRef.current = recorder;
      setRecording(true);
    } catch { setError("No pudimos acceder al micrófono."); }
  }

  async function handleSubmit() {
    setSubmitting(true);
    setError("");
    try {
      const body: any = { likes, dislikes };
      if (text.trim()) body.text = text.trim();
      if (audioBlob) { body.audioBase64 = await fileToBase64(audioBlob); body.audioMimeType = "audio/webm"; }

      const res = await fetch("/api/ai/food-anamnesis", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const data = await res.json();

      if (!res.ok) setError(data.message || data.error || "No pudimos guardar tu perfil, inténtalo de nuevo");
      else onDone();
    } catch { setError("Fallo de red, inténtalo de nuevo"); }
    finally { setSubmitting(false); }
  }

  function ChipGroup({ selected, onToggle }: { selected: string[]; onToggle: (item: string) => void }) {
    return (
      <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
        {FOOD_TASTE_OPTIONS.map((opt) => (
          <button key={opt} onClick={() => onToggle(opt)} style={{
            padding: "8px 13px", borderRadius: 999, fontSize: 12.5, cursor: "pointer", fontWeight: 600,
            border: `1px solid ${selected.includes(opt) ? palette.accent : palette.panelBorder}`,
            background: selected.includes(opt) ? `${palette.accent}22` : palette.inputBg,
            color: selected.includes(opt) ? palette.accent : palette.inkDim,
          }}>{opt}</button>
        ))}
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 480, margin: "0 auto", paddingBottom: 30 }}>
      <div style={{ textAlign: "center", marginBottom: 22 }}>
        <Sparkles size={22} color={palette.accent} style={{ marginBottom: 8 }} />
        <h1 style={{ fontSize: 19, fontWeight: 700, marginBottom: 6 }}>Antes de empezar con Fitra</h1>
        <p style={{ fontSize: 12.5, color: palette.inkDim, lineHeight: 1.5 }}>
          Cuéntanos un poco de tus gustos alimenticios para que las sugerencias y los cálculos tengan sentido contigo — solo toma un minuto.
        </p>
      </div>

      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 10 }}>¿Qué te gusta comer?</div>
        <ChipGroup selected={likes} onToggle={(item) => toggle(likes, setLikes, item)} />
      </div>

      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 10 }}>¿Qué no te gusta o evitas?</div>
        <ChipGroup selected={dislikes} onToggle={(item) => toggle(dislikes, setDislikes, item)} />
      </div>

      <div style={{ marginBottom: 22 }}>
        <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 4 }}>¿Qué sueles comer en una semana típica?</div>
        <p style={{ fontSize: 11.5, color: palette.inkDim, marginBottom: 10, lineHeight: 1.4 }}>
          Por texto o nota de voz — ej: "entre semana desayuno huevos con arepa, almuerzo algo casero, y en la cena algo liviano. Los fines de semana como más variado..."
        </p>
        <textarea
          value={text} onChange={(e) => setText(e.target.value)}
          placeholder="Cuéntanos tus desayunos, almuerzos, cenas y snacks más comunes..."
          style={{ width: "100%", minHeight: 90, padding: 11, borderRadius: 11, border: `1px solid ${palette.panelBorder}`, background: palette.inputBg, color: palette.ink, fontSize: 13, marginBottom: 10, fontFamily: "inherit", resize: "vertical" }}
        />
        <button onClick={toggleRecording} style={{ display: "flex", alignItems: "center", gap: 8, padding: "9px 14px", borderRadius: 10, border: `1px solid ${recording ? "#f87171" : palette.panelBorder}`, background: recording ? "#f8717122" : palette.inputBg, color: recording ? "#f87171" : palette.ink, fontSize: 12.5, cursor: "pointer", fontWeight: 600 }}>
          {recording ? <><Square size={13} /> Detener grabación</> : <><Mic size={13} /> Grabar nota de voz</>}
        </button>
        {audioBlob && !recording && <p style={{ fontSize: 11.5, color: palette.accent, marginTop: 8 }}>✓ Nota de voz lista</p>}
      </div>

      {error && <p style={{ color: "#f87171", fontSize: 12.5, marginBottom: 12, textAlign: "center" }}>{error}</p>}

      <button onClick={handleSubmit} disabled={submitting} style={{
        width: "100%", padding: 14, borderRadius: 13, border: "none", marginBottom: 6,
        background: `linear-gradient(135deg, ${palette.accent}, ${palette.accentDeep})`, color: palette.bg,
        fontWeight: 700, fontSize: 14, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
        opacity: submitting ? 0.7 : 1,
      }}>
        {submitting ? <><Loader2 size={16} /> Guardando...</> : (likes.length || dislikes.length || text.trim() || audioBlob ? "Guardar y continuar" : "Omitir por ahora")}
      </button>
    </div>
  );
}
