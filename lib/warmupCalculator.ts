export type WarmupSet = { weight: number; reps: number };

// escalera clásica de calentamiento: barra vacía, 40%, 60%, 80% del peso objetivo
export function computeWarmupSets(targetWeight: number): WarmupSet[] {
  if (!targetWeight || targetWeight <= 0) return [];
  const sets: WarmupSet[] = [];
  if (targetWeight > 20) sets.push({ weight: 20, reps: 12 });
  sets.push({ weight: Math.round(targetWeight * 0.4 / 2.5) * 2.5, reps: 8 });
  sets.push({ weight: Math.round(targetWeight * 0.6 / 2.5) * 2.5, reps: 5 });
  if (targetWeight > 40) sets.push({ weight: Math.round(targetWeight * 0.8 / 2.5) * 2.5, reps: 3 });
  return sets;
}
