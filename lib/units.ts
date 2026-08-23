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

export function cmToDisplay(valueCm: number, unit: UnitSystem): number {
  return unit === "imperial" ? Math.round((valueCm / 2.54) * 10) / 10 : Math.round(valueCm * 10) / 10;
}

export function displayToCm(value: number, unit: UnitSystem): number {
  return unit === "imperial" ? value * 2.54 : value;
}

export function unitLabel(unit: UnitSystem): string {
  return unit === "imperial" ? "in" : "cm";
}
