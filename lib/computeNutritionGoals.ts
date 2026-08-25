export type Sex = "male" | "female";
export type CommitmentLevel = "suave" | "moderado" | "agresivo";

export type NutritionGoals = { kcal: number; protein: number; carbs: number; fat: number };

// % de ajuste sobre el gasto calórico total (TDEE), por objetivo y nivel de compromiso.
// Topes prudentes a propósito — evitar déficits/superávits agresivos que promuevan efecto rebote.
const KCAL_ADJUST: Record<string, Record<CommitmentLevel, number>> = {
  perdida_grasa: { suave: -0.10, moderado: -0.18, agresivo: -0.25 },
  masa_muscular: { suave: 0.05, moderado: 0.10, agresivo: 0.15 },
  rendimiento: { suave: 0, moderado: 0.03, agresivo: 0.07 },
  fuerza: { suave: 0, moderado: 0.05, agresivo: 0.10 },
  salud: { suave: 0, moderado: 0, agresivo: 0 },
};

// gramos de proteína por kg de peso corporal, según objetivo
const PROTEIN_G_PER_KG: Record<string, number> = {
  perdida_grasa: 2.2, masa_muscular: 2.0, rendimiento: 1.8, fuerza: 2.0, salud: 1.6,
};

// % del total de calorías que viene de grasa, según objetivo (el resto va a carbohidratos)
const FAT_PCT_OF_KCAL: Record<string, number> = {
  perdida_grasa: 0.30, masa_muscular: 0.25, rendimiento: 0.25, fuerza: 0.28, salud: 0.30,
};

const MIN_KCAL = 1200;

function activityFactor(daysAvailable: number): number {
  if (daysAvailable <= 1) return 1.2;
  if (daysAvailable <= 2) return 1.375;
  if (daysAvailable <= 4) return 1.55;
  if (daysAvailable <= 6) return 1.725;
  return 1.9;
}

export function computeNutritionGoals({
  weightKg, heightCm, age, sex, daysAvailable, goal, commitment,
}: {
  weightKg: number; heightCm: number; age: number; sex: Sex;
  daysAvailable: number; goal: string | null; commitment: CommitmentLevel;
}): NutritionGoals {
  const bmr = sex === "male"
    ? 10 * weightKg + 6.25 * heightCm - 5 * age + 5
    : 10 * weightKg + 6.25 * heightCm - 5 * age - 161;

  const tdee = bmr * activityFactor(daysAvailable);

  const goalKey = goal ?? "salud";
  const pct = KCAL_ADJUST[goalKey]?.[commitment] ?? 0;
  const kcal = Math.max(MIN_KCAL, Math.round(tdee * (1 + pct)));

  const protein = Math.round((PROTEIN_G_PER_KG[goalKey] ?? 1.6) * weightKg);
  const proteinKcal = protein * 4;

  const fatPct = FAT_PCT_OF_KCAL[goalKey] ?? 0.28;
  const fat = Math.round((kcal * fatPct) / 9);
  const fatKcal = fat * 9;

  const carbs = Math.round(Math.max(0, kcal - proteinKcal - fatKcal) / 4);

  return { kcal, protein, carbs, fat };
}
