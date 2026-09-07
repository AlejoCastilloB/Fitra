import { COMMITMENT_OPTIONS, MIN_KCAL, kcalAdjustPct, type CommitmentLevel, type Sex } from "@/lib/computeNutritionGoals";
import { goalLabel } from "@/lib/goals";

/**
 * El "por qué" detrás del número de calorías.
 *
 * La app ya calculaba el objetivo ajustado al objetivo de cada quien, pero solo mostraba
 * el número final: "consume 2.635 kcal" y nada más. Esto desarma la cuenta en las tres
 * piezas que la explican —lo que gasta en reposo, lo que gasta con su actividad, y el
 * ajuste que corresponde a lo que quiere lograr— para que se entienda de dónde sale.
 *
 * Las fórmulas son las mismas de lib/computeNutritionGoals: Mifflin-St Jeor para el gasto
 * en reposo y un factor por días de entrenamiento. Aquí no se recalcula nada distinto,
 * solo se expone lo que allá quedaba dentro de la función.
 */

export const ACTIVITY_LEVELS: { maxDays: number; factor: number; label: string }[] = [
  { maxDays: 1, factor: 1.2, label: "poco movimiento" },
  { maxDays: 2, factor: 1.375, label: "actividad ligera" },
  { maxDays: 4, factor: 1.55, label: "actividad moderada" },
  { maxDays: 6, factor: 1.725, label: "actividad alta" },
  { maxDays: Infinity, factor: 1.9, label: "actividad muy alta" },
];

export function activityLevelFor(daysAvailable: number) {
  return ACTIVITY_LEVELS.find((l) => daysAvailable <= l.maxDays) ?? ACTIVITY_LEVELS[ACTIVITY_LEVELS.length - 1];
}

export function basalMetabolicRate({ weightKg, heightCm, age, sex }: {
  weightKg: number; heightCm: number; age: number; sex: Sex;
}): number {
  return sex === "male"
    ? 10 * weightKg + 6.25 * heightCm - 5 * age + 5
    : 10 * weightKg + 6.25 * heightCm - 5 * age - 161;
}

export type Direction = "deficit" | "superavit" | "mantenimiento";

export type CalorieBreakdown = {
  /** Lo que gasta el cuerpo en reposo, sin moverse. */
  bmr: number;
  /** Gasto total del día: el reposo por el factor de actividad. Las de mantenimiento. */
  maintenance: number;
  activityFactor: number;
  activityLabel: string;
  /** Diferencia respecto al mantenimiento. Negativa en déficit. */
  adjustmentKcal: number;
  adjustmentPct: number;
  /** El objetivo diario final. */
  target: number;
  direction: Direction;
  /** true si el mínimo de seguridad levantó el número por encima de lo que daba la cuenta. */
  hitFloor: boolean;
};

export function calorieBreakdown({
  weightKg, heightCm, age, sex, daysAvailable, goal, commitment, target,
}: {
  weightKg: number; heightCm: number; age: number; sex: Sex;
  daysAvailable: number; goal: string | null; commitment: CommitmentLevel;
  /** El objetivo ya calculado por computeNutritionGoals, para no duplicar la fórmula. */
  target: number;
}): CalorieBreakdown {
  const bmr = Math.round(basalMetabolicRate({ weightKg, heightCm, age, sex }));
  const level = activityLevelFor(daysAvailable);
  const maintenance = Math.round(basalMetabolicRate({ weightKg, heightCm, age, sex }) * level.factor);

  const adjustmentKcal = target - maintenance;
  const adjustmentPct = maintenance > 0 ? adjustmentKcal / maintenance : 0;

  // Lo que habría dado la cuenta sin el mínimo de seguridad. Si el objetivo final quedó
  // por encima de eso, es porque el suelo lo levantó — y entonces el número ya no
  // representa el déficit que pedía el objetivo, sino el mínimo con el que se puede vivir.
  const sinSuelo = maintenance * (1 + kcalAdjustPct(goal, commitment));
  const hitFloor = target > Math.round(sinSuelo);

  const direction: Direction =
    Math.abs(adjustmentKcal) < 40 ? "mantenimiento" : adjustmentKcal < 0 ? "deficit" : "superavit";

  return {
    bmr, maintenance, activityFactor: level.factor, activityLabel: level.label,
    adjustmentKcal, adjustmentPct, target, direction, hitFloor,
  };
}

const kcal = (n: number) => `${Math.abs(Math.round(n)).toLocaleString("es-CO")} kcal`;

/**
 * El texto que acompaña al desglose. Habla del objetivo que la persona eligió y explica
 * qué hace el cuerpo con ese ajuste, no solo cuánto es.
 */
export function explainBreakdown(b: CalorieBreakdown, goal: string | null, commitment: CommitmentLevel): string[] {
  const partes: string[] = [];

  partes.push(
    `Tu cuerpo gasta unas ${kcal(b.bmr)} al día solo con estar vivo — respirar, pensar, mantener la temperatura. ` +
    `Sumándole tu ${b.activityLabel} y tus entrenamientos, el gasto total queda en ${kcal(b.maintenance)}. ` +
    `Esas son tus calorías de mantenimiento: comiendo eso, tu peso se queda donde está.`
  );

  if (b.hitFloor) {
    // Cuando el suelo manda, contar un déficit que no existe sería mentir: el objetivo
    // ya no es el que pedía la meta, es el mínimo con el que el cuerpo funciona bien.
    partes.push(
      `Para ${goalLabel(goal).toLowerCase()} la cuenta daba todavía más bajo, pero no bajamos de ${kcal(MIN_KCAL)} al día. ` +
      `Por debajo de ahí cuesta mucho cubrir las vitaminas, minerales y proteína que tu cuerpo necesita para funcionar, ` +
      `y el cuerpo responde bajando el gasto en vez de soltando grasa. Tu objetivo se queda en ${kcal(b.target)}.`
    );
  } else if (b.direction === "deficit") {
    partes.push(
      `Para ${goalLabel(goal).toLowerCase()} te bajamos ${kcal(b.adjustmentKcal)} de ahí. ` +
      `Ese faltante es justo el que tu cuerpo va a cubrir sacando energía de tus depósitos de grasa. ` +
      `No lo hacemos más grande a propósito: un déficit muy agresivo también te quita músculo y es más difícil de sostener.`
    );
  } else if (b.direction === "superavit") {
    partes.push(
      `Para ${goalLabel(goal).toLowerCase()} te sumamos ${kcal(b.adjustmentKcal)} por encima del mantenimiento. ` +
      `Ese excedente es la energía extra que tu cuerpo necesita para construir tejido nuevo después de entrenar. ` +
      `Lo dejamos moderado a propósito: subir mucho más rápido no construye más músculo, solo más grasa.`
    );
  } else {
    partes.push(
      `Para ${goalLabel(goal).toLowerCase()} te dejamos en tu mantenimiento. ` +
      `Con el entrenamiento haciendo su parte, comer lo que gastas es suficiente para recomponer sin perder rendimiento.`
    );
  }

  const nivel = (b.direction !== "mantenimiento" && !b.hitFloor) ? COMMITMENT_OPTIONS.find((c) => c.id === commitment)?.label : null;
  if (nivel) {
    partes.push(
      `El tamaño de ese ajuste depende del ritmo que elegiste (${nivel.toLowerCase()}). ` +
      `Puedes cambiarlo cuando quieras desde tus ajustes y el número se recalcula solo.`
    );
  }

  return partes;
}
