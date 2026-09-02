/**
 * Fechas en la hora local del dispositivo.
 *
 * `toISOString().slice(0,10)` devuelve la fecha en UTC, no la del usuario. Mezclarla con
 * medianoche local corría el calendario un día entero: en España (UTC+2) la medianoche
 * del lunes es domingo a las 22:00 UTC, así que el día marcado como "hoy" caía en la
 * casilla del día siguiente. Todo lo que el usuario ve como "hoy" o "esta semana" tiene
 * que salir de su reloj, no del del servidor.
 */

/** "YYYY-MM-DD" según el reloj local. */
export function localDateKey(date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** Pasa una marca de tiempo de la base a la fecha local en que ocurrió. */
export function toLocalDateKey(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : localDateKey(d);
}

/** Instante exacto en que empezó el día local (para filtrar por timestamp). */
export function startOfLocalDay(date: Date = new Date()): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

/** Lunes de la semana local, opcionalmente desplazado en semanas. */
export function startOfLocalWeek(offsetWeeks = 0): Date {
  const d = new Date();
  const day = d.getDay();                       // 0 = domingo
  const diffToMonday = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diffToMonday + offsetWeeks * 7);
  d.setHours(0, 0, 0, 0);
  return d;
}

/** Día de la semana local (0 = domingo), que es como se guardan days_of_week. */
export function localDayOfWeek(): number {
  return new Date().getDay();
}
