import { startOfWeekInTimeZone } from "@/lib/timeZoneDate";

/**
 * El lunes de la semana en que cae esa fecha.
 *
 * Sin zona horaria usa el reloj del proceso, que es lo correcto en el navegador: ahí el
 * proceso es el teléfono del usuario. En el servidor hay que pasarle la zona, porque si
 * no cuenta en UTC y un entreno del domingo por la noche en Colombia se va a la semana
 * siguiente — la app decía "4 semanas de racha" y el logro de 4 semanas no se desbloqueaba.
 */
function weekStart(d: Date, timeZone?: string | null) {
  if (timeZone) return startOfWeekInTimeZone(timeZone, d);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  const ws = new Date(d);
  ws.setDate(diff);
  ws.setHours(0, 0, 0, 0);
  return ws;
}

// La racha se calcula directo desde las fechas reales de entrenamiento en vez de
// mantener un contador incremental aparte (streaks.current_weeks) — ese contador
// solo se actualizaba al terminar un entreno y podía quedar desalineado con la
// actividad real (por ejemplo, si algo lo incrementaba sin que hubiera semanas
// realmente consecutivas). Esta versión siempre refleja la actividad real: cuenta
// semanas consecutivas con al menos un entreno, hacia atrás desde la semana actual
// (o la anterior, si esta semana todavía no hay entreno pero la pasada sí sigue
// viva la racha) — y se rompe apenas hay una semana real sin nada en medio.
export function computeStreakFromDates(
  dates: (string | null | undefined)[], now: Date = new Date(), timeZone?: string | null,
): number {
  // Cada semana se identifica por el instante en que empezó su lunes. Para retroceder una
  // semana NO se restan 168 horas: en las zonas con horario de verano la semana anterior
  // puede durar 167 o 169, y el instante no coincidiría. Se salta a la mitad de la semana
  // anterior y se vuelve a pedir su lunes, que siempre cae donde debe.
  const previousWeek = (monday: Date) => weekStart(new Date(monday.getTime() - 84 * 3600 * 1000), timeZone);

  const weeksWithWorkout = new Set(
    dates.filter((d): d is string => !!d).map((d) => weekStart(new Date(d), timeZone).getTime())
  );
  if (weeksWithWorkout.size === 0) return 0;

  const thisWeek = weekStart(now, timeZone);
  const lastWeek = previousWeek(thisWeek);

  let cursor: Date;
  if (weeksWithWorkout.has(thisWeek.getTime())) cursor = thisWeek;
  else if (weeksWithWorkout.has(lastWeek.getTime())) cursor = lastWeek;
  else return 0;

  let weeks = 0;
  while (weeksWithWorkout.has(cursor.getTime())) {
    weeks++;
    cursor = previousWeek(cursor);
  }
  return weeks;
}
