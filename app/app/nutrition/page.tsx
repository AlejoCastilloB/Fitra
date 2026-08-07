"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { palette, glassPanel } from "@/lib/theme";
import { Camera, Loader2, Sparkles, Mic, Square, ChevronDown, Droplet, Plus, Star, X } from "lucide-react";
import MacroRing from "@/components/MacroRing";
import Modal from "@/components/Modal";
import Link from "next/link";

const DAILY_GOALS = { kcal: 2200, protein: 150, carbs: 220, fat: 70 };
const WATER_GOAL = 2500;
const WATER_STEP = 250;

const modalInput: React.CSSProperties = {
  width: "100%", padding: "10px 12px", borderRadius: 10, border: `1px solid ${palette.panelBorder}`,
  background: palette.inputBg, color: palette.ink, fontSize: 13.5, fontFamily: "inherit",
};

export default function NutritionPage() {
  const supabase = createClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const [logs, setLogs] = useState<any[]>([]);
  const [savedMeals, setSavedMeals] = useState<any[]>([]);
  const [water, setWater] = useState(0);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [remaining, setRemaining] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [coachTip, setCoachTip] = useState("");
  const [note, setNote] = useState("");
  const [recording, setRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [showManual, setShowManual] = useState(false);
  const [showSaved, setShowSaved] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  async function loadAll() {
    const { data: auth } = await supabase.auth.getUser();
    const uid = auth.user!.id;
    const today = new Date().toISOString().slice(0, 10);

    const { data: logsData } = await supabase.from("nutrition_logs").select("*").eq("client_id", uid).gte("date", `${today}T00:00:00`).order("date", { ascending: false });
    setLogs(logsData ?? []);

    const { data: savedData } = await supabase.from("saved_meals").select("*").eq("client_id", uid).order("created_at", { ascending: false });
    setSavedMeals(savedData ?? []);

    const { data: waterData } = await supabase.from("water_logs").select("ml").eq("client_id", uid).eq("date", today).single();
    setWater(waterData?.ml ?? 0);

    setLoading(false);
  }

  useEffect(() => { loadAll(); }, []);

  async function addWater(delta: number) {
    const next = Math.max(0, water + delta);
    setWater(next);
    const { data: auth } = await supabase.auth.getUser();
    await supabase.from("water_logs").upsert({ client_id: auth.user!.id, date: new Date().toISOString().slice(0, 10), ml: next });
  }

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

  async function uploadPhoto(file: File): Promise<string | null> {
    const { data: auth } = await supabase.auth.getUser();
    const path = `${auth.user!.id}/${Date.now()}.jpg`;
    const { error } = await supabase.storage.from("food-photos").upload(path, file, { contentType: file.type });
    if (error) return null;
    const { data } = supabase.storage.from("food-photos").getPublicUrl(path);
    return data.publicUrl;
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

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setAnalyzing(true);
    setError("");
    setCoachTip("");

    try {
      const imageBase64 = await fileToBase64(file, true);
      const photoUrl = await uploadPhoto(file);
      const body: any = { imageBase64, mimeType: "image/jpeg", photoUrl };
      if (note) body.note = note;
      if (audioBlob) { body.audioBase64 = await fileToBase64(audioBlob, false); body.audioMimeType = "audio/webm"; }

      const res = await fetch("/api/ai/log-food", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const data = await res.json();

      if (!res.ok) setError(data.message || data.error || "Error al analizar");
      else {
        setRemaining(data.remaining);
        setExpandedId(data.log.id);
        setCoachTip(data.coachTip || "");
        setNote(""); setAudioBlob(null);
        await loadAll();
      }
    } catch { setError("Fallo de red, inténtalo de nuevo"); }
    finally { setAnalyzing(false); if (fileRef.current) fileRef.current.value = ""; }
  }

  async function updateFoodName(logId: string, newName: string) {
    await supabase.from("nutrition_logs").update({ food_name: newName }).eq("id", logId);
    await loadAll();
  }

    async function toggleFavorite(log: any) {
    if (log.saved_meal_id) {
      // ya estaba guardada → la desmarca
      await supabase.from("saved_meals").delete().eq("id", log.saved_meal_id);
      await supabase.from("nutrition_logs").update({ saved_meal_id: null }).eq("id", log.id);
    } else {
      // no estaba guardada → la marca
      const { data: auth } = await supabase.auth.getUser();
      const { data: saved } = await supabase.from("saved_meals").insert({
        client_id: auth.user!.id, name: log.food_name || "Comida guardada",
        kcal: log.kcal, protein: log.protein, carbs: log.carbs, fat: log.fat,
        fiber: log.fiber, sugar: log.sugar, sodium: log.sodium,
      }).select().single();
      await supabase.from("nutrition_logs").update({ saved_meal_id: saved!.id }).eq("id", log.id);
    }
    await loadAll();
  }

  async function quickLogSaved(meal: any) {
    const { data: auth } = await supabase.auth.getUser();
    await supabase.from("nutrition_logs").insert({
      client_id: auth.user!.id, food_name: meal.name, portion: "Comida guardada",
      kcal: meal.kcal, protein: meal.protein, carbs: meal.carbs, fat: meal.fat,
      fiber: meal.fiber, sugar: meal.sugar, sodium: meal.sodium, source: "manual",
    });
    setShowSaved(false);
    await loadAll();
  }

  const totals = logs.reduce((acc, l) => ({
    kcal: acc.kcal + (l.kcal ?? 0), protein: acc.protein + (l.protein ?? 0),
    carbs: acc.carbs + (l.carbs ?? 0), fat: acc.fat + (l.fat ?? 0),
  }), { kcal: 0, protein: 0, carbs: 0, fat: 0 });

  return (
    <div>
      <style>{`
        @keyframes ftPop { from { opacity: 0; transform: scale(0.9) translateY(6px); } to { opacity: 1; transform: none; } }
        @keyframes ftDrop { 0% { transform: scale(1); } 40% { transform: scale(1.25); } 100% { transform: scale(1); } }
        .ft-pop { animation: ftPop .35s cubic-bezier(.16,.8,.24,1) both; }
        .ft-drop:active { animation: ftDrop .3s ease; }
      `}</style>

      <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 4 }}>Nutrición</h1>
      <p style={{ color: palette.inkDim, fontSize: 14, marginBottom: 6 }}>Hoy</p>
      <p style={{ color: palette.inkDim, fontSize: 12.5, lineHeight: 1.5, marginBottom: 18 }}>
        Toma una foto, escríbelo o graba una nota — la IA de Alejo se encarga del resto.
      </p>

      {/* anillos de macros */}
      <div className="ft-pop" style={{
        ...glassPanel, padding: 22, marginBottom: 14, position: "relative", overflow: "hidden",
        border: "1px solid transparent", backgroundImage: `linear-gradient(${palette.panel}, ${palette.panel}), ${palette.metallicBorder}`,
        backgroundOrigin: "border-box", backgroundClip: "padding-box, border-box",
      }}>
        <div style={{ display: "flex", justifyContent: "center", marginBottom: 20 }}>
          <MacroRing value={totals.kcal} max={DAILY_GOALS.kcal} size={130} stroke={11} colorFrom="#EDEFF3" colorTo="#8A93A0" label="Calorías" sublabel={`de ${DAILY_GOALS.kcal}`} />
        </div>
        <div style={{ display: "flex", justifyContent: "space-around" }}>
          <MacroRing value={totals.protein} max={DAILY_GOALS.protein} size={70} stroke={6} colorFrom="#A8EEDC" colorTo="#5EBBA0" label="Proteína" />
          <MacroRing value={totals.carbs} max={DAILY_GOALS.carbs} size={70} stroke={6} colorFrom="#F5D89A" colorTo="#D19A4A" label="Carbos" />
          <MacroRing value={totals.fat} max={DAILY_GOALS.fat} size={70} stroke={6} colorFrom="#F3AFAF" colorTo="#C56767" label="Grasa" />
        </div>
      </div>

      {/* agua */}
      <div className="ft-pop" style={{ ...glassPanel, padding: 16, marginBottom: 14, animationDelay: "0.05s" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Droplet size={16} color="#7DC4E8" />
            <span style={{ fontSize: 13, fontWeight: 600 }}>{(water / 1000).toFixed(1)}L / {(WATER_GOAL / 1000).toFixed(1)}L</span>
          </div>
          <div style={{ display: "flex", gap: 6 }}>
            <button className="ft-drop" onClick={() => addWater(-WATER_STEP)} style={waterBtn}>−</button>
            <button className="ft-drop" onClick={() => addWater(WATER_STEP)} style={{ ...waterBtn, background: palette.accent, color: "#0A0C10" }}>+</button>
          </div>
        </div>
        <div style={{ height: 8, borderRadius: 4, background: "rgba(255,255,255,0.08)", overflow: "hidden" }}>
          <div style={{ height: "100%", width: `${Math.min(100, (water / WATER_GOAL) * 100)}%`, background: "#7DC4E8", borderRadius: 4, transition: "width .5s cubic-bezier(.16,.8,.24,1)" }} />
        </div>
      </div>

      {/* contexto extra + captura */}
      <div className="ft-pop" style={{ ...glassPanel, padding: 16, marginBottom: 12, animationDelay: "0.1s" }}>
        <p style={{ fontSize: 11.5, color: palette.accent, fontWeight: 700, marginBottom: 8 }}>
          <Sparkles size={11} style={{ verticalAlign: -1, marginRight: 3 }} /> Contexto extra (opcional)
        </p>
        <p style={{ fontSize: 11.5, color: palette.inkDim, marginBottom: 10, lineHeight: 1.4 }}>
          Darle más detalles a la IA de Alejo ayuda a que el cálculo sea más preciso.
        </p>
        <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Ej: 2 tazas de arroz, con aceite de oliva..." style={{ width: "100%", padding: "9px 12px", borderRadius: 10, border: `1px solid ${palette.panelBorder}`, background: palette.inputBg, color: palette.ink, fontSize: 13, marginBottom: 10 }} />
        <button onClick={toggleRecording} style={{ display: "flex", alignItems: "center", gap: 8, padding: "9px 14px", borderRadius: 10, border: `1px solid ${recording ? "#f87171" : palette.panelBorder}`, background: recording ? "#f8717122" : palette.inputBg, color: recording ? "#f87171" : palette.ink, fontSize: 12.5, cursor: "pointer", fontWeight: 600 }}>
          {recording ? <><Square size={13} /> Detener grabación</> : <><Mic size={13} /> Grabar nota de voz</>}
        </button>
        {audioBlob && !recording && <p style={{ fontSize: 11.5, color: palette.accent, marginTop: 8 }}>✓ Nota de voz lista</p>}
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

      <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
        <button onClick={() => setShowManual(true)} style={secondaryBtn}><Plus size={14} /> Manual</button>
        <button onClick={() => setShowSaved(true)} style={secondaryBtn}><Star size={14} /> Guardadas {savedMeals.length > 0 && `(${savedMeals.length})`}</button>
      </div>
      <Link href="/app/nutrition/recipes" style={{ ...secondaryBtn, textDecoration: "none", marginBottom: 16, background: `${palette.accent}18`, borderColor: `${palette.accent}55` }}>
        <Sparkles size={14} color={palette.accent} /> Preguntarle a la IA de Alejo por recetas
      </Link>

      {remaining !== null && (
        <p style={{ textAlign: "center", fontSize: 11.5, color: palette.inkDim, marginBottom: 16 }}>
          <Sparkles size={11} style={{ verticalAlign: -1, marginRight: 3 }} /> {remaining} análisis gratis restantes hoy
        </p>
      )}

      {coachTip && (
        <div className="ft-pop" style={{ ...glassPanel, padding: 14, marginBottom: 14, border: `1px solid ${palette.accent}55`, display: "flex", gap: 10 }}>
          <Sparkles size={16} color={palette.accent} style={{ flexShrink: 0, marginTop: 1 }} />
          <p style={{ fontSize: 12.5, lineHeight: 1.5 }}>{coachTip}</p>
        </div>
      )}

      {error && <p style={{ color: "#f87171", fontSize: 13, textAlign: "center", marginBottom: 16 }}>{error}</p>}

      <h2 style={{ fontSize: 13, fontWeight: 700, color: palette.accent, textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 10, marginTop: 24 }}>Registro de hoy</h2>

      {loading ? (
        <p style={{ color: palette.inkDim, fontSize: 13, textAlign: "center" }}>Cargando...</p>
      ) : logs.length === 0 ? (
        <div style={{ ...glassPanel, padding: 24, textAlign: "center", color: palette.inkDim }}>Todavía no registraste nada hoy.</div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {logs.map((l, idx) => {
            const isOpen = expandedId === l.id;
            return (
              <div key={l.id} className="ft-pop" style={{ ...glassPanel, overflow: "hidden", animationDelay: `${idx * 0.04}s` }}>
                <div style={{ display: "flex", alignItems: "center" }}>
                  {l.photo_url && (
                    <img src={l.photo_url} alt="" style={{ width: 44, height: 44, borderRadius: 10, objectFit: "cover", margin: "10px 0 10px 14px", flexShrink: 0 }} />
                  )}
                  <button onClick={() => setExpandedId(isOpen ? null : l.id)} style={{ flex: 1, display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 8px 14px 14px", background: "none", border: "none", cursor: "pointer", color: palette.ink, textAlign: "left" }}>
                    <div>
                      <div style={{ fontSize: 13.5, fontWeight: 600 }}>{l.food_name || `${Math.round(l.kcal)} kcal`}</div>
                      <div style={{ fontSize: 11, color: palette.inkDim }}>{l.portion || `P: ${Math.round(l.protein)}g · C: ${Math.round(l.carbs)}g · G: ${Math.round(l.fat)}g`}</div>
                    </div>
                    <ChevronDown size={15} color={palette.inkDim} style={{ transform: isOpen ? "rotate(180deg)" : "none", transition: "transform .2s", flexShrink: 0 }} />
                  </button>
                  <button onClick={() => toggleFavorite(l)} style={{ background: "none", border: "none", color: l.saved_meal_id ? palette.accent : palette.inkDim, cursor: "pointer", padding: "0 14px" }} title={l.saved_meal_id ? "Quitar de favoritas" : "Guardar como favorita"}>
                    <Star size={15} fill={l.saved_meal_id ? palette.accent : "none"} />
                    </button>
                </div>

                {isOpen && (
                  <div style={{ padding: "0 16px 16px" }}>
                    <input
                      defaultValue={l.food_name || ""}
                      onBlur={(e) => e.target.value !== l.food_name && updateFoodName(l.id, e.target.value)}
                      placeholder="Nombre de la comida"
                      style={{ width: "100%", padding: "8px 10px", borderRadius: 9, border: `1px solid ${palette.panelBorder}`, background: palette.inputBg, color: palette.ink, fontSize: 13, fontWeight: 600, marginBottom: 12 }}
                    />
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

      {showManual && <ManualMealModal onClose={() => setShowManual(false)} onSaved={loadAll} />}
      {showSaved && <SavedMealsModal meals={savedMeals} onClose={() => setShowSaved(false)} onPick={quickLogSaved} />}
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

const waterBtn: React.CSSProperties = {
  width: 30, height: 30, borderRadius: 9, border: `1px solid ${palette.panelBorder}`,
  background: palette.inputBg, color: palette.ink, fontSize: 16, fontWeight: 700, cursor: "pointer",
};
const secondaryBtn: React.CSSProperties = {
  flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "10px",
  borderRadius: 12, border: `1px solid ${palette.panelBorder}`, background: palette.inputBg, color: palette.ink,
  fontSize: 12.5, fontWeight: 600, cursor: "pointer",
};

function ManualMealModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const supabase = createClient();
  const [name, setName] = useState("");
  const [kcal, setKcal] = useState(""); const [protein, setProtein] = useState("");
  const [carbs, setCarbs] = useState(""); const [fat, setFat] = useState("");
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    const { data: auth } = await supabase.auth.getUser();
    await supabase.from("nutrition_logs").insert({
      client_id: auth.user!.id, food_name: name || "Comida manual",
      kcal: +kcal || 0, protein: +protein || 0, carbs: +carbs || 0, fat: +fat || 0, source: "manual",
    });
    setSaving(false);
    onSaved();
    onClose();
  }

  return (
    <Modal title="Comida manual" onClose={onClose}>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nombre" style={modalInput} />
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <input value={kcal} onChange={(e) => setKcal(e.target.value)} placeholder="kcal" type="number" style={modalInput} />
          <input value={protein} onChange={(e) => setProtein(e.target.value)} placeholder="Proteína (g)" type="number" style={modalInput} />
          <input value={carbs} onChange={(e) => setCarbs(e.target.value)} placeholder="Carbos (g)" type="number" style={modalInput} />
          <input value={fat} onChange={(e) => setFat(e.target.value)} placeholder="Grasa (g)" type="number" style={modalInput} />
        </div>
        <button onClick={save} disabled={saving || !name} style={{ marginTop: 6, padding: 13, borderRadius: 12, border: "none", background: `linear-gradient(135deg, ${palette.accent}, ${palette.accentDeep})`, color: "#0A0C10", fontWeight: 700, fontSize: 14, cursor: "pointer", opacity: saving || !name ? 0.6 : 1 }}>
          {saving ? "Guardando..." : "Registrar"}
        </button>
      </div>
    </Modal>
  );
}

function SavedMealsModal({ meals, onClose, onPick }: { meals: any[]; onClose: () => void; onPick: (m: any) => void }) {
  return (
    <Modal title="Comidas guardadas" onClose={onClose}>
      {meals.length === 0 ? (
        <p style={{ color: palette.inkDim, fontSize: 13, textAlign: "center", padding: 20 }}>
          Todavía no guardaste ninguna comida. Toca la estrella ⭐ en cualquier registro para guardarla.
        </p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {meals.map((m) => (
            <button key={m.id} onClick={() => onPick(m)} style={{ ...glassPanel, padding: 12, display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer", border: "none", textAlign: "left", width: "100%" }}>
              <div>
                <div style={{ fontSize: 13.5, fontWeight: 600 }}>{m.name}</div>
                <div style={{ fontSize: 11, color: palette.inkDim }}>{Math.round(m.kcal)} kcal · P: {Math.round(m.protein)}g</div>
              </div>
              <Plus size={16} color={palette.accent} />
            </button>
          ))}
        </div>
      )}
    </Modal>
  );
}
