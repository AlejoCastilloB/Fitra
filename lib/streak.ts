function weekStart(d: Date) {
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  const ws = new Date(d);
  ws.setDate(diff);
  ws.setHours(0, 0, 0, 0);
  return ws;
}

// racha guardada solo se recalcula al terminar un entreno — si pasó más de una semana calendario
// sin entrenar, ya se rompió aunque el valor guardado en la fila `streaks` todavía no lo refleje.
export function getDisplayStreak(currentWeeks: number, lastWorkoutDate: string | null, now: Date = new Date()): number {
  if (!lastWorkoutDate) return 0;
  const diffWeeks = Math.round((weekStart(now).getTime() - weekStart(new Date(lastWorkoutDate)).getTime()) / (7 * 86400000));
  return diffWeeks >= 2 ? 0 : currentWeeks;
}

export function computeStreakUpdate(lastWorkoutDate: string | null, currentWeeks: number, now: Date = new Date()) {
  const thisWeekStart = weekStart(now);

  if (!lastWorkoutDate) {
    return { current_weeks: 1, last_workout_date: now.toISOString() };
  }

  const lastWeekStart = weekStart(new Date(lastWorkoutDate));
  const diffWeeks = Math.round((thisWeekStart.getTime() - lastWeekStart.getTime()) / (7 * 86400000));

  if (diffWeeks === 0) {
    return { current_weeks: currentWeeks, last_workout_date: now.toISOString() };
  }
  if (diffWeeks === 1) {
    return { current_weeks: currentWeeks + 1, last_workout_date: now.toISOString() };
  }
  return { current_weeks: 1, last_workout_date: now.toISOString() };
}
