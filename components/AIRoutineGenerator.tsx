"use client";

import { useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { usePalette, type Palette } from "@/lib/theme";
import Modal from "@/components/Modal";
import { Sparkles, Camera, Mic, Square, X, Loader2 } from "lucide-react";

export default function AIRoutineGenerator({
  onClose, onGenerated,
}: { onClose: () => void; onGenerated: (result: { name: string; exercises: any[] }) => void }) {
  const palette = usePalette();
  const supabase = createClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const [prompt, setPrompt] = useState("");
  const [stagedImage, setStagedImage] = useState<string | null>(null);
  const [stagedPreview, setStagedPreview] = useState<string | null>(null);
  const [recording, setRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  function fileToBase64(file: File | Blob, isImage: boolean): Promise<string> {
    return new Promise((resolve, reject) => {
      if (!isImage) {
        const reader = new FileReader();
        reader.onload = () => resolve((reader.result as string).split(",")[1]);
        reader.onerror = reject;
        reader.readAsDataURL(file);
        return;
      }
      const img = new Image();
      const reader = new FileReader();
      reader.onload = () => {
        img.onload = () => {
          const canvas = document.createElement("canvas");
          const maxDim = 900;
          const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
          canvas.width = img.width * scale;
          canvas.height = img.height * scale;
          const ctx = canvas.getContext("2d");
          ctx?.drawImage(img, 0, 0, canvas.width, canvas.height);
          resolve(canvas.toDataURL("image/jpeg", 0.7).split(",")[1]);
        };
        img.onerror = reject;
        img.src = reader.result as string;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  async function handlePickImage(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const base64 = await fileToBase64(file, true);
    setStagedImage(base64);
    setStagedPreview(`data:image/jpeg;base64,${base64}`);
    if (fileRef.current) fileRef.current.value = "";
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

  async function generate() {
    if (!prompt.trim() && !stagedImage && !audioBlob) return;
    setLoading(true);
    setError("");
    try {
      const body: any = { prompt };
      if (stagedImage) { body.imageBase64 = stagedImage; body.mimeType = "image/jpeg"; }
      if (audioBlob) { body.audioBase64 = await fileToBase64(audioBlob, false); body.audioMimeType = "audio/webm"; }

      const res = await fetch("/api/ai/generate-routine", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const data = await res.json();

      if (!res.ok) { setError(data.message || data.error || "Error al generar"); setLoading(false); return; }

      const ids = data.exercises.map((e: any) => e.id);
      const { data: withMedia } = await supabase.from("exercises").select("id, media_url").in("id", ids);
      const mediaMap = Object.fromEntries((withMedia ?? []).map((e) => [e.id, e.media_url]));

      onGenerated({
        name: data.name,
        exercises: data.exercises.map((e: any) => ({ ...e, media_url: mediaMap[e.id] })),
      });
    } catch {
      setError("Fallo de red, inténtalo de nuevo");
      setLoading(false);
    }
  }

  return (
    <Modal title="Generar rutina con IA de Alejo" onClose={onClose} maxWidth={420}>
      <p style={{ fontSize: 12, color: palette.inkDim, marginBottom: 12, lineHeight: 1.5 }}>
        Describe lo que buscas (duración, enfoque, equipo disponible). También puedes adjuntar una foto o nota de voz.
      </p>

      <textarea
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        placeholder="Ej: rutina de 45 min, enfoque en pierna, tengo mancuernas y banco"
        style={{ width: "100%", minHeight: 70, padding: 12, borderRadius: 11, border: `1px solid ${palette.panelBorder}`, background: palette.inputBg, color: palette.ink, fontSize: 13.5, fontFamily: "inherit", resize: "vertical", marginBottom: 10 }}
      />

      {stagedPreview && (
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10, padding: 8, borderRadius: 10, background: palette.inputBg }}>
          <img src={stagedPreview} alt="" style={{ width: 40, height: 40, borderRadius: 8, objectFit: "cover" }} />
          <span style={{ fontSize: 11.5, color: palette.inkDim, flex: 1 }}>Foto lista</span>
          <button onClick={() => { setStagedImage(null); setStagedPreview(null); }} style={{ background: "none", border: "none", color: palette.inkDim, cursor: "pointer" }}><X size={15} /></button>
        </div>
      )}

      <input ref={fileRef} type="file" accept="image/*" onChange={handlePickImage} style={{ display: "none" }} />

      <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
        <button onClick={() => fileRef.current?.click()} style={pillBtn(palette)}><Camera size={13} /> Foto</button>
        <button onClick={toggleRecording} style={{ ...pillBtn(palette), borderColor: recording ? "#f87171" : palette.panelBorder, color: recording ? "#f87171" : palette.ink }}>
          {recording ? <><Square size={13} /> Detener</> : <><Mic size={13} /> Audio</>}
        </button>
        {audioBlob && !recording && <span style={{ fontSize: 11, color: palette.accent, alignSelf: "center" }}>✓ Audio listo</span>}
      </div>

      {error && <p style={{ color: "#f87171", fontSize: 12, marginBottom: 10 }}>{error}</p>}

      <button onClick={generate} disabled={loading || (!prompt.trim() && !stagedImage && !audioBlob)} style={{
        width: "100%", padding: 13, borderRadius: 12, border: "none",
        background: `linear-gradient(135deg, ${palette.accent}, ${palette.accentDeep})`, color: "#0A0C10",
        fontWeight: 700, fontSize: 14, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
        opacity: loading || (!prompt.trim() && !stagedImage && !audioBlob) ? 0.5 : 1,
      }}>
        {loading ? <><Loader2 size={16} /> Generando...</> : <><Sparkles size={16} /> Generar rutina</>}
      </button>
    </Modal>
  );
}

function pillBtn(palette: Palette): React.CSSProperties {
  return {
    display: "flex", alignItems: "center", gap: 6, padding: "8px 12px", borderRadius: 10,
    border: `1px solid ${palette.panelBorder}`, background: palette.inputBg, color: palette.ink,
    fontSize: 12.5, fontWeight: 600, cursor: "pointer",
  };
}
