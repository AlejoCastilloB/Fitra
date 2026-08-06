const MUSCLE_ES: Record<string, string> = {
  abductors: "Abductores",
  abs: "Abdomen",
  adductors: "Aductores",
  biceps: "Bíceps",
  calves: "Gemelos",
  cardio: "Cardio",
  delts: "Deltoides",
  forearms: "Antebrazos",
  glutes: "Glúteos",
  hamstrings: "Isquiotibiales",
  lats: "Dorsales",
  "levator-scapulae": "Elevador de la escápula",
  pectorals: "Pectorales",
  quads: "Cuádriceps",
  "serratus-anterior": "Serrato anterior",
  spine: "Espalda baja",
  traps: "Trapecios",
  triceps: "Tríceps",
  "upper-back": "Espalda alta",
};

export function muscleLabel(value?: string | null): string {
  if (!value) return "—";
  return MUSCLE_ES[value.toLowerCase()] ?? value;
}
