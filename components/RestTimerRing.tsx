"use client";

import { usePalette } from "@/lib/theme";

/** Segundos que quedan, en el formato más corto que se entienda de un vistazo. */
function etiqueta(segundos: number): string {
  if (segundos < 60) return String(segundos);
  const m = Math.floor(segundos / 60);
  const s = segundos % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

/**
 * El descanso como anillo, en la esquina superior derecha de la tarjeta del ejercicio.
 *
 * Ocupa el mismo hueco donde antes solo había una pastilla que decía "Descanso 90s", que
 * era espacio muerto mientras descansabas: el tiempo se enseñaba abajo, lejos de las
 * series, con una barra que cruzaba toda la tarjeta.
 *
 * El anillo dice dos cosas a la vez sin ocupar más: cuánto queda, en el hueco, y cuánto
 * ha pasado, en el arco. Tocarlo salta el descanso — es el gesto que ya se hacía en el
 * botón "Saltar", ahora encima del propio contador.
 */
export default function RestTimerRing({
  secondsLeft, totalSeconds, onSkip, size = 56,
}: { secondsLeft: number; totalSeconds: number; onSkip: () => void; size?: number }) {
  const palette = usePalette();
  const stroke = 4;
  const r = (size - stroke) / 2;
  const circunferencia = 2 * Math.PI * r;
  const restante = totalSeconds > 0 ? Math.max(0, Math.min(1, secondsLeft / totalSeconds)) : 0;
  const apurando = secondsLeft <= 5;

  return (
    <button
      onClick={onSkip}
      aria-label={`Quedan ${secondsLeft} segundos de descanso. Tocar para saltar.`}
      title="Tocar para saltar el descanso"
      className="ft-touch"
      style={{
        position: "relative", width: size, height: size, padding: 0, flexShrink: 0,
        background: "none", border: "none", cursor: "pointer", fontFamily: "inherit",
      }}
    >
      <style>{`
        @keyframes ftRestPulse { 0%, 100% { opacity: 1; } 50% { opacity: .45; } }
        .ft-rest-apurando { animation: ftRestPulse 1s ease-in-out infinite; }
      `}</style>

      <svg width={size} height={size} style={{ display: "block", transform: "rotate(-90deg)" }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={palette.divider} strokeWidth={stroke} />
        <circle
          cx={size / 2} cy={size / 2} r={r} fill="none" stroke={palette.accent} strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circunferencia}
          strokeDashoffset={circunferencia * (1 - restante)}
          // Lineal y de un segundo: es exactamente lo que dura cada paso del contador, así
          // que el arco avanza al ritmo del número en vez de dar saltos.
          style={{ transition: "stroke-dashoffset 1s linear" }}
        />
      </svg>

      <span
        className={apurando ? "ft-rest-apurando" : undefined}
        style={{
          position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: secondsLeft >= 60 ? 14 : 16, fontWeight: 800, color: palette.ink,
          fontVariantNumeric: "tabular-nums", letterSpacing: "-0.02em",
        }}
      >
        {etiqueta(secondsLeft)}
      </span>
    </button>
  );
}
