"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { usePalette, type Palette } from "@/lib/theme";
import { getDisplayStreak } from "@/lib/streak";
import { getWeightComparison } from "@/lib/weightComparisons";
import { toPng } from "html-to-image";
import Link from "next/link";
import { Settings, Camera, Trophy, Dumbbell, Award, Flame, Share2 } from "lucide-react";
import Modal from "@/components/Modal";

function computeBadges(streak: number, totalWorkouts: number, totalPRs: number) {
  const badges: { emoji: string; label: string }[] = [];
  if (streak >= 1) badges.push({ emoji: "🔥", label: "Racha activa" });
  if (streak >= 4) badges.push({ emoji: "📅", label: "Un mes constante" });
  if (totalWorkouts >= 1) badges.push({ emoji: "🏆", label: "Primer entreno" });
  if (totalWorkouts >= 10) badges.push({ emoji: "💪", label: "10 entrenos" });
  if (totalWorkouts >= 50) badges.push({ emoji: "⚡", label: "50 entrenos" });
  if (totalPRs >= 1) badges.push({ emoji: "🥇", label: "Primer PR" });
  if (totalPRs >= 5) badges.push({ emoji: "👑", label: "5 récords" });
  return badges;
}

const DOW_LABELS = ["D", "L", "M", "M", "J", "V", "S"];

export default function ProfilePage() {
  const palette = usePalette();
  const supabase = createClient();
  const avatarRef = useRef<HTMLInputElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const [uid, setUid] = useState("");
  const [email, setEmail] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
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
  const [selectedPR, setSelectedPR] = useState<any | null>(null);
  const [showVolumeDetail, setShowVolumeDetail] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: auth } = await supabase.auth.getUser();
      const id = auth.user!.id;
      setUid(id);
      setEmail(auth.user!.email ?? "");

      const { data: userRow } = await supabase.from("users").select("display_name, avatar_url").eq("id", id).single();
      if (userRow) { setDisplayName(userRow.display_name || ""); setAvatarUrl(userRow.avatar_url || ""); }

      const { data: streakRow } = await supabase.from("streaks").select("current_weeks, last_workout_date").eq("client_id", id).single();
      setStreak(getDisplayStreak(streakRow?.current_weeks ?? 0, streakRow?.last_workout_date ?? null));

      const { data: photoRows } = await supabase.from("progress_photos").select("*").eq("client_id", id).order("date", { ascending: false });
      setPhotos(photoRows ?? []);
      if (photoRows && photoRows.length >= 2) {
        setCompareA(photoRows[photoRows.length - 1].photo_url);
        setCompareB(photoRows[0].photo_url);
      }

      const { data: workoutRows, count: workoutCount } = await supabase.from("workout_logs").select("id, date, duration_sec, total_volume, routines(name)", { count: "exact" }).eq("client_id", id).order("date", { ascending: false }).limit(20);
      const { data: allVolumeRows } = await supabase.from("workout_logs").select("total_volume, date").eq("client_id", id);
      const { data: nutritionRows } = await supabase.from("nutrition_logs").select("id, date, food_name, kcal").eq("client_id", id).order("date", { ascending: false }).limit(20);
      const { data: prRows, count: prCount } = await supabase.from("personal_records").select("id, value, date, workout_log_id, exercises(name)", { count: "exact" }).eq("client_id", id).order("date", { ascending: false }).limit(5);

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
        ...(workoutRows ?? []).map((w: any) => ({ type: "workout", id: w.id, date: w.date, title: w.routines?.name || "Entrenamiento", detail: `${Math.round((w.total_volume ?? 0)).toLocaleString()} kg · ${Math.round((w.duration_sec ?? 0) / 60)} min` })),
        ...(nutritionRows ?? []).map((n: any) => ({ type: "nutrition", id: n.id, date: n.date, title: n.food_name || "Comida registrada", detail: `${Math.round(n.kcal ?? 0)} kcal` })),
      ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 4);
      setHistory(combined);
    })();
  }, []);

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

  const badges = computeBadges(streak, stats.totalWorkouts, stats.totalPRs);

  return (
    <div>
      <style>{`
        @keyframes ftProfileIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: none; } }
        .ft-profile-in { animation: ftProfileIn .4s cubic-bezier(.16,.8,.24,1) both; }
      `}</style>

      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 10 }}>
        <Link href="/app/profile/settings" style={{ color: palette.inkDim, padding: 6, display: "flex" }}>
          <Settings size={19} />
        </Link>
      </div>

      <div className="ft-profile-in" style={{
        ...palette.glassPanel, padding: 20, marginBottom: 16, position: "relative", overflow: "hidden",
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

      <div className="ft-profile-in" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8, marginBottom: 16, animationDelay: "0.05s" }}>
        <StatBox icon={<Dumbbell size={14} />} value={stats.totalWorkouts} label="Entrenos" />
        <StatBox icon={<Award size={14} />} value={`${Math.round(stats.totalVolume / 1000)}t`} label="Volumen total" onClick={() => setShowVolumeDetail(true)} />
        <StatBox icon={<Trophy size={14} />} value={stats.totalPRs} label="Récords" />
      </div>

      <div className="ft-profile-in" style={{ ...palette.glassPanel, padding: 16, marginBottom: 16, animationDelay: "0.1s" }}>
        <div style={{ fontSize: 11, color: palette.inkDim, marginBottom: 10 }}>Actividad de la semana</div>
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          {DOW_LABELS.map((label, i) => (
            <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 5 }}>
              <div style={{
                width: 26, height: 26, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center",
                background: activeDays[i] ? palette.accent : palette.inputBg, border: `1px solid ${activeDays[i] ? palette.accent : palette.panelBorder}`,
              }}>
                {activeDays[i] && <Flame size={12} color={palette.bg} />}
              </div>
              <span style={{ fontSize: 9.5, color: palette.inkDim }}>{label}</span>
            </div>
          ))}
        </div>
      </div>

      {topPRs.length > 0 && (
        <div style={{ marginBottom: 22 }}>
          <div style={sectionLabelStyle(palette)}>Récords recientes</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {topPRs.map((pr) => (
              <button key={pr.id} onClick={() => setSelectedPR(pr)} style={{ ...palette.glassPanel, padding: 12, display: "flex", alignItems: "center", gap: 10, border: "none", width: "100%", textAlign: "left", cursor: "pointer", color: palette.ink }}>
                <div style={{ width: 30, height: 30, borderRadius: 9, background: `${palette.accent}22`, display: "flex", alignItems: "center", justifyContent: "center", color: palette.accent, flexShrink: 0 }}>
                  <Trophy size={14} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>{pr.exercises?.name}</div>
                  <div style={{ fontSize: 10.5, color: palette.inkDim }}>{pr.value} kg · {new Date(pr.date).toLocaleDateString("es-CO", { day: "numeric", month: "short" })}</div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      <div style={sectionLabelStyle(palette)}>Fotos de progreso</div>
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

      <div style={sectionLabelStyle(palette)}>Historial reciente</div>
      {history.length === 0 ? (
        <p style={{ fontSize: 12.5, color: palette.inkDim, textAlign: "center", padding: 12 }}>Todavía no tienes registros.</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {history.map((h, i) => (
            h.type === "workout" && h.id ? (
              <Link key={i} href={`/app/workout-log/${h.id}`} style={{ ...palette.glassPanel, padding: 12, display: "flex", alignItems: "center", gap: 10, textDecoration: "none", color: palette.ink }}>
                <HistoryRowContent h={h} />
              </Link>
            ) : (
              <button key={i} onClick={() => setSelectedHistory(h)} style={{ ...palette.glassPanel, padding: 12, display: "flex", alignItems: "center", gap: 10, border: "none", width: "100%", textAlign: "left", cursor: "pointer" }}>
                <HistoryRowContent h={h} />
              </button>
            )
          ))}
        </div>
      )}

      {selectedHistory && (
        <Modal title={selectedHistory.title} onClose={() => setSelectedHistory(null)} maxWidth={360}>
          <p style={{ fontSize: 12, color: palette.inkDim, marginBottom: 4 }}>
            {new Date(selectedHistory.date).toLocaleDateString("es-CO", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
          </p>
          <p style={{ fontSize: 15, fontWeight: 600 }}>{selectedHistory.detail}</p>
        </Modal>
      )}

      {selectedPR && (
        <Modal title="" onClose={() => setSelectedPR(null)} maxWidth={340}>
          <div style={{ textAlign: "center" }}>
            <div style={{
              width: 60, height: 60, borderRadius: "50%", background: `${palette.accent}22`,
              display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 14px", color: palette.accent,
            }}>
              <Trophy size={26} />
            </div>
            <h3 style={{ fontSize: 17, fontWeight: 700, marginBottom: 4 }}>{selectedPR.exercises?.name}</h3>
            <div style={{ fontSize: 30, fontWeight: 900, marginBottom: 4 }}>{selectedPR.value} kg</div>
            <p style={{ fontSize: 12, color: palette.inkDim, marginBottom: 16 }}>
              Tu mejor marca en este ejercicio, lograda el {new Date(selectedPR.date).toLocaleDateString("es-CO", { day: "numeric", month: "long", year: "numeric" })}.
            </p>
            <p style={{ fontSize: 12.5, color: palette.ink, lineHeight: 1.5, marginBottom: 18 }}>
              Superaste tu marca anterior levantando más peso del que habías movido hasta ahora en este ejercicio — seguí progresando de a poco cada semana para desbloquear el siguiente.
            </p>
            {selectedPR.workout_log_id && (
              <Link
                href={`/app/workout-log/${selectedPR.workout_log_id}`}
                onClick={() => setSelectedPR(null)}
                style={{
                  display: "block", width: "100%", padding: 12, borderRadius: 11, textDecoration: "none",
                  background: `linear-gradient(135deg, ${palette.accent}, ${palette.accentDeep})`, color: palette.bg,
                  fontWeight: 700, fontSize: 13.5,
                }}
              >
                Ver ese entrenamiento
              </Link>
            )}
          </div>
        </Modal>
      )}

      {showVolumeDetail && <VolumeDetailModal volume={stats.totalVolume} onClose={() => setShowVolumeDetail(false)} />}
    </div>
  );
}

function HistoryRowContent({ h }: { h: any }) {
  const palette = usePalette();
  return (
    <>
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
    </>
  );
}

function StatBox({ icon, value, label, onClick }: { icon: React.ReactNode; value: string | number; label: string; onClick?: () => void }) {
  const palette = usePalette();
  const Tag = onClick ? "button" : "div";
  return (
    <Tag onClick={onClick} style={{ ...palette.glassPanel, padding: 12, textAlign: "center", border: "none", width: "100%", cursor: onClick ? "pointer" : "default", color: palette.ink }}>
      <div style={{ color: palette.accent, marginBottom: 4, display: "flex", justifyContent: "center" }}>{icon}</div>
      <div style={{ fontSize: 16, fontWeight: 700 }}>{value}</div>
      <div style={{ fontSize: 9, color: palette.inkDim, marginTop: 1 }}>{label}</div>
    </Tag>
  );
}

function VolumeDetailModal({ volume, onClose }: { volume: number; onClose: () => void }) {
  const palette = usePalette();
  const comparison = getWeightComparison(volume);
  const cardRef = useRef<HTMLDivElement>(null);
  const [sharing, setSharing] = useState(false);

  async function share() {
    if (!cardRef.current) return;
    setSharing(true);
    try {
      const dataUrl = await toPng(cardRef.current, { pixelRatio: 2, backgroundColor: palette.bg });
      const blob = await (await fetch(dataUrl)).blob();
      const file = new File([blob], "volumen-fittrack.png", { type: "image/png" });

      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({ files: [file] });
      } else {
        const link = document.createElement("a");
        link.href = dataUrl;
        link.download = "volumen-fittrack.png";
        link.click();
      }
    } catch {
      alert("No pudimos generar la imagen, intenta de nuevo.");
    } finally {
      setSharing(false);
    }
  }

  return (
    <Modal title="" onClose={onClose} maxWidth={340}>
      <div ref={cardRef} style={{
        borderRadius: 20, padding: "28px 20px", textAlign: "center",
        background: `radial-gradient(circle at 50% 0%, ${palette.accentDeep}44, ${palette.bg} 65%)`,
        border: `1px solid ${palette.panelBorder}`, marginBottom: 16,
      }}>
        <div style={{
          width: 52, height: 52, borderRadius: "50%", background: `${palette.accent}22`,
          display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 12px", color: palette.accent,
        }}>
          <Award size={22} />
        </div>
        <p style={{ fontSize: 11.5, color: palette.inkDim, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 4 }}>Volumen total movido</p>
        <div style={{ fontSize: 34, fontWeight: 900, lineHeight: 1, marginBottom: 4 }}>{volume.toLocaleString()}</div>
        <div style={{ fontSize: 12.5, color: palette.inkDim, marginBottom: 16 }}>kg desde que empezaste</div>
        <div style={{ fontSize: 36, marginBottom: 8 }}>{comparison.emoji}</div>
        <p style={{ fontSize: 13, lineHeight: 1.5 }}>Eso es como mover <strong>{comparison.text}</strong></p>
        <div style={{ marginTop: 16, fontSize: 9.5, color: palette.inkDim, letterSpacing: "0.04em" }}>FitTrack · la IA de Alejo</div>
      </div>

      <button onClick={share} disabled={sharing} style={{
        width: "100%", padding: 13, borderRadius: 12, border: "none",
        background: `linear-gradient(135deg, ${palette.accent}, ${palette.accentDeep})`, color: palette.bg,
        fontWeight: 700, fontSize: 14, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
        opacity: sharing ? 0.7 : 1,
      }}>
        <Share2 size={15} /> {sharing ? "Generando imagen..." : "Compartir como imagen"}
      </button>
    </Modal>
  );
}

function sectionLabelStyle(palette: Palette): React.CSSProperties {
  return {
    fontSize: 12.5, fontWeight: 700, color: palette.accent, textTransform: "uppercase",
    letterSpacing: "0.04em", marginBottom: 10,
  };
}
