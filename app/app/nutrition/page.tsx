"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { palette, glassPanel } from "@/lib/theme";
import { Camera, Loader2, Sparkles, Mic, Square, ChevronDown } from "lucide-react";

export default function NutritionPage() {
  const supabase = createClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const [logs, setLogs] = useState<any[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [remaining, setRemaining] = useState<number | null>(null);
  const [error, setError] = useState("");

  const [note, setNote] = useState("");
  const [recording, setRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);

  async function loadLogs() {
    const { data: auth } = await supabase.auth.getUser();
    const today = new Date().toISOString().slice(0, 10);
    const { data } = await supabase
      .from("nutrition_logs")
      .select("*")
      .eq("client_id", auth.user!.id)
      .gte("date", `${today}T00:00:00`)
      .order("date", { ascending: false });
    setLogs(data ?? []);
    setLoading(false);
  }

  useEffect(() => { loadLogs(); }, []);

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

  async function toggleRecording() {
    if (recording) {
      mediaRecorderRef.current?.stop();
      setRecording(false);
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      audioChunksRef.current = [];
      recorder.ondataavailable = (e) => audioChunksRef.current.push(e.data);
      recorder.onstop = () => {
        setAudioBlob(new Blob(audioChunksRef.current, { type: "audio/webm" }));
        stream.getTracks().forEach((t) => t.stop());
      };
      recorder.start();
      mediaRecorderRef.current = recorder;
      setRecording(true);
    } catch {
      setError("No pudimos acceder al micrófono.");
    }
  }

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setAnalyzing(true);
    setError("");

    try {
      const imageBase64 = await fileToBase64(file, true);
      const body: any = { imageBase64, mimeType: "image/jpeg" };
      if (note) body.note = note;
      if (audioBlob) {
        body.audioBase64 = await fileToBase64(audioBlob, false);
        body.audioMimeType = "audio/webm";
      }

      const res = await fetch("/api/ai/log-food", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.message || data.error || "Error al analizar");
      } else {
        setRemaining(data.remaining);
        setExpandedId(data.log.id);
        setNote("");
        setAudioBlob(null);
        await loadLogs();
      }
    } catch {
      setError("Fallo de red, inténtalo de nuevo");
    } finally {
      setAnalyzing(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  const totals = logs.reduce((acc, l) => ({
    kcal: acc.kcal + (l.kcal ?? 0), protein: acc.protein + (l.protein ?? 0),
    carbs: acc.carbs + (l.carbs ?? 0), fat: acc.fat + (l.fat ?? 0),
  }), { kcal: 0, protein: 0, carbs: 0, fat: 0 });

  return (
    <div>
      <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 4 }}>Nutrición</h1>
      <p style={{ color: palette.inkDim, fontSize: 14, marginBottom: 20 }}>Hoy</p>

      <div style={{ ...glassPanel, padding: 18, marginBottom: 20 }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
          <span style={{ fontSize: 22, fontWeight: 700 }}>{Math.round(totals.kcal)}</span>
          <span style={{ fontSize: 12, color: palette.inkDim, alignSelf: "flex-end" }}>kcal hoy</span>
        </div>
        <div style={{ display: "flex", gap: 14, fontSize: 12, color: palette.inkDim }}>
          <span>P: {Math.round(totals.protein)}g</span>
          <span>C: {Math.round(totals.carbs)}g</span>
          <span>G: {Math.round(totals.fat)}g</span>
        </div>
      </div>

      {/* contexto extra antes de analizar */}
      <div style={{ ...glassPanel, padding: 16, marginBottom: 12 }}>
        <p style={{ fontSize: 11.5, color: palette.accent, fontWeight: 700, marginBottom: 8 }}>
          <Sparkles size={11} style={{ verticalAlign: -1, marginRight: 3 }} />
          Contexto extra (opcional)
        </p>
        <p style={{ fontSize: 11.5, color: palette.inkDim, marginBottom: 10, lineHeight: 1.4 }}>
          Contarle más detalles a la IA de Alejo —cantidad exacta, ingredientes, preparación— ayuda a que el cálculo de calorías sea más preciso.
        </p>
        <input
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Ej: 2 tazas de arroz, con aceite de oliva..."
          style={{ width: "100%", padding: "9px 12px", borderRadius: 10, border: `1px solid ${palette.panelBorder}`, background: palette.inputBg, color: palette.ink, fontSize: 13, marginBottom: 10 }}
        />
        <button onClick={toggleRecording} style={{
          display: "flex", alignItems: "center", gap: 8, padding: "9px 14px", borderRadius: 10,
          border: `1px solid ${recording ? "#f87171" : palette.panelBorder}`,
          background: recording ? "#f8717122" : palette.inputBg, color: recording ? "#f87171" : palette.ink,
          fontSize: 12.5, cursor: "pointer", fontWeight: 600,
        }}>
          {recording ? <><Square size={13} /> Detener grabación</> : <><Mic size={13} /> Grabar nota de voz</>}
        </button>
        {audioBlob && !recording && (
          <p style={{ fontSize: 11.5, color: palette.accent, marginTop: 8 }}>✓ Nota de voz lista, se enviará con la foto</p>
        )}
      </div>

      <input ref={fileRef} type="file" accept="image/*" capture="environment" onChange={handleFile} style={{ display: "none" }} />

      <button onClick={() => fileRef.current?.click()} disabled={analyzing} style={{
        width: "100%", padding: 16, borderRadius: 14, border: "none", marginBottom: 8,
        background: `linear-gradient(135deg, ${palette.accent}, ${palette.accentDeep})`, color: "#0A0C10",
        fontWeight: 700, fontSize: 14.5, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
        opacity: analyzing ? 0.7 : 1,
      }}>
        {analyzing ? <><Loader2 size={17} /> La IA de Alejo está analizando...</> : <><Camera size={17} /> Foto de tu comida</>}
      </button>

      {remaining !== null && (
        <p style={{ textAlign: "center", fontSize: 11.5, color: palette.inkDim, marginBottom: 16 }}>
          <Sparkles size={11} style={{ verticalAlign: -1, marginRight: 3 }} />
          {remaining} análisis gratis restantes hoy
        </p>
      )}

      {error && <p style={{ color: "#f87171", fontSize: 13, textAlign: "center", marginBottom: 16 }}>{error}</p>}

      <h2 style={{ fontSize: 13, fontWeight: 700, color: palette.accent, textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 10, marginTop: 24 }}>
        Registro de hoy
      </h2>

      {loading ? (
        <p style={{ color: palette.inkDim, fontSize: 13, textAlign: "center" }}>Cargando...</p>
      ) : logs.length === 0 ? (
        <div style={{ ...glassPanel, padding: 24, textAlign: "center", color: palette.inkDim }}>Todavía no registraste nada hoy.</div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {logs.map((l) => {
            const isOpen = expandedId === l.id;
            return (
              <div key={l.id} style={{ ...glassPanel, overflow: "hidden" }}>
                <button
                  onClick={() => setExpandedId(isOpen ? null : l.id)}
                  style={{ width: "100%", display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 16px", background: "none", border: "none", cursor: "pointer", color: palette.ink, textAlign: "left" }}
                >
                  <div>
                    <div style={{ fontSize: 13.5, fontWeight: 600 }}>{l.food_name || `${Math.round(l.kcal)} kcal`}</div>
                    <div style={{ fontSize: 11, color: palette.inkDim }}>{l.portion || `P: ${Math.round(l.protein)}g · C: ${Math.round(l.carbs)}g · G: ${Math.round(l.fat)}g`}</div>
                  </div>
                  <ChevronDown size={15} color={palette.inkDim} style={{ transform: isOpen ? "rotate(180deg)" : "none", transition: "transform .2s", flexShrink: 0 }} />
                </button>

                {isOpen && (
                  <div style={{ padding: "0 16px 16px" }}>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, fontSize: 12.5 }}>
                      <MacroRow label="Calorías" value={`${Math.round(l.kcal)} kcal`} />
                      <MacroRow label="Proteína" value={`${Math.round(l.protein)} g`} />
                      <MacroRow label="Carbohidratos" value={`${Math.round(l.carbs)} g`} />
                      <MacroRow label="Grasa" value={`${Math.round(l.fat)} g`} />
                      <MacroRow label="Fibra" value={`${Math.round(l.fiber ?? 0)} g`} />
                      <MacroRow label="Azúcar" value={`${Math.round(l.sugar ?? 0)} g`} />
                      <MacroRow label="Sodio" value={`${Math.round(l.sodium ?? 0)} mg`} />
                    </div>
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

function MacroRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div style={{ fontSize: 10.5, color: palette.inkDim }}>{label}</div>
      <div style={{ fontWeight: 600 }}>{value}</div>
    </div>
  );
}
