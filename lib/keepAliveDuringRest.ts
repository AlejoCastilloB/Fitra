/**
 * Mantener viva la pestaña mientras corre un descanso.
 *
 * El problema: el aviso de "descanso terminado" lo dispara un setTimeout de la propia app,
 * y iOS congela los temporizadores de una pestaña en segundo plano. Con la app abierta el
 * aviso llega al instante; al bloquear el teléfono o cambiar de app, ese timer no corre y
 * la notificación solo llega cuando pasa el cron del servidor —cada varios minutos—.
 *
 * La solución: mientras hay un descanso contando, se reproduce audio en silencio. Un
 * navegador no suspende una pestaña que está reproduciendo audio, así que el temporizador
 * sigue vivo y el aviso sale a su hora.
 *
 * Es un truco, y hay que ser honesto con sus límites:
 *  - Solo dura lo que dura el descanso (90 s típicos), no todo el entreno.
 *  - Gasta algo de batería mientras está activo, aunque sea silencio: lo que cuesta es
 *    tener la pestaña despierta, no el sonido.
 *  - Necesita que la persona haya tocado algo antes en la página. Como el descanso empieza
 *    justo al marcar una serie, esa condición se cumple sola.
 *  - Si el sistema lo corta igual, no se pierde nada: el push del servidor sigue siendo la
 *    red de seguridad.
 */

let ctx: AudioContext | null = null;
let source: AudioBufferSourceNode | null = null;

function getContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  const Ctor = window.AudioContext || (window as any).webkitAudioContext;
  if (!Ctor) return null;
  if (!ctx) {
    try { ctx = new Ctor(); } catch { return null; }
  }
  return ctx;
}

/** Empieza el silencio. Idempotente: llamarlo dos veces no encadena dos fuentes. */
export function startKeepAlive(): void {
  const audio = getContext();
  if (!audio || source) return;

  try {
    if (audio.state === "suspended") audio.resume().catch(() => {});

    // Un búfer de un segundo lleno de ceros, en bucle. Es silencio de verdad —no un
    // volumen bajito—, así que no interfiere con la música que la persona esté oyendo.
    const buffer = audio.createBuffer(1, audio.sampleRate, audio.sampleRate);
    const node = audio.createBufferSource();
    node.buffer = buffer;
    node.loop = true;

    // Con la ganancia a cero, aunque el búfer tuviera algo, no saldría nada.
    const gain = audio.createGain();
    gain.gain.value = 0;

    node.connect(gain);
    gain.connect(audio.destination);
    node.start();
    source = node;
  } catch {
    source = null;
  }
}

/** Corta el silencio y deja que el sistema vuelva a suspender la pestaña. */
export function stopKeepAlive(): void {
  if (!source) return;
  try { source.stop(); } catch {}
  try { source.disconnect(); } catch {}
  source = null;
}

/** Para las pruebas y para saber si de verdad quedó activo. */
export function isKeepAliveRunning(): boolean {
  return source !== null;
}
