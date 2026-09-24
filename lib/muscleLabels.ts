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
  plyometrics: "Pliometría",
};

/**
 * Las categorías que siempre se ofrecen al crear un ejercicio.
 *
 * La lista de grupos musculares sale de los ejercicios que YA existen, así que una
 * categoría nueva no aparecería en ningún desplegable hasta que alguien la escribiera a
 * mano la primera vez. Estas se ofrecen desde el principio.
 */
export const MUSCULOS_SUGERIDOS: string[] = Object.keys(MUSCLE_ES);

export function muscleLabel(value?: string | null): string {
  if (!value) return "—";
  return MUSCLE_ES[value.toLowerCase()] ?? value;
}
