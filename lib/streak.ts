function weekStart(d: Date) {
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
export function computeStreakFromDates(dates: (string | null | undefined)[], now: Date = new Date()): number {
  const weeksWithWorkout = new Set(
    dates.filter((d): d is string => !!d).map((d) => weekStart(new Date(d)).getTime())
  );
  if (weeksWithWorkout.size === 0) return 0;

  const thisWeek = weekStart(now);
  const lastWeek = new Date(thisWeek);
  lastWeek.setDate(lastWeek.getDate() - 7);

  let cursor: Date;
  if (weeksWithWorkout.has(thisWeek.getTime())) cursor = thisWeek;
  else if (weeksWithWorkout.has(lastWeek.getTime())) cursor = lastWeek;
  else return 0;

  let weeks = 0;
  while (weeksWithWorkout.has(cursor.getTime())) {
    weeks++;
    cursor = new Date(cursor);
    cursor.setDate(cursor.getDate() - 7);
  }
  return weeks;
}
