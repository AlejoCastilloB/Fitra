export type UnitSystem = "metric" | "imperial";

export const MEASUREMENT_ZONES: { key: string; label: string }[] = [
  { key: "brazo", label: "Brazo" },
  { key: "pecho", label: "Pecho" },
  { key: "cintura", label: "Cintura" },
  { key: "cadera", label: "Cadera" },
  { key: "muslo", label: "Muslo" },
];

export const REMINDER_OPTIONS: { value: number | null; label: string }[] = [
  { value: null, label: "Nunca" },
  { value: 7, label: "Cada 7 días" },
  { value: 14, label: "Cada 14 días" },
  { value: 30, label: "Cada 30 días" },
];

// Peso/altura/edad no necesitan actualizarse tan seguido como fotos o medidas —
// se ofrece en meses en vez de días, guardado igual como días para reusar el
// mismo cron de recordatorios (app/api/cron/check-progress/route.ts).
export const PHYSICAL_REMINDER_OPTIONS: { value: number | null; label: string }[] = [
  { value: null, label: "Nunca" },
  { value: 30, label: "Cada mes" },
  { value: 60, label: "Cada 2 meses" },
  { value: 90, label: "Cada 3 meses" },
  { value: 180, label: "Cada 6 meses" },
];

export const ROUTINE_DURATION_OPTIONS: { value: number | null; label: string }[] = [
  { value: null, label: "Sin límite" },
  { value: 14, label: "2 semanas" },
  { value: 30, label: "1 mes" },
  { value: 60, label: "2 meses" },
  { value: 90, label: "3 meses" },
];


export function cmToDisplay(valueCm: number, unit: UnitSystem): number {
  return unit === "imperial" ? Math.round((valueCm / 2.54) * 10) / 10 : Math.round(valueCm * 10) / 10;
}

export function displayToCm(value: number, unit: UnitSystem): number {
  return unit === "imperial" ? value * 2.54 : value;
}

export function unitLabel(unit: UnitSystem): string {
  return unit === "imperial" ? "in" : "cm";
}

/**
 * El peso SIEMPRE se guarda en kilos.
 *
 * `clients.current_weight` alimenta el cálculo de calorías (lib/computeNutritionGoals),
 * que asume kilos. Guardando ahí el número que la persona escribió en libras, 180 lb se
 * convertían en 180 kg y el gasto calculado se disparaba. Estas dos funciones son la
 * frontera: se convierte al mostrar y al guardar, nunca en el medio.
 */
const LB_PER_KG = 2.20462;

export function weightToKg(value: number, unit: UnitSystem): number {
  return unit === "imperial" ? Math.round((value / LB_PER_KG) * 10) / 10 : value;
}

export function kgToWeightDisplay(valueKg: number, unit: UnitSystem): number {
  return unit === "imperial" ? Math.round(valueKg * LB_PER_KG * 10) / 10 : Math.round(valueKg * 10) / 10;
}

export function weightUnitLabel(unit: UnitSystem): string {
  return unit === "imperial" ? "lb" : "kg";
}
