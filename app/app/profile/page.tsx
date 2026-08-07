"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { palette, glassPanel } from "@/lib/theme";
import { Sun, Moon, Play, Camera, LogOut } from "lucide-react";
import { useRouter } from "next/navigation";

const SOUNDS: Record<string, { label: string; freq: number; pattern: number[] }> = {
  clasico: { label: "Clásico", freq: 880, pattern: [0.35] },
  suave: { label: "Suave", freq: 660, pattern: [0.5] },
  energico: { label: "Enérgico", freq: 990, pattern: [0.12, 0.12, 0.12] },
};

export default function ProfilePage() {
  const supabase = createClient();
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const audioRef = useRef<AudioContext | null>(null);

  const [email, setEmail] = useState("");
  const [theme, setTheme] = useState<"light" | "dark">("dark");
  const [timerSound, setTimerSound] = useState("clasico");
  const [streak, setStreak] = useState(0);
  const [photos, setPhotos] = useState<any[]>([]);
  const [compareA, setCompareA] = useState<string | null>(null);
  const [compareB, setCompareB] = useState<string | null>(null);
  const [sliderPos, setSliderPos] = useState(50);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [history, setHistory] = useState<any[]>([]);

  useEffect(() => {
    (async () => {
      const { data: auth } = await supabase.auth.getUser();
      setEmail(auth.user!.email ?? "");

      const { data: userRow } = await supabase.from("users").select("theme_pref, timer_sound").eq("id", auth.user!.id).single();
      if (userRow) { setTheme(userRow.theme_pref); setTimerSound(userRow.timer_sound); }

      const { data: streakRow } = await supabase.from("streaks").select("current_weeks").eq("client_id", auth.user!.id).single();
      setStreak(streakRow?.current_weeks ?? 0);

      const { data: photoRows } = await supabase.from("progress_photos").select("*").eq("client_id", auth.user!.id).order("date", { ascending: false });
      setPhotos(photoRows ?? []);
      if (photoRows && photoRows.length >= 2) {
        setCompareA(photoRows[photoRows.length - 1].photo_url);
        setCompareB(photoRows[0].photo_url);
      }

      const { data: workoutRows } = await supabase.from("workout_logs").select("id, date, duration_sec, total_volume, routines(name)").eq("client_id", auth.user!.id).order("date", { ascending: false }).limit(20);
      const { data: nutritionRows } = await supabase.from("nutrition_logs").select("id, date, food_name, kcal").eq("client_id", auth.user!.id).order("date", { ascending: false }).limit(20);

      const combined = [
        ...(workoutRows ?? []).map((w: any) => ({ type: "workout", date: w.date, title: w.routines?.name || "Entrenamiento", detail: `${Math.round((w.total_volume ?? 0)).toLocaleString()} kg · ${Math.round((w.duration_sec ?? 0) / 60)} min` })),
        ...(nutritionRows ?? []).map((n: any) => ({ type: "nutrition", date: n.date, title: n.food_name || "Comida registrada", detail: `${Math.round(n.kcal ?? 0)} kcal` })),
      ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 25);

      setHistory(combined);
    })();
  }, []);

  async function updateTheme(t: "light" | "dark") {
    setTheme(t);
    setSaving(true);
    const { data: auth } = await supabase.auth.getUser();
    await supabase.from("users").update({ theme_pref: t }).eq("id", auth.user!.id);
    setSaving(false);
  }

  async function updateSound(key: string) {
    setTimerSound(key);
    const { data: auth } = await supabase.auth.getUser();
    await supabase.from("users").update({ timer_sound: key }).eq("id", auth.user!.id);
  }

  function playPreview(key: string) {
    const s = SOUNDS[key];
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

  async function handleUploadPhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const { data: auth } = await supabase.auth.getUser();
    const path = `${auth.user!.id}/${Date.now()}.jpg`;
    await supabase.storage.from("food-photos").upload(path, file, { contentType: file.type });
    const { data: pub } = supabase.storage.from("food-photos").getPublicUrl(path);

    const { data: newPhoto } = await supabase.from("progress_photos").insert({ client_id: auth.user!.id, photo_url: pub.publicUrl }).select().single();
    setPhotos((prev) => [newPhoto, ...prev]);
    setUploading(false);
    if (fileRef.current) fileRef.current.value = "";
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/login");
  }

  return (
    <div>
      <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 4 }}>Perfil</h1>
      <p style={{ color: palette.inkDim, fontSize: 14, marginBottom: 20 }}>{email}</p>

      <div style={{ ...glassPanel, padding: 16, display: "flex", alignItems: "center", gap: 14, marginBottom: 20 }}>
        <div style={{ fontSize: 24, fontWeight: 700 }}>{streak}</div>
        <div style={{ fontSize: 12, color: palette.inkDim }}>semanas de racha activa</div>
      </div>

      <Section title="Tema">
        <div style={{ display: "flex", gap: 10 }}>
          <ThemeBtn active={theme === "dark"} icon={<Moon size={15} />} label="Oscuro" onClick={() => updateTheme("dark")} />
          <ThemeBtn active={theme === "light"} icon={<Sun size={15} />} label="Claro" onClick={() => updateTheme("light")} />
        </div>
        {saving && <p style={{ fontSize: 11, color: palette.inkDim, marginTop: 8 }}>Guardando...</p>}
      </Section>

      <Section title="Sonido del timer de descanso">
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
      </Section>

      <Section title="Fotos de progreso">
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
            <input
              type="range" min={0} max={100} value={sliderPos}
              onChange={(e) => setSliderPos(+e.target.value)}
              style={{ position: "absolute", inset: 0, width: "100%", height: "100%", opacity: 0, cursor: "ew-resize" }}
            />
            <span style={{ position: "absolute", top: 8, left: 8, fontSize: 10, background: "rgba(0,0,0,0.5)", padding: "3px 8px", borderRadius: 999, color: "#fff" }}>Antes</span>
            <span style={{ position: "absolute", top: 8, right: 8, fontSize: 10, background: "rgba(0,0,0,0.5)", padding: "3px 8px", borderRadius: 999, color: "#fff" }}>Ahora</span>
          </div>
        )}

        {photos.length === 0 ? (
          <p style={{ fontSize: 12.5, color: palette.inkDim, textAlign: "center", padding: 12 }}>Todavía no subiste fotos de progreso.</p>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 6 }}>
            {photos.map((p) => (
              <img key={p.id} src={p.photo_url} alt="" style={{ width: "100%", aspectRatio: "1", objectFit: "cover", borderRadius: 8 }} />
            ))}
          </div>
        )}
      </Section>

      <Section title="Historial reciente">
        {history.length === 0 ? (
          <p style={{ fontSize: 12.5, color: palette.inkDim, textAlign: "center", padding: 12 }}>Todavía no tienes registros.</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {history.map((h, i) => (
              <div key={i} style={{ ...glassPanel, padding: 12, display: "flex", alignItems: "center", gap: 10 }}>
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
              </div>
            ))}
          </div>
        )}
      </Section>

      <button onClick={handleLogout} style={{
        display: "flex", alignItems: "center", justifyContent: "center", gap: 8, width: "100%", padding: 13, borderRadius: 12,
        border: `1px solid ${palette.panelBorder}`, background: "none", color: "#f87171", fontSize: 13.5, fontWeight: 600, cursor: "pointer", marginTop: 10,
      }}>
        <LogOut size={15} /> Cerrar sesión
      </button>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 24 }}>
      <h2 style={{ fontSize: 13, fontWeight: 700, color: palette.accent, textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 10 }}>{title}</h2>
      {children}
    </div>
  );
}

function ThemeBtn({ active, icon, label, onClick }: { active: boolean; icon: React.ReactNode; label: string; onClick: () => void }) {
  return (
    <button onClick={onClick} style={{
      display: "flex", alignItems: "center", gap: 8, padding: "10px 16px", borderRadius: 10,
      border: `1px solid ${active ? palette.accent : palette.panelBorder}`,
      background: active ? `${palette.accent}22` : palette.inputBg,
      color: active ? palette.accent : palette.inkDim, cursor: "pointer", fontSize: 13.5, fontWeight: 600,
    }}>
      {icon} {label}
    </button>
  );
}
