/**
 * Preguntas opcionales sobre el ciclo menstrual.
 *
 * Solo aparecen si la persona indicó "Mujer" en el onboarding y siempre se pueden dejar
 * en blanco. Sirven para que el coach sepa si conviene mover las semanas de más carga, y
 * por eso también se suman al contexto que ve en la ficha de la clienta.
 *
 * Se guardan dentro de `clients.lifestyle` (que ya es jsonb) en vez de en columnas
 * nuevas: así no hace falta tocar el esquema y un despliegue no puede romper el registro.
 */

export type CycleRegularity = "regular" | "irregular" | "no_lo_se" | "no_aplica";
export type CycleStrengthImpact = "bastante" | "un_poco" | "no" | "no_lo_se";

export type MenstrualCycleAnswers = {
  regularity?: CycleRegularity;
  strengthImpact?: CycleStrengthImpact;
  /** Nota libre: qué días se siente con menos fuerza, síntomas, lo que quiera contar. */
  notes?: string;
};

export const CYCLE_REGULARITY_OPTIONS: { id: CycleRegularity; label: string }[] = [
  { id: "regular", label: "Regular" },
  { id: "irregular", label: "Irregular" },
  { id: "no_lo_se", label: "No lo sé" },
  { id: "no_aplica", label: "No aplica" },
];

export const CYCLE_IMPACT_OPTIONS: { id: CycleStrengthImpact; label: string }[] = [
  { id: "bastante", label: "Sí, bastante" },
  { id: "un_poco", label: "Un poco" },
  { id: "no", label: "No lo noto" },
  { id: "no_lo_se", label: "No lo sé" },
];

const REGULARITY_TEXT: Record<CycleRegularity, string> = {
  regular: "ciclo regular",
  irregular: "ciclo irregular",
  no_lo_se: "no sabe si su ciclo es regular",
  no_aplica: "el ciclo no aplica en su caso",
};

const IMPACT_TEXT: Record<CycleStrengthImpact, string> = {
  bastante: "el ciclo le afecta bastante la fuerza y la energía",
  un_poco: "el ciclo le afecta un poco la fuerza y la energía",
  no: "no nota que el ciclo le afecte la fuerza",
  no_lo_se: "no sabe si el ciclo le afecta la fuerza",
};

/** ¿Contestó algo? Si no, no se guarda ni se muestra nada. */
export function hasCycleAnswers(c: MenstrualCycleAnswers | null | undefined): boolean {
  if (!c) return false;
  return !!(c.regularity || c.strengthImpact || c.notes?.trim());
}

/** Frase para el contexto de IA y para la ficha que ve el coach. */
export function describeCycle(c: MenstrualCycleAnswers | null | undefined): string | null {
  if (!hasCycleAnswers(c)) return null;
  const parts: string[] = [];
  if (c!.regularity) parts.push(REGULARITY_TEXT[c!.regularity]);
  if (c!.strengthImpact) parts.push(IMPACT_TEXT[c!.strengthImpact]);
  const base = parts.length > 0 ? `Ciclo menstrual: ${parts.join("; ")}.` : "";
  const note = c!.notes?.trim() ? `Comentario sobre el ciclo: ${c!.notes.trim()}.` : "";
  return [base, note].filter(Boolean).join(" ");
}
