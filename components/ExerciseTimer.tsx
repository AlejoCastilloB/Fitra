"use client";

import { useEffect, useRef, useState } from "react";
import { usePalette } from "@/lib/theme";
import { playBeeps, vibrar } from "@/lib/beep";
import { Play, Square } from "lucide-react";

/**
 * El cronómetro de las series de tiempo: plancha, isométricos, hollow, lo que se aguanta.
 *
 * Antes había que contar de cabeza y escribir el número a mano, que es justo lo que no se
 * puede hacer aguantando una plancha. Ahora se toca antes de empezar, se toca al soltar, y
 * el número cae solo en la casilla.
 *
 * Cuenta hacia ARRIBA aunque haya un objetivo. En un isométrico el objetivo es un mínimo,
 * no un tope: si aguantas 70 segundos de los 60 que tocaban, eso es lo que hay que
 * registrar. El objetivo se enseña en el anillo y se avisa al llegar, sin cortar nada.
 *
 * Mientras corre, el número no se guarda en la sesión: el valor se escribe una sola vez al
 * parar. Guardar cada segundo escribiría la sesión entera en el almacenamiento del
 * navegador sesenta veces por plancha, para un dato que hasta que no paras no es
 * definitivo.
 */
export default function ExerciseTimer({
  targetSeconds, onFinish, disabled,
}: { targetSeconds?: number; onFinish: (seconds: number) => void; disabled?: boolean }) {
  const palette = usePalette();
  const [corriendo, setCorriendo] = useState(false);
  const [transcurrido, setTranscurrido] = useState(0);
  const inicioRef = useRef(0);
  const avisadoRef = useRef(false);

  useEffect(() => {
    if (!corriendo) return;
    const id = setInterval(() => {
      const segundos = Math.floor((Date.now() - inicioRef.current) / 1000);
      setTranscurrido(segundos);

      // El aviso al llegar al objetivo, una sola vez. No para el cronómetro: aguantar de
      // más es lo normal y hay que poder registrarlo.
      if (targetSeconds && segundos >= targetSeconds && !avisadoRef.current) {
        avisadoRef.current = true;
        playBeeps(1);
        vibrar([80, 60, 80]);
      }
    }, 250);
    return () => clearInterval(id);
  }, [corriendo, targetSeconds]);

  function alternar() {
    if (corriendo) {
      setCorriendo(false);
      // Al menos un segundo: un toque doble sin querer no debería guardar un cero.
      onFinish(Math.max(1, transcurrido));
      return;
    }
    inicioRef.current = Date.now();
    avisadoRef.current = false;
    setTranscurrido(0);
    setCorriendo(true);
  }

  const size = 34;
  const stroke = 2.5;
  const r = (size - stroke) / 2;
  const circunferencia = 2 * Math.PI * r;
  const avance = targetSeconds ? Math.min(1, transcurrido / targetSeconds) : 0;
  const llegó = !!targetSeconds && transcurrido >= targetSeconds;

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 7, flexShrink: 0 }}>
      {corriendo && (
        <span style={{
          fontSize: 13, fontWeight: 800, minWidth: 26, textAlign: "right",
          fontVariantNumeric: "tabular-nums",
          color: llegó ? palette.accent : palette.ink,
        }}>
          {transcurrido}
        </span>
      )}

      <button
        onClick={alternar}
        disabled={disabled}
        aria-label={corriendo ? "Parar el cronómetro" : "Empezar el cronómetro"}
        title={corriendo ? "Parar y guardar" : "Cronometrar esta serie"}
        className="ft-touch"
        style={{
          position: "relative", width: size, height: size, padding: 0, flexShrink: 0,
          background: "none", border: "none", cursor: disabled ? "default" : "pointer",
          opacity: disabled ? 0.4 : 1,
        }}
      >
        <svg width={size} height={size} style={{ position: "absolute", inset: 0, transform: "rotate(-90deg)" }}>
          <circle
            cx={size / 2} cy={size / 2} r={r} fill="none"
            stroke={corriendo ? palette.divider : palette.panelBorder} strokeWidth={stroke}
          />
          {corriendo && !!targetSeconds && (
            <circle
              cx={size / 2} cy={size / 2} r={r} fill="none" stroke={palette.accent} strokeWidth={stroke}
              strokeLinecap="round" strokeDasharray={circunferencia} strokeDashoffset={circunferencia * (1 - avance)}
              style={{ transition: "stroke-dashoffset .25s linear" }}
            />
          )}
        </svg>
        <span style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", color: palette.accent }}>
          {corriendo ? <Square size={11} fill="currentColor" /> : <Play size={12} fill="currentColor" />}
        </span>
      </button>
    </div>
  );
}
