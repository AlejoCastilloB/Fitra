"use client";

import { usePalette } from "@/lib/theme";
import { Achievement } from "@/lib/achievements";
import { Share2, Award, X } from "lucide-react";
import Link from "next/link";

export default function AchievementCelebration({
  achievement, onClose,
}: { achievement: Achievement; onClose: () => void }) {
  const palette = usePalette();
  async function share() {
    const text = `Desbloqueé la insignia "${achievement.title}" en FitTrack ${achievement.emoji}`;
    if (navigator.share) await navigator.share({ text });
    else {
      await navigator.clipboard.writeText(text);
      alert("Copiado al portapapeles");
    }
  }

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 300, display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center", padding: 24,
      background: `radial-gradient(circle at 50% 30%, ${palette.accentDeep}55, ${palette.bg} 70%)`,
    }}>
      <style>{`
        @keyframes ftBadgeIn { 0% { opacity: 0; transform: scale(0.5) rotate(-10deg); } 60% { transform: scale(1.08) rotate(3deg); } 100% { opacity: 1; transform: scale(1) rotate(0); } }
        .ft-badge-in { animation: ftBadgeIn .6s cubic-bezier(.16,.8,.24,1) both; }
      `}</style>

      <button onClick={onClose} style={{
        position: "absolute", top: 24, left: 24, background: palette.panel, border: `1px solid ${palette.panelBorder}`,
        borderRadius: "50%", width: 40, height: 40, display: "flex", alignItems: "center", justifyContent: "center",
        color: palette.ink, cursor: "pointer",
      }}>
        <X size={18} />
      </button>

      <div className="ft-badge-in" style={{
        width: 140, height: 140, borderRadius: 32, background: `linear-gradient(135deg, ${palette.accent}, ${palette.accentDeep})`,
        display: "flex", alignItems: "center", justifyContent: "center", fontSize: 60, marginBottom: 24,
        boxShadow: `0 20px 60px -10px ${palette.accent}88`,
      }}>
        {achievement.emoji}
      </div>

      <p style={{ fontSize: 12.5, color: palette.inkDim, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6 }}>
        Insignia desbloqueada
      </p>
      <h1 style={{ fontSize: 26, fontWeight: 800, marginBottom: 8, textAlign: "center" }}>{achievement.title}</h1>
      <p style={{ fontSize: 14, color: palette.inkDim, textAlign: "center", marginBottom: 40, maxWidth: 280 }}>
        {achievement.description}
      </p>

      <button onClick={share} style={{
        width: "100%", maxWidth: 320, padding: 14, borderRadius: 14, border: "none", marginBottom: 10,
        background: palette.ink, color: palette.bg, fontWeight: 700, fontSize: 14, cursor: "pointer",
        display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
      }}>
        <Share2 size={16} /> Comparte tu insignia
      </button>

      <Link href="/app/achievements" onClick={onClose} style={{
        width: "100%", maxWidth: 320, padding: 14, borderRadius: 14, border: `1px solid ${palette.panelBorder}`,
        background: "none", color: palette.ink, fontWeight: 600, fontSize: 14, textAlign: "center", textDecoration: "none",
        display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
      }}>
        <Award size={16} /> Ver todas las insignias
      </Link>
    </div>
  );
}
