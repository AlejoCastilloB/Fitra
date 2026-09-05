"use client";

import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { usePalette, type Palette } from "@/lib/theme";
import { Camera, Loader2, Sparkles, Mic, Square, ChevronDown, Droplet, Plus, Star, X, Trash2, MoreVertical, Wand2, Images } from "lucide-react";
import MacroRing from "@/components/MacroRing";
import SwipeCarousel from "@/components/SwipeCarousel";
import Modal from "@/components/Modal";
import FitraCamera from "@/components/FitraCamera";
import Overlay from "@/components/Overlay";
import Link from "next/link";
import { DAILY_GOALS } from "@/lib/nutritionGoals";
import { localDateKey, startOfLocalDay } from "@/lib/localDate";
import FirstTimeHint, { markHintSeen } from "@/components/FirstTimeHint";

const HEALTH_TARGETS = { fiber: 30, sugarLimit: 50, sodiumLimit: 2300 };
const WATER_GOAL = 2500;
const WATER_STEP = 250;

function computeHealthScore(fiber: number, sugar: number, sodium: number, protein: number, proteinGoal: number) {
  const fiberScore = Math.min(100, (fiber / HEALTH_TARGETS.fiber) * 100);
  const sugarScore = sugar <= HEALTH_TARGETS.sugarLimit ? 100 : Math.max(0, 100 - (sugar - HEALTH_TARGETS.sugarLimit) * 2);
  const sodiumScore = sodium <= HEALTH_TARGETS.sodiumLimit ? 100 : Math.max(0, 100 - (sodium - HEALTH_TARGETS.sodiumLimit) / 20);
  const proteinScore = Math.min(100, (protein / proteinGoal) * 100);
  return Math.round((fiberScore + sugarScore + sodiumScore + proteinScore) / 4);
}

export default function NutritionContent() {
  const palette = usePalette();
  const supabase = createClient();
  const searchParams = useSearchParams();
  const fileRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const fixRecorderRef = useRef<MediaRecorder | null>(null);
  const fixChunksRef = useRef<Blob[]>([]);
  const voiceRecorderRef = useRef<MediaRecorder | null>(null);
  const voiceChunksRef = useRef<Blob[]>([]);

  const [logs, setLogs] = useState<any[]>([]);
  const [savedMeals, setSavedMeals] = useState<any[]>([]);
  const [water, setWater] = useState(0);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [remaining, setRemaining] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [coachTip, setCoachTip] = useState("");
  const [note, setNote] = useState("");
  const [recording, setRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [showSaved, setShowSaved] = useState(false);
  const [goals, setGoals] = useState(DAILY_GOALS);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [pendingPreviewUrl, setPendingPreviewUrl] = useState<string | null>(null);
  const [showCamera, setShowCamera] = useState(false);
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
  const [fixingId, setFixingId] = useState<string | null>(null);
  const [fixText, setFixText] = useState("");
  const [fixRecording, setFixRecording] = useState(false);
  const [fixAudioBlob, setFixAudioBlob] = useState<Blob | null>(null);
  const [fixSubmitting, setFixSubmitting] = useState(false);
  const [fixError, setFixError] = useState("");
  const [showVoiceLog, setShowVoiceLog] = useState(false);
  const [voiceText, setVoiceText] = useState("");
  const [voiceRecording, setVoiceRecording] = useState(false);
  const [voiceAudioBlob, setVoiceAudioBlob] = useState<Blob | null>(null);
  const [voiceSubmitting, setVoiceSubmitting] = useState(false);
  const [voiceError, setVoiceError] = useState("");

  async function loadAll() {
    const { data: auth } = await supabase.auth.getUser();
    const uid = auth.user!.id;
    const today = localDateKey();
    const dayStart = startOfLocalDay().toISOString();

    const { data: logsData } = await supabase.from("nutrition_logs").select("*").eq("client_id", uid).gte("date", dayStart).order("date", { ascending: false });
    setLogs(logsData ?? []);

    const { data: savedData } = await supabase.from("saved_meals").select("*").eq("client_id", uid).order("created_at", { ascending: false });
    setSavedMeals(savedData ?? []);

    const { data: waterData } = await supabase.from("water_logs").select("ml").eq("client_id", uid).eq("date", today).single();
    setWater(waterData?.ml ?? 0);

    const { data: clientRow } = await supabase.from("clients").select("daily_kcal_goal, daily_protein_goal, daily_carbs_goal, daily_fat_goal").eq("user_id", uid).single();
    if (clientRow?.daily_kcal_goal) {
      setGoals({ kcal: clientRow.daily_kcal_goal, protein: clientRow.daily_protein_goal, carbs: clientRow.daily_carbs_goal, fat: clientRow.daily_fat_goal });
    }

    setLoading(false);
  }

  useEffect(() => { loadAll(); }, []);

  useEffect(() => {
    // `closeDay` se conserva porque quedan notificaciones ya enviadas que apuntan ahí:
    // en vez de dejarlas en una pantalla que ya no existe, abren la nota de voz.
    if (searchParams.get("voice") === "1" || searchParams.get("closeDay") === "1") setShowVoiceLog(true);
  }, [searchParams]);

  async function addWater(delta: number) {
    markHintSeen("water_track");
    const next = Math.max(0, water + delta);
    setWater(next);
    const { data: auth } = await supabase.auth.getUser();
    await supabase.from("water_logs").upsert({ client_id: auth.user!.id, date: localDateKey(), ml: next });
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
          // Suficiente resolución para que Fitra pueda contar unidades (albóndigas, rodajas, etc.)
          // en vez de solo reconocer el tipo de platillo — la precisión de la porción depende de esto.
          const maxDim = 1280;
          const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
          canvas.width = img.width * scale;
          canvas.height = img.height * scale;
          const ctx = canvas.getContext("2d");
          ctx?.drawImage(img, 0, 0, canvas.width, canvas.height);
          resolve(canvas.toDataURL("image/jpeg", 0.85).split(",")[1]);
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

  async function toggleVoiceRecording() {
    if (voiceRecording) { voiceRecorderRef.current?.stop(); setVoiceRecording(false); return; }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      voiceChunksRef.current = [];
      recorder.ondataavailable = (e) => voiceChunksRef.current.push(e.data);
      recorder.onstop = () => { setVoiceAudioBlob(new Blob(voiceChunksRef.current, { type: "audio/webm" })); stream.getTracks().forEach((t) => t.stop()); };
      recorder.start();
      voiceRecorderRef.current = recorder;
      setVoiceRecording(true);
    } catch { setVoiceError("No pudimos acceder al micrófono."); }
  }

  function closeVoiceModal() {
    setShowVoiceLog(false);
    setVoiceText(""); setVoiceAudioBlob(null); setVoiceError("");
  }

  /** Registra una comida solo con lo que el usuario cuenta: sin foto obligatoria. */
  async function submitVoiceLog() {
    if (!voiceText.trim() && !voiceAudioBlob) return;
    setVoiceSubmitting(true);
    setVoiceError("");
    try {
      const body: any = {};
      if (voiceText.trim()) body.note = voiceText.trim();
      if (voiceAudioBlob) { body.audioBase64 = await fileToBase64(voiceAudioBlob, false); body.audioMimeType = "audio/webm"; }

      const res = await fetch("/api/ai/log-food", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const data = await res.json();

      if (!res.ok) setVoiceError(data.message || data.error || "Error al registrar tu comida");
      else {
        setRemaining(data.remaining);
        setExpandedId(data.log.id);
        setCoachTip(data.coachTip || "");
        closeVoiceModal();
        await loadAll();
      }
    } catch { setVoiceError("Fallo de red, inténtalo de nuevo"); }
    finally { setVoiceSubmitting(false); }
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setShowCamera(false);
    setError("");
    setCoachTip("");
    if (pendingPreviewUrl) URL.revokeObjectURL(pendingPreviewUrl);
    setPendingFile(file);
    setPendingPreviewUrl(URL.createObjectURL(file));
  }

  function openFix(logId: string) {
    setMenuOpenId(null);
    setExpandedId(logId);
    setFixingId(logId);
    setFixText(""); setFixAudioBlob(null); setFixError("");
  }

  function closeFix() {
    setFixingId(null);
    setFixText(""); setFixAudioBlob(null); setFixError("");
  }

  async function toggleFixRecording() {
    if (fixRecording) { fixRecorderRef.current?.stop(); setFixRecording(false); return; }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      fixChunksRef.current = [];
      recorder.ondataavailable = (e) => fixChunksRef.current.push(e.data);
      recorder.onstop = () => { setFixAudioBlob(new Blob(fixChunksRef.current, { type: "audio/webm" })); stream.getTracks().forEach((t) => t.stop()); };
      recorder.start();
      fixRecorderRef.current = recorder;
      setFixRecording(true);
    } catch { setFixError("No pudimos acceder al micrófono."); }
  }

  // Reanaliza la misma foto sumándole lo que el usuario aclara, y actualiza ese registro.
  async function submitFix(logId: string) {
    if (!fixText.trim() && !fixAudioBlob) return;
    setFixSubmitting(true);
    setFixError("");
    try {
      const body: any = { logId };
      if (fixText.trim()) body.note = fixText.trim();
      if (fixAudioBlob) { body.audioBase64 = await fileToBase64(fixAudioBlob, false); body.audioMimeType = "audio/webm"; }

      const res = await fetch("/api/ai/log-food", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const data = await res.json();

      if (!res.ok) setFixError(data.message || data.error || "No pudimos ajustar el registro");
      else {
        setRemaining(data.remaining);
        setCoachTip(data.coachTip || "");
        closeFix();
        await loadAll();
      }
    } catch { setFixError("Fallo de red, inténtalo de nuevo"); }
    finally { setFixSubmitting(false); }
  }

  function handleCameraCapture(file: File) {
    setShowCamera(false);
    setError("");
    setCoachTip("");
    if (pendingPreviewUrl) URL.revokeObjectURL(pendingPreviewUrl);
    setPendingFile(file);
    setPendingPreviewUrl(URL.createObjectURL(file));
  }

  function cancelPending() {
    if (pendingPreviewUrl) URL.revokeObjectURL(pendingPreviewUrl);
    setPendingFile(null);
    setPendingPreviewUrl(null);
    setNote(""); setAudioBlob(null);
    if (fileRef.current) fileRef.current.value = "";
  }

  async function analyzePending() {
    if (!pendingFile) return;
    setAnalyzing(true);
    setError("");
    setCoachTip("");

    try {
      const imageBase64 = await fileToBase64(pendingFile, true);
      const photoUrl = await uploadPhoto(pendingFile);
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
        cancelPending();
        await loadAll();
        return;
      }
    } catch { setError("Fallo de red, inténtalo de nuevo"); }
    finally { setAnalyzing(false); }
  }

  async function updateFoodName(logId: string, newName: string) {
    await supabase.from("nutrition_logs").update({ food_name: newName }).eq("id", logId);
    await loadAll();
  }

  async function deleteLog(logId: string) {
    await supabase.from("nutrition_logs").delete().eq("id", logId);
    await loadAll();
  }

  async function toggleFavorite(log: any) {
    if (log.saved_meal_id) {
      await supabase.from("saved_meals").delete().eq("id", log.saved_meal_id);
      await supabase.from("nutrition_logs").update({ saved_meal_id: null }).eq("id", log.id);
    } else {
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
    fiber: acc.fiber + (l.fiber ?? 0), sugar: acc.sugar + (l.sugar ?? 0), sodium: acc.sodium + (l.sodium ?? 0),
  }), { kcal: 0, protein: 0, carbs: 0, fat: 0, fiber: 0, sugar: 0, sodium: 0 });

  const healthScore = logs.length > 0 ? computeHealthScore(totals.fiber, totals.sugar, totals.sodium, totals.protein, goals.protein) : null;

  return (
    <div>
      <style>{`
        @keyframes ftPop { from { opacity: 0; transform: scale(0.9) translateY(6px); } to { opacity: 1; transform: none; } }
        @keyframes ftDrop { 0% { transform: scale(1); } 40% { transform: scale(1.25); } 100% { transform: scale(1); } }
        .ft-pop { animation: ftPop .35s cubic-bezier(.16,.8,.24,1) both; }
        .ft-drop:active { animation: ftDrop .3s ease; }
      `}</style>

      <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 6 }}>Nutrición</h1>
      <p style={{ color: palette.inkDim, fontSize: 12.5, lineHeight: 1.5, marginBottom: 18 }}>
        Toma una foto, escríbelo o graba una nota — Fitra se encarga del resto.
      </p>

      <div className="ft-pop" style={{ marginBottom: 14 }}>
        <SwipeCarousel>
          <div style={{
            background: palette.panel, border: `1px solid ${palette.panelBorder}`, borderRadius: 20,
            padding: 22, position: "relative", overflow: "hidden",
          }}>
            <div style={{ display: "flex", justifyContent: "center", marginBottom: 20 }}>
              <MacroRing value={totals.kcal} max={goals.kcal} size={130} stroke={11} colorFrom="#EDEFF3" colorTo="#8A93A0" label="Calorías" sublabel={`de ${goals.kcal}`} />
            </div>
            <div style={{ display: "flex", justifyContent: "space-around" }}>
              <MacroRing value={totals.protein} max={goals.protein} size={70} stroke={6} colorFrom="#A8EEDC" colorTo="#5EBBA0" label="Proteína" />
              <MacroRing value={totals.carbs} max={goals.carbs} size={70} stroke={6} colorFrom="#F5D89A" colorTo="#D19A4A" label="Carbos" />
              <MacroRing value={totals.fat} max={goals.fat} size={70} stroke={6} colorFrom="#F3AFAF" colorTo="#C56767" label="Grasa" />
            </div>
          </div>

          <div style={{
            background: palette.panel, border: `1px solid ${palette.panelBorder}`, borderRadius: 20,
            padding: 22, position: "relative", overflow: "hidden",
          }}>
            <div style={{ display: "flex", justifyContent: "space-around", marginBottom: 20 }}>
              <MacroRing value={totals.fiber} max={HEALTH_TARGETS.fiber} size={82} stroke={7} colorFrom="#C9A8F0" colorTo="#8C5FC7" label="Fibra" />
              <MacroRing value={totals.sugar} max={HEALTH_TARGETS.sugarLimit} size={82} stroke={7} colorFrom="#F3AFC4" colorTo="#C76488" label="Azúcar" />
              <MacroRing value={totals.sodium} max={HEALTH_TARGETS.sodiumLimit} size={82} stroke={7} colorFrom="#F5D89A" colorTo="#C79A4A" label="Sodio" />
            </div>
            <div style={{ borderTop: `1px solid ${palette.panelBorder}`, paddingTop: 14 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                <span style={{ fontSize: 12.5, fontWeight: 700, color: palette.ink }}>Puntuación de salud</span>
                <span style={{ fontSize: 13, fontWeight: 700, color: palette.accent }}>{healthScore !== null ? healthScore : "N/D"}</span>
              </div>
              <div style={{ height: 6, borderRadius: 4, background: palette.divider, overflow: "hidden" }}>
                <div style={{ height: "100%", width: `${healthScore ?? 0}%`, background: `linear-gradient(90deg, ${palette.accentDeep}, ${palette.accent})`, borderRadius: 4, transition: "width .6s cubic-bezier(.16,.8,.24,1)" }} />
              </div>
              {healthScore === null && (
                <p style={{ fontSize: 11, color: palette.inkDim, marginTop: 8 }}>Registra algo para generar tu puntuación de hoy.</p>
              )}
            </div>
          </div>
        </SwipeCarousel>
      </div>

      <div className="ft-pop" style={{ ...palette.glassPanel, padding: 16, marginBottom: 14, animationDelay: "0.05s" }}>
        <FirstTimeHint id="water_track" text="Toca + o − para registrar cuánta agua tomas en el día — te ayuda a mantener buenos hábitos de hidratación." />
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Droplet size={16} color="#7DC4E8" />
            <span style={{ fontSize: 13, fontWeight: 600 }}>{(water / 1000).toFixed(1)}L / {(WATER_GOAL / 1000).toFixed(1)}L</span>
          </div>
          <div style={{ display: "flex", gap: 6 }}>
            <button className="ft-drop" onClick={() => addWater(-WATER_STEP)} style={waterBtn(palette)}>−</button>
            <button className="ft-drop" onClick={() => addWater(WATER_STEP)} style={{ ...waterBtn(palette), background: palette.accent, color: palette.bg }}>+</button>
          </div>
        </div>
        <div style={{ height: 8, borderRadius: 4, background: palette.divider, overflow: "hidden" }}>
          <div style={{ height: "100%", width: `${Math.min(100, (water / WATER_GOAL) * 100)}%`, background: "#7DC4E8", borderRadius: 4, transition: "width .5s cubic-bezier(.16,.8,.24,1)" }} />
        </div>
      </div>

      <input ref={fileRef} type="file" accept="image/*" onChange={handleFileSelect} style={{ display: "none" }} />

      {pendingFile ? (
        <div className="ft-pop" style={{ ...palette.glassPanel, padding: 16, marginBottom: 16 }}>
          <div style={{ display: "flex", gap: 12, marginBottom: 14 }}>
            {pendingPreviewUrl && (
              <img src={pendingPreviewUrl} alt="" style={{ width: 64, height: 64, borderRadius: 12, objectFit: "cover", flexShrink: 0 }} />
            )}
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13.5, fontWeight: 700, marginBottom: 3 }}>Antes de calcular...</div>
              <p style={{ fontSize: 11.5, color: palette.inkDim, lineHeight: 1.4 }}>
                Cuéntale qué es, cómo se preparó o cuál parte de la foto comiste — Fitra calcula solo eso.
              </p>
            </div>
            <button onClick={cancelPending} aria-label="Quitar foto" style={{ background: "none", border: "none", color: palette.inkDim, cursor: "pointer", flexShrink: 0, display: "flex" }}>
              <X size={16} />
            </button>
          </div>

          <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Ej: solo el plato de la izquierda, sin el arroz..." style={{ width: "100%", padding: "9px 12px", borderRadius: 10, border: `1px solid ${palette.panelBorder}`, background: palette.inputBg, color: palette.ink, fontSize: 13, marginBottom: 10 }} />
          <button onClick={toggleRecording} style={{ display: "flex", alignItems: "center", gap: 8, padding: "9px 14px", borderRadius: 10, border: `1px solid ${recording ? "#f87171" : palette.panelBorder}`, background: recording ? "#f8717122" : palette.inputBg, color: recording ? "#f87171" : palette.ink, fontSize: 12.5, cursor: "pointer", fontWeight: 600, marginBottom: 6 }}>
            {recording ? <><Square size={13} /> Detener grabación</> : <><Mic size={13} /> Grabar nota de voz</>}
          </button>
          {audioBlob && !recording ? (
            <p style={{ fontSize: 11.5, color: palette.accent, marginBottom: 14 }}>✓ Nota de voz lista</p>
          ) : (
            <p style={{ fontSize: 11, color: palette.inkDim, lineHeight: 1.4, marginBottom: 14 }}>
              💡 Si la foto tiene comida de varias personas o no te lo comiste todo, dilo en el audio y Fitra cuenta solo tu parte.
            </p>
          )}

          <button onClick={analyzePending} disabled={analyzing} style={{
            width: "100%", padding: 15, borderRadius: 13, border: "none", marginBottom: 8,
            background: `linear-gradient(135deg, ${palette.accent}, ${palette.accentDeep})`, color: palette.bg,
            fontWeight: 700, fontSize: 14, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
            opacity: analyzing ? 0.7 : 1,
          }}>
            {analyzing ? <><Loader2 size={16} /> Fitra está analizando...</> : <><Sparkles size={16} /> Calcular calorías</>}
          </button>
          <button onClick={cancelPending} disabled={analyzing} style={{ width: "100%", padding: 10, borderRadius: 12, border: "none", background: "none", color: palette.inkDim, fontSize: 12.5, cursor: "pointer" }}>
            Cancelar
          </button>
        </div>
      ) : (
        <>
          <button onClick={() => { setError(""); setCoachTip(""); setShowCamera(true); }} style={{
            width: "100%", padding: 16, borderRadius: 14, border: "none", marginBottom: 8,
            background: `linear-gradient(135deg, ${palette.accent}, ${palette.accentDeep})`, color: palette.bg,
            fontWeight: 700, fontSize: 14.5, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
          }}>
            <Camera size={17} /> Foto de tu comida
          </button>

          {/* Las dos formas de registrar sin usar la cámara. La nota de voz no pide foto:
              basta con contarle a Fitra qué comiste. */}
          <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
            <button onClick={() => { setError(""); setCoachTip(""); fileRef.current?.click(); }} style={secondaryBtn(palette)}>
              <Images size={14} /> Subir foto
            </button>
            <button onClick={() => { setError(""); setCoachTip(""); setShowVoiceLog(true); }} style={secondaryBtn(palette)}>
              <Mic size={14} /> Nota de voz
            </button>
          </div>

          <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
            <button onClick={() => setShowSaved(true)} style={secondaryBtn(palette)}><Star size={14} /> Comidas guardadas {savedMeals.length > 0 && `(${savedMeals.length})`}</button>
          </div>
          <FirstTimeHint id="ask_fitra" text="Fitra te sugiere recetas con lo que tengas en la cocina — cuéntale por texto o mándale una foto de tus ingredientes." />
          <Link href="/app/nutrition/recipes" onClick={() => markHintSeen("ask_fitra")} style={{ ...secondaryBtn(palette), textDecoration: "none", marginBottom: 16, background: `${palette.accent}18`, borderColor: `${palette.accent}55` }}>
            <Sparkles size={14} color={palette.accent} /> Preguntarle a Fitra por recetas
          </Link>
        </>
      )}

      {remaining !== null && (
        <p style={{ textAlign: "center", fontSize: 11.5, color: palette.inkDim, marginBottom: 16 }}>
          <Sparkles size={11} style={{ verticalAlign: -1, marginRight: 3 }} /> {remaining} análisis gratis restantes hoy
        </p>
      )}

      {coachTip && (
        <div className="ft-pop" style={{ ...palette.glassPanel, padding: 14, marginBottom: 14, border: `1px solid ${palette.accent}55`, display: "flex", gap: 10 }}>
          <Sparkles size={16} color={palette.accent} style={{ flexShrink: 0, marginTop: 1 }} />
          <p style={{ fontSize: 12.5, lineHeight: 1.5 }}>{coachTip}</p>
        </div>
      )}

      {error && <p style={{ color: "#f87171", fontSize: 13, textAlign: "center", marginBottom: 16 }}>{error}</p>}

      <h2 style={{ fontSize: 13, fontWeight: 700, color: palette.accent, textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 10, marginTop: 24 }}>Registro de hoy</h2>

      {loading ? (
        <p style={{ color: palette.inkDim, fontSize: 13, textAlign: "center" }}>Cargando...</p>
      ) : logs.length === 0 ? (
        <p style={{ fontSize: 13, color: palette.inkDim, textAlign: "center", padding: 20 }}>Todavía no registraste nada hoy.</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {logs.map((l, idx) => {
            const isOpen = expandedId === l.id;
            return (
              <div key={l.id} className="ft-pop" style={{ ...palette.glassPanel, overflow: "hidden", animationDelay: `${idx * 0.04}s` }}>
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
                  <div style={{ position: "relative" }}>
                    <button
                      onClick={() => setMenuOpenId(menuOpenId === l.id ? null : l.id)}
                      aria-label="Opciones de la comida"
                      style={{ background: "none", border: "none", color: palette.inkDim, cursor: "pointer", padding: "0 12px" }}
                    >
                      <MoreVertical size={17} />
                    </button>

                    {menuOpenId === l.id && (
                      <>
                        <div onClick={() => setMenuOpenId(null)} style={{ position: "fixed", inset: 0, zIndex: 90 }} />
                        <div style={{
                          ...palette.modalPanel, borderRadius: 14, padding: 6,
                          position: "absolute", right: 8, top: "100%", marginTop: 4, zIndex: 100, width: 208,
                        }}>
                          <button onClick={() => { setMenuOpenId(null); toggleFavorite(l); }} style={logMenuItem(palette)}>
                            <Star size={14} fill={l.saved_meal_id ? palette.accent : "none"} color={l.saved_meal_id ? palette.accent : "currentColor"} />
                            {l.saved_meal_id ? "Quitar de favoritas" : "Guardar como favorita"}
                          </button>
                          <button onClick={() => { setMenuOpenId(null); setConfirmDeleteId(l.id); }} style={{ ...logMenuItem(palette), color: "#f87171" }}>
                            <Trash2 size={14} /> Eliminar registro
                          </button>
                        </div>
                      </>
                    )}
                  </div>
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
                    {l.note && (
                      <div style={{ marginTop: 12, paddingTop: 12, borderTop: `1px solid ${palette.panelBorder}` }}>
                        <div style={{ fontSize: 10.5, color: palette.accent, fontWeight: 700, textTransform: "uppercase", marginBottom: 4, display: "flex", alignItems: "center", gap: 4 }}>
                          <Sparkles size={10} /> Contexto que diste
                        </div>
                        <p style={{ fontSize: 12.5, color: palette.ink, lineHeight: 1.4 }}>{l.note}</p>
                      </div>
                    )}

                    <div style={{ marginTop: 14, paddingTop: 12, borderTop: `1px solid ${palette.panelBorder}` }}>
                      {fixingId === l.id ? (
                        <div>
                          <div style={{ fontSize: 11, color: palette.accent, fontWeight: 700, textTransform: "uppercase", marginBottom: 8, display: "flex", alignItems: "center", gap: 5 }}>
                            <Wand2 size={12} /> Ajustar con Fitra
                          </div>
                          <p style={{ fontSize: 11.5, color: palette.inkDim, lineHeight: 1.45, marginBottom: 8 }}>
                            Cuéntale qué faltó o qué quedó mal y vuelve a calcular sobre la misma foto.
                          </p>
                          <textarea
                            value={fixText} onChange={(e) => setFixText(e.target.value)}
                            placeholder="Ej: de eso solo comí la mitad, y el pollo iba apanado"
                            style={{ width: "100%", minHeight: 60, resize: "vertical", padding: "9px 11px", borderRadius: 10, border: `1px solid ${palette.panelBorder}`, background: palette.inputBg, color: palette.ink, fontSize: 12.5, fontFamily: "inherit", marginBottom: 8 }}
                          />
                          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                            <button onClick={toggleFixRecording} style={{
                              display: "flex", alignItems: "center", gap: 6, padding: "8px 12px", borderRadius: 10, cursor: "pointer",
                              border: `1px solid ${fixRecording ? "#f87171" : palette.panelBorder}`,
                              background: fixRecording ? "#f8717118" : palette.inputBg,
                              color: fixRecording ? "#f87171" : palette.ink, fontSize: 12, fontWeight: 600,
                            }}>
                              {fixRecording ? <><Square size={12} /> Detener</> : <><Mic size={13} /> Nota de voz</>}
                            </button>
                            {fixAudioBlob && !fixRecording && (
                              <span style={{ fontSize: 11.5, color: palette.accent, fontWeight: 600 }}>Audio listo ✓</span>
                            )}
                          </div>
                          {fixError && <p style={{ fontSize: 11.5, color: "#f87171", marginBottom: 8 }}>{fixError}</p>}
                          <div style={{ display: "flex", gap: 8 }}>
                            <button onClick={closeFix} style={{ flex: 1, padding: 10, borderRadius: 10, border: `1px solid ${palette.panelBorder}`, background: "none", color: palette.inkDim, fontSize: 12.5, cursor: "pointer" }}>
                              Cancelar
                            </button>
                            <button
                              onClick={() => submitFix(l.id)}
                              disabled={fixSubmitting || (!fixText.trim() && !fixAudioBlob)}
                              style={{
                                flex: 1, padding: 10, borderRadius: 10, border: "none", background: palette.accent, color: palette.bg,
                                fontSize: 12.5, fontWeight: 700, cursor: "pointer",
                                opacity: (fixSubmitting || (!fixText.trim() && !fixAudioBlob)) ? 0.5 : 1,
                              }}
                            >
                              {fixSubmitting ? "Ajustando..." : "Recalcular"}
                            </button>
                          </div>
                        </div>
                      ) : (
                        <button onClick={() => openFix(l.id)} style={{
                          display: "flex", alignItems: "center", justifyContent: "center", gap: 7, width: "100%", padding: 11, borderRadius: 11,
                          border: `1px solid ${palette.accent}55`, background: `${palette.accent}18`, color: palette.accent,
                          fontSize: 12.5, fontWeight: 700, cursor: "pointer",
                        }}>
                          <Wand2 size={14} /> Ajustar resultados
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {confirmDeleteId && (
        <Overlay onClose={() => setConfirmDeleteId(null)}>
          <div onClick={(e) => e.stopPropagation()} style={{ ...palette.modalPanel, padding: 22, width: "100%", maxWidth: 320 }}>
            <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 8 }}>¿Eliminar este registro?</h3>
            <p style={{ fontSize: 12.5, color: palette.inkDim, marginBottom: 18 }}>Se quita de tu día y de los totales. No se puede deshacer.</p>
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => setConfirmDeleteId(null)} style={{ flex: 1, padding: 11, borderRadius: 11, border: `1px solid ${palette.panelBorder}`, background: "none", color: palette.ink, cursor: "pointer", fontSize: 13 }}>
                Cancelar
              </button>
              <button onClick={() => { const id = confirmDeleteId; setConfirmDeleteId(null); deleteLog(id); }} style={{ flex: 1, padding: 11, borderRadius: 11, border: "none", background: "#f87171", color: "#fff", cursor: "pointer", fontSize: 13, fontWeight: 700 }}>
                Sí, eliminar
              </button>
            </div>
          </div>
        </Overlay>
      )}

      {showCamera && (
        <FitraCamera
          onCapture={handleCameraCapture}
          onClose={() => setShowCamera(false)}
          onPickFromGallery={() => fileRef.current?.click()}
        />
      )}

      {showSaved && <SavedMealsModal meals={savedMeals} onClose={() => setShowSaved(false)} onPick={quickLogSaved} />}

      {showVoiceLog && (
        <VoiceLogModal
          text={voiceText} onTextChange={setVoiceText}
          recording={voiceRecording} onToggleRecording={toggleVoiceRecording}
          hasAudio={!!voiceAudioBlob} submitting={voiceSubmitting} error={voiceError}
          onSubmit={submitVoiceLog} onClose={closeVoiceModal}
        />
      )}
    </div>
  );
}

function VoiceLogModal({
  text, onTextChange, recording, onToggleRecording, hasAudio, submitting, error, onSubmit, onClose,
}: {
  text: string; onTextChange: (v: string) => void; recording: boolean; onToggleRecording: () => void;
  hasAudio: boolean; submitting: boolean; error: string; onSubmit: () => void; onClose: () => void;
}) {
  const palette = usePalette();
  return (
    <Modal title="Cuéntale a Fitra qué comiste" onClose={onClose} maxWidth={400}>
      <p style={{ fontSize: 12, color: palette.inkDim, lineHeight: 1.5, marginBottom: 14 }}>
        Sin foto: grábale una nota de voz o escríbelo, y Fitra calcula las calorías y los macros.
      </p>
      <textarea
        value={text} onChange={(e) => onTextChange(e.target.value)}
        placeholder="Ej: me comí un plato de arroz con pollo, ensalada y un jugo de mora sin azúcar..."
        style={{ width: "100%", minHeight: 90, padding: 11, borderRadius: 11, border: `1px solid ${palette.panelBorder}`, background: palette.inputBg, color: palette.ink, fontSize: 13, marginBottom: 10, fontFamily: "inherit", resize: "vertical" }}
      />
      <button onClick={onToggleRecording} style={{ display: "flex", alignItems: "center", gap: 8, padding: "9px 14px", borderRadius: 10, border: `1px solid ${recording ? "#f87171" : palette.panelBorder}`, background: recording ? "#f8717122" : palette.inputBg, color: recording ? "#f87171" : palette.ink, fontSize: 12.5, cursor: "pointer", fontWeight: 600, marginBottom: 6 }}>
        {recording ? <><Square size={13} /> Detener grabación</> : <><Mic size={13} /> Grabar nota de voz</>}
      </button>
      {hasAudio && !recording && <p style={{ fontSize: 11.5, color: palette.accent, marginBottom: 14 }}>✓ Nota de voz lista</p>}

      {error && <p style={{ color: "#f87171", fontSize: 12.5, marginBottom: 10 }}>{error}</p>}

      <button onClick={onSubmit} disabled={submitting || (!text.trim() && !hasAudio)} style={{
        width: "100%", padding: 13, borderRadius: 12, border: "none",
        background: `linear-gradient(135deg, ${palette.accent}, ${palette.accentDeep})`, color: palette.bg,
        fontWeight: 700, fontSize: 14, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
        opacity: submitting || (!text.trim() && !hasAudio) ? 0.6 : 1,
      }}>
        {submitting ? <><Loader2 size={16} /> Fitra está calculando...</> : <><Sparkles size={16} /> Calcular calorías</>}
      </button>
    </Modal>
  );
}

function MacroRow({ label, value }: { label: string; value: string }) {
  const palette = usePalette();
  return (
    <div>
      <div style={{ fontSize: 10.5, color: palette.inkDim }}>{label}</div>
      <div style={{ fontWeight: 600 }}>{value}</div>
    </div>
  );
}

function logMenuItem(palette: Palette): React.CSSProperties {
  return {
    display: "flex", alignItems: "center", gap: 8, width: "100%", padding: "10px",
    borderRadius: 9, background: "none", border: "none", cursor: "pointer",
    fontSize: 12.5, fontWeight: 600, color: palette.ink, textAlign: "left",
  };
}
function waterBtn(palette: Palette): React.CSSProperties {
  return {
    width: 30, height: 30, borderRadius: 9, border: `1px solid ${palette.panelBorder}`,
    background: palette.inputBg, color: palette.ink, fontSize: 16, fontWeight: 700, cursor: "pointer",
  };
}
function secondaryBtn(palette: Palette): React.CSSProperties {
  return {
    flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "10px",
    borderRadius: 12, border: `1px solid ${palette.panelBorder}`, background: palette.inputBg, color: palette.ink,
    fontSize: 12.5, fontWeight: 600, cursor: "pointer",
  };
}

function SavedMealsModal({ meals, onClose, onPick }: { meals: any[]; onClose: () => void; onPick: (m: any) => void }) {
  const palette = usePalette();
  return (
    <Modal title="Comidas guardadas" onClose={onClose}>
      {meals.length === 0 ? (
        <p style={{ color: palette.inkDim, fontSize: 13, textAlign: "center", padding: 20 }}>
          Todavía no guardaste ninguna comida. Toca la estrella ⭐ en cualquier registro para guardarla.
        </p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {meals.map((m) => (
            <button key={m.id} onClick={() => onPick(m)} style={{ ...palette.glassPanel, padding: 12, display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer", border: "none", textAlign: "left", width: "100%" }}>
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
