"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { palette, glassPanel, cleanGroup, groupTitle } from "@/lib/theme";
import SettingsGroup from "@/components/SettingsGroup";
import ListRow from "@/components/ListRow";
import Modal from "@/components/Modal";
import { Sun, Moon, Play, Camera, LogOut, Trophy, Dumbbell, Flame, Award, Bell, ChevronRight } from "lucide-react";
import { useRouter } from "next/navigation";

const SOUNDS: Record<string, { label: string; freq: number; pattern: number[] }> = {
  clasico: { label: "Clásico", freq: 880, pattern: [0.35] },
  suave: { label: "Suave", freq: 660, pattern: [0.5] },
  energico: { label: "Enérgico", freq: 990, pattern: [0.12, 0.12, 0.12] },
  campana: { label: "Campana", freq: 1046, pattern: [0.5] },
  digital: { label: "Digital", freq: 1400, pattern: [0.08, 0.08, 0.08, 0.08] },
};

const EQUIPMENT_OPTIONS = ["Horno", "Microondas", "Estufa", "Air fryer", "Licuadora", "Plancha/Parrilla"];
const DOW_LABELS = ["D", "L", "M", "M", "J", "V", "S"];

function computeBadges(streak: number, totalWorkouts: number, totalPRs: number) {
  const badges: { emoji: string; label: string }[] = [];
  if (streak >= 1) badges.push({ emoji: "🔥", label: "Racha activa" });
  if (streak >= 4) badges.push({ emoji: "🗓️", label: "Un mes constante" });
  if (totalWorkouts >= 1) badges.push({ emoji: "🏋️", label: "Primer entreno" });
  if (totalWorkouts >= 10) badges.push({ emoji: "💪", label: "10 entrenos" });
  if (totalWorkouts >= 50) badges.push({ emoji: "⚡", label: "50 entrenos" });
  if (totalPRs >= 1) badges.push({ emoji: "🏆", label: "Primer PR" });
  if (totalPRs >= 5) badges.push({ emoji: "👑", label: "5 récords" });
  return badges;
}

export default function ProfilePage() {
  const supabase = createClient();
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const avatarRef = useRef<HTMLInputElement>(null);
  const audioRef = useRef<AudioContext | null>(null);

  const [uid, setUid] = useState("");
  const [email, setEmail] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [theme, setTheme] = useState<"light" | "dark">("dark");
  const [timerSound, setTimerSound] = useState("clasico");
  const [notifEnabled, setNotifEnabled] = useState(true);
  const [dietaryRestrictions, setDietaryRestrictions] = useState("");
  const [kitchenEquipment, setKitchenEquipment] = useState<string[]>([]);
  const [currentWeight, setCurrentWeight] = useState("");
  const [streak, setStreak] = useState(0);
  const [photos, setPhotos] = useState<any[]>([]);
  const [compareA, setCompareA] = useState<string | null>(null);
  const [compareB, setCompareB] = useState<string | null>(null);
  const [sliderPos, setSliderPos] = useState(50);
  const [uploading, setUploading] = useState(false);
  const [history, setHistory] = useState<any[]>([]);
  const [selectedHistory, setSelectedHistory] = useState<any | null>(null);
  const [stats, setStats] = useState({ totalWorkouts: 0, totalVolume: 0, totalPRs: 0 });
  const [activeDays, setActiveDays] = useState<boolean[]>(Array(7).fill(false));
  const [topPRs, setTopPRs] = useState<any[]>([]);
  const [showSoundPicker, setShowSoundPicker] = useState(false);
  const [showNameEdit, setShowNameEdit] = useState(false);
  const [showWeightEdit, setShowWeightEdit] = useState(false);
  const [showDietEdit, setShowDietEdit] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: auth } = await supabase.auth.getUser();
      const id = auth.user!.id;
      setUid(id);
      setEmail(auth.user!.email ?? "");

      const { data: userRow } = await supabase.from("users").select("theme_pref, timer_sound, display_name, avatar_url").eq("id", id).single();
      if (userRow) {
        setTheme(userRow.theme_pref); setTimerSound(userRow.timer_sound);
        setDisplayName(userRow.display_name || ""); setAvatarUrl(userRow.avatar_url || "");
      }

      const { data: clientRow } = await supabase.from("clients").select("dietary_restrictions, kitchen_equipment, current_weight").eq("user_id", id).single();
      if (clientRow) {
        setDietaryRestrictions(clientRow.dietary_restrictions || "");
        setKitchenEquipment(clientRow.kitchen_equipment || []);
        setCurrentWeight(clientRow.current_weight ? String(clientRow.current_weight) : "");
      }

      const { data: streakRow } = await supabase.from("streaks").select("current_weeks").eq("client_id", id).single();
      setStreak(streakRow?.current_weeks ?? 0);

      const { data: photoRows } = await supabase.from("progress_photos").select("*").eq("client_id", id).order("date", { ascending: false });
      setPhotos(photoRows ?? []);
      if (photoRows && photoRows.length >= 2) {
        setCompareA(photoRows[photoRows.length - 1].photo_url);
        setCompareB(photoRows[0].photo_url);
      }

      const { data: workoutRows, count: workoutCount } = await supabase.from("workout_logs").select("id, date, duration_sec, total_volume, routines(name)", { count: "exact" }).eq("client_id", id).order("date", { ascending: false }).limit(20);
      const { data: allVolumeRows } = await supabase.from("workout_logs").select("total_volume, date").eq("client_id", id);
      const { data: nutritionRows } = await supabase.from("nutrition_logs").select("id, date, food_name, kcal, protein, carbs, fat").eq("client_id", id).order("date", { ascending: false }).limit(20);
      const { data: prRows, count: prCount } = await supabase.from("personal_records").select("id, value, date, exercises(name)", { count: "exact" }).eq("client_id", id).order("date", { ascending: false }).limit(5);

      const totalVolume = (allVolumeRows ?? []).reduce((sum, w) => sum + (w.total_volume ?? 0), 0);
      setStats({ totalWorkouts: workoutCount ?? 0, totalVolume, totalPRs: prCount ?? 0 });
      setTopPRs(prRows ?? []);

      const todayDow = new Date().getDay();
      const days = Array(7).fill(false);
      (allVolumeRows ?? []).forEach((w: any) => {
        const diffDays = Math.floor((Date.now() - new Date(w.date).getTime()) / 86400000);
        if (diffDays >= 0 && diffDays < 7) days[(todayDow - diffDays + 7) % 7] = true;
      });
      setActiveDays(days);

      const combined = [
        ...(workoutRows ?? []).map((w: any) => ({ type: "workout", date: w.date, title: w.routines?.name || "Entrenamiento", detail: `${Math.round((w.total_volume ?? 0)).toLocaleString()} kg · ${Math.round((w.duration_sec ?? 0) / 60)} min` })),
        ...(nutritionRows ?? []).map((n: any) => ({ type: "nutrition", date: n.date, title: n.food_name || "Comida registrada", detail: `${Math.round(n.kcal ?? 0)} kcal · P: ${Math.round(n.protein ?? 0)}g` })),
      ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 4);
      setHistory(combined);
    })();
  }, []);

  async function updateTheme(t: "light" | "dark") {
    setTheme(t);
    await supabase.from("users").update({ theme_pref: t }).eq("id", uid);
  }

  async function updateSound(key: string) {
    setTimerSound(key);
    await supabase.from("users").update({ timer_sound: key }).eq("id", uid);
    setShowSoundPicker(false);
  }

  function playPreview(key: string) {
    const s = SOUNDS[key];
    try {
      const ctx = audioRef.current ?? new (window.AudioContext || (window as any).webkitAudioContext)();
      audioRef.current = ctx;
      let t = ctx.currentTime;
      s.pattern.forEach((dur) => {
        const osc = ctx.createOscillator(); const gain = ctx.createGain();
        osc.frequency.value = s.freq; osc.connect(gain); gain.connect(ctx.destination);
        gain.gain.setValueAtTime(0.15, t); osc.start(t); osc.stop(t + dur); t += dur + 0.08;
      });
    } catch {}
  }

  async function toggleNotifications() {
    const next = !notifEnabled;
    setNotifEnabled(next);
    if (next && "Notification" in window) await Notification.requestPermission();
  }

  async function saveDisplayName(name: string) {
    setDisplayName(name);
    await supabase.from("users").update({ display_name: name }).eq("id", uid);
    setShowNameEdit(false);
  }

  async function saveWeight(w: string) {
    setCurrentWeight(w);
    await supabase.from("clients").update({ current_weight: +w || null }).eq("user_id", uid);
    setShowWeightEdit(false);
  }

  async function saveDietaryInfo() {
    await supabase.from("clients").update({ dietary_restrictions: dietaryRestrictions, kitchen_equipment: kitchenEquipment }).eq("user_id", uid);
    setShowDietEdit(false);
  }

  function toggleEquipment(item: string) {
    setKitchenEquipment((prev) => prev.includes(item) ? prev.filter((e) => e !== item) : [...prev, item]);
  }

  async function handleUploadPhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const path = `${uid}/${Date.now()}.jpg`;
    await supabase.storage.from("food-photos").upload(path, file, { contentType: file.type });
    const { data: pub } = supabase.storage.from("food-photos").getPublicUrl(path);
    const { data: newPhoto } = await supabase.from("progress_photos").insert({ client_id: uid, photo_url: pub.publicUrl }).select().single();
    setPhotos((prev) => [newPhoto, ...prev]);
    setUploading(false);
    if (fileRef.current) fileRef.current.value = "";
  }

  async function handleUploadAvatar(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const path = `${uid}/avatar-${Date.now()}.jpg`;
    await supabase.storage.from("food-photos").upload(path, file, { contentType: file.type });
    const { data: pub } = supabase.storage.from("food-photos").getPublicUrl(path);
    await supabase.from("users").update({ avatar_url: pub.publicUrl }).eq("id", uid);
    setAvatarUrl(pub.publicUrl);
    if (avatarRef.current) avatarRef.current.value = "";
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/login");
  }

  async function handleDeleteAccount() {
    setDeleting(true);
    const res = await fetch("/api/account/delete", { method: "POST" });
    if (res.ok) router.push("/login");
    else setDeleting(false);
  }

  const badges = computeBadges(streak, stats.totalWorkouts, stats.totalPRs);

  return (
    <div>
      <style>{`
        @keyframes ftProfileIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: none; } }
        .ft-profile-in { animation: ftProfileIn .4s cubic-bezier(.16,.8,.24,1) both; }
      `}</style>

      {/* header */}
      <div className="ft-profile-in" style={{
        ...glassPanel, padding: 20, marginBottom: 16, position: "relative", overflow: "hidden",
        border: "1px solid transparent", backgroundImage: `linear-gradient(${palette.panel}, ${palette.panel}), ${palette.metallicBorder}`,
        backgroundOrigin: "border-box", backgroundClip: "padding-box, border-box",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
          <button onClick={() => avatarRef.current?.click()} style={{
            width: 46, height: 46, borderRadius: "50%", background: avatarUrl ? `url(${avatarUrl}) center/cover` : `${palette.accent}22`,
            display: "flex", alignItems: "center", justifyContent: "center", fontSize: 17, fontWeight: 700, color: palette.accent,
            flexShrink: 0, border: "none", cursor: "pointer", overflow: "hidden",
          }}>
            {!avatarUrl && (displayName[0]?.toUpperCase() || email[0]?.toUpperCase())}
          </button>
          <input ref={avatarRef} type="file" accept="image/*" onChange={handleUploadAvatar} style={{ display: "none" }} />
          <div style={{ flex: 1, overflow: "hidden" }}>
            <div style={{ fontSize: 14, fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{displayName || email}</div>
            <div style={{ display: "flex", alignItems: "center", gap: 5, marginTop: 2 }}>
              <Flame size={12} color={palette.accent} />
              <span style={{ fontSize: 11.5, color: palette.inkDim }}>{streak} semanas de racha</span>
            </div>
          </div>
        </div>

        {badges.length > 0 && (
          <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 2 }}>
            {badges.map((b, i) => (
              <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 3, flexShrink: 0, minWidth: 56 }}>
                <div style={{ width: 40, height: 40, borderRadius: 12, background: palette.inputBg, border: `1px solid ${palette.panelBorder}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 17 }}>
                  {b.emoji}
                </div>
                <span style={{ fontSize: 8.5, color: palette.inkDim, textAlign: "center", lineHeight: 1.2 }}>{b.label}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* stats totales */}
      <div className="ft-profile-in" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8, marginBottom: 16, animationDelay: "0.05s" }}>
        <StatBox icon={<Dumbbell size={14} />} value={stats.totalWorkouts} label="Entrenos" />
        <StatBox icon={<Award size={14} />} value={`${Math.round(stats.totalVolume / 1000)}t`} label="Volumen total" />
        <StatBox icon={<Trophy size={14} />} value={stats.totalPRs} label="Récords" />
      </div>

      {/* actividad semanal */}
      <div className="ft-profile-in" style={{ ...glassPanel, padding: 16, marginBottom: 16, animationDelay: "0.1s" }}>
        <div style={{ fontSize: 11, color: palette.inkDim, marginBottom: 10 }}>Actividad de la semana</div>
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          {DOW_LABELS.map((label, i) => (
            <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 5 }}>
              <div style={{
                width: 26, height: 26, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center",
                background: activeDays[i] ? palette.accent : palette.inputBg, border: `1px solid ${activeDays[i] ? palette.accent : palette.panelBorder}`,
              }}>
                {activeDays[i] && <Flame size={12} color="#0A0C10" />}
              </div>
              <span style={{ fontSize: 9.5, color: palette.inkDim }}>{label}</span>
            </div>
          ))}
        </div>
      </div>

      {topPRs.length > 0 && (
        <div style={{ marginBottom: 6 }}>
          <div style={groupTitle}>Récords recientes</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 22 }}>
            {topPRs.map((pr) => (
              <div key={pr.id} style={{ ...glassPanel, padding: 12, display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ width: 30, height: 30, borderRadius: 9, background: `${palette.accent}22`, display: "flex", alignItems: "center", justifyContent: "center", color: palette.accent, flexShrink: 0 }}>
                  <Trophy size={14} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>{pr.exercises?.name}</div>
                  <div style={{ fontSize: 10.5, color: palette.inkDim }}>{pr.value} kg · {new Date(pr.date).toLocaleDateString("es-CO", { day: "numeric", month: "short" })}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Apariencia ── */}
      <SettingsGroup title="Apariencia">
        <ListRow label="Oscuro" right={theme === "dark" && <span style={{ color: palette.accent }}>✓</span>} onClick={() => updateTheme("dark")} />
        <ListRow label="Claro" right={theme === "light" && <span style={{ color: palette.accent }}>✓</span>} onClick={() => updateTheme("light")} />
      </SettingsGroup>

      {/* ── Entrenamiento ── */}
      <SettingsGroup title="Entrenamiento">
        <ListRow label="Sonido del timer" sublabel={SOUNDS[timerSound]?.label} showChevron onClick={() => setShowSoundPicker(true)} />
      </SettingsGroup>

      {/* ── Notificaciones ── */}
      <SettingsGroup title="Notificaciones">
        <ListRow
          label="Notificaciones push"
          sublabel="Recordatorios, timer de descanso, mensajes de tu coach"
          right={<Toggle checked={notifEnabled} onChange={toggleNotifications} />}
        />
      </SettingsGroup>

      {/* ── Nutrición ── */}
      <SettingsGroup title="Nutrición">
        <ListRow
          label="Restricciones alimentarias"
          sublabel={dietaryRestrictions || "Ninguna configurada"}
          showChevron
          onClick={() => setShowDietEdit(true)}
        />
        <ListRow
          label="Utensilios de cocina"
          sublabel={kitchenEquipment.length > 0 ? kitchenEquipment.join(", ") : "Ninguno configurado"}
          showChevron
          onClick={() => setShowDietEdit(true)}
        />
      </SettingsGroup>

      {/* ── Cuenta ── */}
      <SettingsGroup title="Cuenta">
        <ListRow label="Nombre" sublabel={displayName || "Sin definir"} showChevron onClick={() => setShowNameEdit(true)} />
        <ListRow label="Correo" sublabel={email} />
        <ListRow label="Peso actual" sublabel={currentWeight ? `${currentWeight} kg` : "Sin registrar"} showChevron onClick={() => setShowWeightEdit(true)} />
        <ListRow label="Cerrar sesión" onClick={handleLogout} />
        <ListRow label="Eliminar cuenta" danger onClick={() => setShowDeleteConfirm(true)} />
      </SettingsGroup>

      {/* ── Fotos de progreso ── */}
      <div style={groupTitle}>Fotos de progreso</div>
      <div style={{ marginBottom: 22 }}>
        <input ref={fileRef} type="file" accept="image/*" onChange={handleUploadPhoto} style={{ display: "none" }} />
        <button onClick={() => fileRef.current?.click()} disabled={uploading} style={{
          display: "flex", alignItems: "center", justifyContent: "center", gap: 8, width: "100%", padding: 12, borderRadius: 12,
          border: `1px solid ${palette.panelBorder}`, background: palette.inputBg, color: palette.ink, fontSize: 13, fontWeight: 600, cursor: "pointer", marginBottom: 14,
        }}>
          <Camera size={15} /> {uploading ? "Subiendo..." : "Agregar foto"}
        </button>

        {compareA && compareB && (
          <div style={{ position: "relative", borderRadius: 14, overflow: "hidden", marginBottom: 14, aspectRatio: "3/4", background: palette.inputBg }}>
            <img src={compareB} alt="después" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} />
            <div style={{ position: "absolute", inset: 0, width: `${sliderPos}%`, overflow: "hidden" }}>
              <img src={compareA} alt="antes" style={{ width: `${100 / (sliderPos / 100)}%`, maxWidth: "none", height: "100%", objectFit: "cover" }} />
            </div>
            <div style={{ position: "absolute", top: 0, bottom: 0, left: `${sliderPos}%`, width: 2, background: palette.accent }} />
            <input type="range" min={0} max={100} value={sliderPos} onChange={(e) => setSliderPos(+e.target.value)}
              style={{ position: "absolute", inset: 0, width: "100%", height: "100%", opacity: 0, cursor: "ew-resize" }} />
            <span style={{ position: "absolute", top: 8, left: 8, fontSize: 10, background: "rgba(0,0,0,0.5)", padding: "3px 8px", borderRadius: 999, color: "#fff" }}>Antes</span>
            <span style={{ position: "absolute", top: 8, right: 8, fontSize: 10, background: "rgba(0,0,0,0.5)", padding: "3px 8px", borderRadius: 999, color: "#fff" }}>Ahora</span>
          </div>
        )}

        {photos.length === 0 ? (
          <p style={{ fontSize: 12.5, color: palette.inkDim, textAlign: "center", padding: 12 }}>Todavía no subiste fotos de progreso.</p>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 6 }}>
            {photos.map((p) => <img key={p.id} src={p.photo_url} alt="" style={{ width: "100%", aspectRatio: "1", objectFit: "cover", borderRadius: 8 }} />)}
          </div>
        )}
      </div>

      {/* ── Historial (últimos 4) ── */}
      <div style={groupTitle}>Historial reciente</div>
      {history.length === 0 ? (
        <p style={{ fontSize: 12.5, color: palette.inkDim, textAlign: "center", padding: 12 }}>Todavía no tienes registros.</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 10 }}>
          {history.map((h, i) => (
            <button key={i} onClick={() => setSelectedHistory(h)} style={{ ...glassPanel, padding: 12, display: "flex", alignItems: "center", gap: 10, border: "none", width: "100%", textAlign: "left", cursor: "pointer" }}>
              <div style={{
                width: 30, height: 30, borderRadius: 9, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center",
                background: h.type === "workout" ? `${palette.accent}22` : "#7DC4E822", color: h.type === "workout" ? palette.accent : "#7DC4E8", fontSize: 13,
              }}>
                {h.type === "workout" ? "💪" : "🍽️"}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 600 }}>{h.title}</div>
                <div style={{ fontSize: 10.5, color: palette.inkDim }}>{h.detail} · {new Date(h.date).toLocaleDateString("es-CO", { day: "numeric", month: "short" })}</div>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* modales */}
      {showSoundPicker && (
        <Modal title="Sonido del timer" onClose={() => setShowSoundPicker(false)} maxWidth={340}>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {Object.entries(SOUNDS).map(([key, s]) => (
              <div key={key} style={{
                display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 12px",
                borderRadius: 10, border: `1px solid ${timerSound === key ? palette.accent : palette.panelBorder}`,
                background: timerSound === key ? `${palette.accent}18` : palette.inputBg,
              }}>
                <button onClick={() => updateSound(key)} style={{ background: "none", border: "none", color: palette.ink, fontSize: 13, fontWeight: 600, cursor: "pointer", textAlign: "left", flex: 1 }}>
                  {s.label} {timerSound === key && "✓"}
                </button>
                <button onClick={() => playPreview(key)} style={{ background: "none", border: "none", color: palette.accent, cursor: "pointer", display: "flex" }}>
                  <Play size={15} />
                </button>
              </div>
            ))}
          </div>
        </Modal>
      )}

      {showNameEdit && (
        <Modal title="Tu nombre" onClose={() => setShowNameEdit(false)} maxWidth={320}>
          <NameEditor initial={displayName} onSave={saveDisplayName} />
        </Modal>
      )}

      {showWeightEdit && (
        
