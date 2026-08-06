"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { palette, glassPanel } from "@/lib/theme";
import { Camera, Loader2, Sparkles } from "lucide-react";

export default function NutritionPage() {
  const supabase = createClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [remaining, setRemaining] = useState<number | null>(null);
  const [error, setError] = useState("");

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

  function fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
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

          const dataUrl = canvas.toDataURL("image/jpeg", 0.7);
          resolve(dataUrl.split(",")[1]);
        };
        img.onerror = reject;
        img.src = reader.result as string;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setAnalyzing(true);
    setError("");

    try {
      const imageBase64 = await fileToBase64(file);
      const res = await fetch("/api/ai/log-food", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageBase64, mimeType: "image/jpeg" }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.message || data.error || "Error al analizar");
      } else {
        setRemaining(data.remaining);
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

      <input ref={fileRef} type="file" accept="image/*" capture="environment" onChange={handleFile} style={{ display: "none" }} />

      <button onClick={() => fileRef.current?.click()} disabled={analyzing} style={{
        width: "100%", padding: 16, borderRadius: 14, border: "none", marginBottom: 8,
        background: `linear-gradient(135deg, ${palette.accent}, ${palette.accentDeep})`, color: "#0A0C10",
        fontWeight: 700, fontSize: 14.5, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
        opacity: analyzing ? 0.7 : 1,
      }}>
        {analyzing ? <><Loader2 size={17} className="spin" /> La IA de Alejo está analizando...</> : <><Camera size={17} /> Foto de tu comida</>}
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
          {logs.map((l) => (
            <div key={l.id} style={{ ...glassPanel, padding: 14, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div style={{ fontSize: 13.5, fontWeight: 600 }}>{Math.round(l.kcal)} kcal</div>
                <div style={{ fontSize: 11, color: palette.inkDim }}>P: {Math.round(l.protein)}g · C: {Math.round(l.carbs)}g · G: {Math.round(l.fat)}g</div>
              </div>
              <span style={{ fontSize: 10, color: palette.accent, textTransform: "uppercase", fontWeight: 700 }}>
                {l.source === "photo_ai" ? "IA de Alejo" : l.source}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
