"use client";

import { Share, SquarePlus, Smartphone } from "lucide-react";
import { palette } from "./onboardingPalette";

export default function AddToHomeScreenSlide({ onNext }: { onNext: () => void }) {
  return (
    <div style={{ textAlign: "center" }}>
      <div style={{
        width: 56, height: 56, borderRadius: "50%", background: `${palette.accent}22`,
        display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 18px", color: palette.accent,
      }}>
        <Smartphone size={26} />
      </div>
      <h2 style={{ fontSize: 19, fontWeight: 700, marginBottom: 10 }}>Agrega FitTrack a tu pantalla de inicio</h2>
      <p style={{ fontSize: 13.5, color: palette.inkDim, lineHeight: 1.6, marginBottom: 22 }}>
        Así la abres como una app normal, sin pasar por el navegador cada vez.
      </p>

      <div style={{
        display: "flex", flexDirection: "column", gap: 14, padding: 18, borderRadius: 14,
        background: palette.inputBg, border: `1px solid ${palette.panelBorder}`, marginBottom: 24, textAlign: "left",
      }}>
        <InstructionRow number={1} icon={<Share size={16} />} text="Toca el ícono de compartir en la barra del navegador" />
        <InstructionRow number={2} icon={<SquarePlus size={16} />} text='Elige "Agregar a pantalla de inicio"' />
        <InstructionRow number={3} icon={<Smartphone size={16} />} text="Confirma, y listo — ya tienes FitTrack como app" />
      </div>

      <button onClick={onNext} style={{
        width: "100%", padding: 13, borderRadius: 12, border: "none", cursor: "pointer",
        background: `linear-gradient(135deg, ${palette.accent}, ${palette.accentDeep})`, color: "#0A0C10",
        fontWeight: 700, fontSize: 14.5,
      }}>
        Entendido
      </button>
    </div>
  );
}

function InstructionRow({ number, icon, text }: { number: number; icon: React.ReactNode; text: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
      <div style={{
        width: 24, height: 24, borderRadius: "50%", background: palette.accent, color: "#0A0C10",
        display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, flexShrink: 0,
      }}>{number}</div>
      <div style={{ color: palette.accent, flexShrink: 0 }}>{icon}</div>
      <span style={{ fontSize: 13, color: palette.ink }}>{text}</span>
    </div>
  );
}
