/**
 * El pitido de la app.
 *
 * Vivía dentro de RestAlarm, pero el cronómetro de los ejercicios de tiempo necesita
 * exactamente el mismo sonido: si la plancha pitara distinto que el descanso, parecerían
 * dos apps.
 *
 * El sonido elegido lo guarda la persona en Ajustes. Quien lo lee de la base es RestAlarm,
 * que está montado en toda la app, así que lo deja aquí al arrancar y cualquiera puede
 * pitar sin volver a consultarlo. Si todavía no lo ha dejado, suena el clásico.
 */

export const SOUNDS: Record<string, { freq: number; pattern: number[] }> = {
  clasico: { freq: 880, pattern: [0.35] },
  suave: { freq: 660, pattern: [0.5] },
  energico: { freq: 990, pattern: [0.12, 0.12, 0.12] },
  campana: { freq: 1046, pattern: [0.5] },
  digital: { freq: 1400, pattern: [0.08, 0.08, 0.08, 0.08] },
};

let sonidoElegido = "clasico";

export function setBeepSound(key: string | null | undefined): void {
  if (key && SOUNDS[key]) sonidoElegido = key;
}

/** Hace sonar el pitido `times` veces. Nunca lanza: sin audio, simplemente no suena. */
export function playBeeps(times: number): void {
  const s = SOUNDS[sonidoElegido] || SOUNDS.clasico;
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    let t = ctx.currentTime;
    for (let rep = 0; rep < times; rep++) {
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
      t += 0.4;
    }
  } catch {}
}

/** Una vibración corta, donde el teléfono la permita. En iOS no existe y no pasa nada. */
export function vibrar(patron: number | number[] = 60): void {
  try { navigator.vibrate?.(patron); } catch {}
}
