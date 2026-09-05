/**
 * Duraciones de entrenamiento.
 *
 * Antes todo se contaba en minutos sueltos, así que una sesión larga se leía "61 min" o
 * "78:20" — números que hay que dividir mentalmente. Pasada la hora, la hora se muestra.
 */

/** Cronómetro en vivo: `m:ss` hasta la hora, `h:mm:ss` a partir de ahí. */
export function formatClock(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const hours = Math.floor(s / 3600);
  const minutes = Math.floor((s % 3600) / 60);
  const seconds = s % 60;

  const two = (n: number) => String(n).padStart(2, "0");
  if (hours > 0) return `${hours}:${two(minutes)}:${two(seconds)}`;
  return `${minutes}:${two(seconds)}`;
}

/** Lo mismo pero a partir de milisegundos, que es como llega el tiempo transcurrido. */
export function formatClockFromMs(ms: number): string {
  return formatClock(ms / 1000);
}

/**
 * Duración ya cerrada, para listados y fichas: "45 min", "1 h", "1 h 3 min".
 *
 * Se redondea a minutos porque en un registro los segundos no aportan nada, pero nunca
 * se dice "0 min" para una sesión que sí existió: por debajo del minuto se muestra en
 * segundos.
 */
export function formatDurationLabel(totalSeconds: number | null | undefined): string {
  const s = Math.max(0, Math.floor(totalSeconds ?? 0));
  if (s === 0) return "—";
  if (s < 60) return `${s} s`;

  const totalMinutes = Math.round(s / 60);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours === 0) return `${minutes} min`;
  if (minutes === 0) return `${hours} h`;
  return `${hours} h ${minutes} min`;
}
