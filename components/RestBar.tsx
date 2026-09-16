"use client";

import { usePalette, type Palette } from "@/lib/theme";
import { Minus, Plus, SkipForward } from "lucide-react";

/**
 * Los controles del descanso: quitar diez segundos, saltar, o sumar diez.
 *
 * El tiempo ya no se enseña aquí. Antes esto era una barra que cruzaba la tarjeta entera
 * con el número encima, lejos de las series y duplicando el hueco de arriba a la derecha
 * que solo decía "Descanso 90s". Ahora la cuenta atrás vive en ese hueco, como anillo, y
 * aquí quedan solo los botones — en el mismo sitio de siempre, para no mover la mano de
 * quien ya los tiene aprendidos.
 */
export default function RestBar({
  onAdjust, onSkip,
}: { onAdjust: (delta: number) => void; onSkip: () => void }) {
  const palette = usePalette();

  return (
    <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 14, margin: "12px 0 16px" }}>
      <button onClick={() => onAdjust(-10)} className="ft-touch-y" style={smallBtn(palette)}><Minus size={12} /> 10s</button>
      <button onClick={onSkip} className="ft-touch-y" style={{ ...smallBtn(palette), color: palette.inkDim, borderColor: palette.panelBorder }}>
        <SkipForward size={12} /> Saltar
      </button>
      <button onClick={() => onAdjust(10)} className="ft-touch-y" style={smallBtn(palette)}><Plus size={12} /> 10s</button>
    </div>
  );
}

function smallBtn(palette: Palette): React.CSSProperties {
  return {
    display: "flex", alignItems: "center", gap: 4, background: "none", border: "1px solid",
    borderColor: "currentColor", borderRadius: 10, padding: "7px 12px", color: palette.accent,
    fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit",
  };
}
