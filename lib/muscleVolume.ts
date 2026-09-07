/**
 * Cuántas series le tocan a cada músculo en una rutina.
 *
 * Dos reglas, las dos a propósito:
 *
 * 1. Solo cuentan las series EFECTIVAS. Fuera el calentamiento (no genera estímulo) y
 *    fuera los dropsets (son una prolongación de la serie anterior, no una serie más:
 *    contarlos infla el volumen de un ejercicio frente a otro que hace lo mismo sin
 *    dropsets).
 *
 * 2. Una serie no le toca solo al músculo principal. En un press de banca el pecho hace
 *    el trabajo, pero el hombro y el tríceps también acumulan fatiga. Se cuenta 1 para el
 *    principal y 0,5 para cada secundario, que es la convención habitual al planificar
 *    volumen semanal por grupo muscular.
 *
 * Nada de esto toca la base: se calcula desde `muscle_group` y `secondary_muscles` del
 * ejercicio, que ya están.
 */

/** Lo que aporta una serie al músculo principal. */
export const PRIMARY_WEIGHT = 1;
/** Lo que aporta una serie a cada músculo secundario. */
export const SECONDARY_WEIGHT = 0.5;

/** Tipos de serie que NO suman volumen efectivo. */
const IGNORED_SET_TYPES = new Set(["warmup", "dropset"]);

export type CountableSet = { set_type?: string | null };

export type ExerciseForVolume = {
  /** Músculo principal, tal como viene de `exercises.muscle_group`. */
  muscleGroup?: string | null;
  /** `exercises.secondary_muscles`. */
  secondaryMuscles?: (string | null)[] | null;
  sets: CountableSet[];
};

/** Cuántas de esas series cuentan de verdad. */
export function effectiveSetCount(sets: CountableSet[]): number {
  return sets.filter((s) => !IGNORED_SET_TYPES.has((s.set_type ?? "normal").toLowerCase())).length;
}

export type MuscleVolume = { muscle: string; sets: number };

/**
 * Series por músculo, ya ordenadas de más a menos.
 *
 * Un músculo que aparezca a la vez como principal y como secundario del MISMO ejercicio
 * cuenta una sola vez, como principal: si no, un dato mal cargado inflaría ese grupo.
 */
export function muscleVolume(exercises: ExerciseForVolume[]): MuscleVolume[] {
  const total: Record<string, number> = {};

  for (const ex of exercises) {
    const efectivas = effectiveSetCount(ex.sets);
    if (efectivas === 0) continue;

    const principal = normalize(ex.muscleGroup);
    if (principal) total[principal] = (total[principal] ?? 0) + efectivas * PRIMARY_WEIGHT;

    const secundarios = new Set(
      (ex.secondaryMuscles ?? []).map(normalize).filter((m): m is string => !!m && m !== principal)
    );
    for (const m of secundarios) total[m] = (total[m] ?? 0) + efectivas * SECONDARY_WEIGHT;
  }

  return Object.entries(total)
    .map(([muscle, sets]) => ({ muscle, sets: round(sets) }))
    .sort((a, b) => b.sets - a.sets || a.muscle.localeCompare(b.muscle, "es"));
}

/** Suma el volumen de varias rutinas en un solo reparto por músculo. */
export function combineMuscleVolume(porRutina: MuscleVolume[][]): MuscleVolume[] {
  const total: Record<string, number> = {};
  for (const rutina of porRutina) {
    for (const { muscle, sets } of rutina) total[muscle] = (total[muscle] ?? 0) + sets;
  }
  return Object.entries(total)
    .map(([muscle, sets]) => ({ muscle, sets: round(sets) }))
    .sort((a, b) => b.sets - a.sets || a.muscle.localeCompare(b.muscle, "es"));
}

/** Para pintar "12,5" y no "12.5000000001" ni "13". */
export function formatSets(n: number): string {
  return Number.isInteger(n) ? String(n) : n.toFixed(1).replace(".", ",");
}

function normalize(m?: string | null): string | null {
  const v = (m ?? "").trim().toLowerCase();
  return v.length > 0 ? v : null;
}

/** Los medios se suman de a 0,5, así que un decimal basta y evita la basura binaria. */
function round(n: number): number {
  return Math.round(n * 10) / 10;
}
