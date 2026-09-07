/**
 * Fechas en la zona horaria de OTRA persona.
 *
 * lib/localDate.ts resuelve "hoy" y "esta semana" con el reloj del dispositivo, que es lo
 * correcto en la app del cliente: ahí el dispositivo ES el del cliente. Pero en el portal
 * del entrenador el proceso corre en el servidor —UTC en Vercel— y las fechas que se
 * miran son las de otra persona. Con `toISOString().slice(0,10)` una cena a las 8 de la
 * noche en Colombia (UTC-5) caía en el día siguiente, así que el entrenador y su cliente
 * veían el mismo entreno en casillas distintas.
 *
 * Estas funciones hacen la misma cuenta pero contra una zona horaria explícita. El
 * cálculo se apoya en Intl, así que el horario de verano lo resuelve el sistema y no una
 * tabla nuestra.
 */

/** Zona horaria por defecto cuando la persona todavía no tiene una guardada. */
export const FALLBACK_TIME_ZONE = "UTC";

/** true si la zona existe y el sistema la entiende. */
export function isValidTimeZone(tz: string | null | undefined): tz is string {
  if (!tz) return false;
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

/** La primera zona válida de la lista; si ninguna sirve, el respaldo. */
export function pickTimeZone(...candidates: (string | null | undefined)[]): string {
  for (const c of candidates) if (isValidTimeZone(c)) return c;
  return FALLBACK_TIME_ZONE;
}

type Parts = { year: number; month: number; day: number; hour: number; minute: number; second: number };

const formatterCache = new Map<string, Intl.DateTimeFormat>();

function formatterFor(timeZone: string): Intl.DateTimeFormat {
  let f = formatterCache.get(timeZone);
  if (!f) {
    f = new Intl.DateTimeFormat("en-US", {
      timeZone, hour12: false,
      year: "numeric", month: "2-digit", day: "2-digit",
      hour: "2-digit", minute: "2-digit", second: "2-digit",
    });
    formatterCache.set(timeZone, f);
  }
  return f;
}

/** Qué hora era en esa zona en ese instante. */
export function partsInTimeZone(date: Date, timeZone: string): Parts {
  const map: Record<string, string> = {};
  for (const p of formatterFor(timeZone).formatToParts(date)) map[p.type] = p.value;
  return {
    year: +map.year, month: +map.month, day: +map.day,
    // A medianoche, en_US con hour12:false devuelve "24" en algunos entornos.
    hour: +map.hour % 24, minute: +map.minute, second: +map.second,
  };
}

/** Cuánto se adelanta esa zona respecto a UTC en ese instante, en milisegundos. */
function offsetMs(date: Date, timeZone: string): number {
  const p = partsInTimeZone(date, timeZone);
  const asIfUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
  return asIfUtc - Math.floor(date.getTime() / 1000) * 1000;
}

/**
 * El instante real que corresponde a esa fecha y hora leídas en esa zona.
 *
 * Se calcula en dos pasos porque el desfase depende del instante que estamos buscando: se
 * estima con el desfase de la primera aproximación y se corrige con el de la segunda. Eso
 * cubre los saltos de horario de verano, donde el desfase cambia justo en medio.
 */
export function zonedTimeToUtc(
  { year, month, day, hour = 0, minute = 0, second = 0 }:
  { year: number; month: number; day: number; hour?: number; minute?: number; second?: number },
  timeZone: string,
): Date {
  const naive = Date.UTC(year, month - 1, day, hour, minute, second);
  const primera = new Date(naive - offsetMs(new Date(naive), timeZone));
  return new Date(naive - offsetMs(primera, timeZone));
}

/** "YYYY-MM-DD" del día en que ese instante cae, según esa zona. */
export function dateKeyInTimeZone(date: Date | string | null | undefined, timeZone: string): string | null {
  if (!date) return null;
  const d = typeof date === "string" ? new Date(date) : date;
  if (Number.isNaN(d.getTime())) return null;
  const p = partsInTimeZone(d, timeZone);
  return `${p.year}-${String(p.month).padStart(2, "0")}-${String(p.day).padStart(2, "0")}`;
}

/** El instante en que empezó el día en esa zona. */
export function startOfDayInTimeZone(timeZone: string, now: Date = new Date()): Date {
  const p = partsInTimeZone(now, timeZone);
  return zonedTimeToUtc({ year: p.year, month: p.month, day: p.day }, timeZone);
}

/** Día de la semana (0 = domingo) en esa zona, que es como se guardan days_of_week. */
export function dayOfWeekInTimeZone(timeZone: string, now: Date = new Date()): number {
  const p = partsInTimeZone(now, timeZone);
  // Se construye en UTC a propósito: solo interesa qué día de la semana es ese número de
  // calendario, y getUTCDay lo da sin que el reloj del proceso se meta.
  return new Date(Date.UTC(p.year, p.month - 1, p.day)).getUTCDay();
}

/**
 * El instante en que empezó el LUNES de la semana en curso, en esa zona.
 *
 * Lunes porque es lo que ya usan la racha y la app del cliente, y porque es como se
 * planifica una rutina: "cinco días esta semana" se cuenta desde el lunes.
 */
export function startOfWeekInTimeZone(timeZone: string, now: Date = new Date(), offsetWeeks = 0): Date {
  const p = partsInTimeZone(now, timeZone);
  const dow = dayOfWeekInTimeZone(timeZone, now);
  const diffToMonday = dow === 0 ? -6 : 1 - dow;
  return zonedTimeToUtc(
    { year: p.year, month: p.month, day: p.day + diffToMonday + offsetWeeks * 7 },
    timeZone,
  );
}
