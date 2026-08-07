export function computeStreakUpdate(lastWorkoutDate: string | null, currentWeeks: number, now: Date = new Date()) {
  function weekStart(d: Date) {
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    const ws = new Date(d);
    ws.setDate(diff);
    ws.setHours(0, 0, 0, 0);
    return ws;
  }

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
