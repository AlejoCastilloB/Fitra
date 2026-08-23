"use client";

import { useState } from "react";
import { Bell, Flame, UtensilsCrossed } from "lucide-react";
import { palette } from "./onboardingPalette";
import { requestPushPermissionAndSubscribe } from "@/lib/push";

export default function NotificationPermissionSlide({ onNext }: { onNext: () => void }) {
  const [requesting, setRequesting] = useState(false);

  async function handleActivate() {
    setRequesting(true);
    await requestPushPermissionAndSubscribe();
    setRequesting(false);
    onNext();
  }

  return (
    <div style={{ textAlign: "center" }}>
      <div style={{
        width: 56, height: 56, borderRadius: "50%", background: `${palette.accent}22`,
        display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 18px", color: palette.accent,
      }}>
        <Bell size={26} />
      </div>
      <h2 style={{ fontSize: 19, fontWeight: 700, marginBottom: 10 }}>Activa tus notificaciones</h2>
      <p style={{ fontSize: 13.5, color: palette.inkDim, lineHeight: 1.6, marginBottom: 22 }}>
        Te avisamos cuando termina tu descanso entre series, aunque tengas la pantalla apagada, y te recordamos registrar tus comidas a la hora justa para que tu progreso quede completo.
      </p>

      <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 24, textAlign: "left" }}>
        <FeatureLine icon={<Flame size={15} />} text="Aviso de fin de descanso, con la app cerrada" />
        <FeatureLine icon={<UtensilsCrossed size={15} />} text="Recordatorio de comidas según tu horario" />
      </div>

      <button onClick={handleActivate} disabled={requesting} style={{
        width: "100%", padding: 13, borderRadius: 12, border: "none", cursor: "pointer",
        background: `linear-gradient(135deg, ${palette.accent}, ${palette.accentDeep})`, color: "#0A0C10",
        fontWeight: 700, fontSize: 14.5, marginBottom: 10, opacity: requesting ? 0.7 : 1,
      }}>
        {requesting ? "Activando..." : "Activar notificaciones"}
      </button>
      <button onClick={onNext} style={{ width: "100%", padding: 11, borderRadius: 12, border: "none", background: "none", color: palette.inkDim, fontSize: 13, cursor: "pointer" }}>
        Ahora no
      </button>
    </div>
  );
}

function FeatureLine({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
      <div style={{ color: palette.accent, flexShrink: 0 }}>{icon}</div>
      <span style={{ fontSize: 13, color: palette.ink }}>{text}</span>
    </div>
  );
}
