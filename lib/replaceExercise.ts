/**
 * Cambiar un ejercicio por otro sin perder el trabajo ya hecho.
 *
 * Sirve sobre todo para adaptar una rutina copiada: la estructura (el orden, cuántas
 * series, con cuántas reps y cuánto peso) casi siempre se conserva y lo único que cambia
 * es el ejercicio. Rehacerlo a mano era borrar la fila, buscar el nuevo ejercicio,
 * arrastrarlo hasta su sitio y volver a teclear todas las series.
 */

export type SetRow = {
  set_type: string;
  reps?: number;
  weight?: number;
  time_sec?: number;
  distance_m?: number;
};

/** Los campos numéricos de una serie; el tipo de serie va aparte porque siempre viaja. */
type SetField = "reps" | "weight" | "time_sec" | "distance_m";

/** Qué campos usa cada tipo de medición. Los demás no se guardan. */
const FIELDS: Record<string, SetField[]> = {
  reps_weight: ["reps", "weight"],
  time: ["time_sec"],
  distance: ["distance_m"],
  time_distance: ["time_sec", "distance_m"],
};

export function emptySet(measurementType: string): SetRow {
  if (measurementType === "time") return { set_type: "normal", time_sec: 30 };
  if (measurementType === "time_distance") return { set_type: "normal", time_sec: 60, distance_m: 200 };
  if (measurementType === "distance") return { set_type: "normal", distance_m: 100 };
  return { set_type: "normal", reps: 10, weight: 0 };
}

/**
 * Las series del ejercicio viejo, adaptadas al nuevo.
 *
 * Si los dos se miden igual (lo normal: cambiar press de banca por press inclinado) se
 * copian tal cual, incluido el tipo de cada serie: calentamiento sigue siendo
 * calentamiento y el dropset sigue siendo dropset.
 *
 * Si se miden distinto (cambiar sentadillas por plancha, por ejemplo) no hay reps que
 * llevarse, así que se conserva lo que sí tiene sentido — cuántas series son y de qué
 * tipo es cada una — y lo que falta arranca con el valor por defecto del nuevo tipo.
 * Los campos compatibles sí viajan: de "tiempo" a "tiempo y distancia" los segundos se
 * mantienen y solo se estrenan los metros.
 */
export function carrySets(sets: SetRow[], fromType: string, toType: string): SetRow[] {
  // Un ejercicio sin series no debería existir, pero si llega uno, el nuevo empieza con una.
  if (sets.length === 0) return [emptySet(toType)];
  if (fromType === toType) return sets.map((s) => ({ ...s }));

  const base = emptySet(toType);
  const keep = FIELDS[toType] ?? FIELDS.reps_weight;

  return sets.map((s) => {
    const out: SetRow = { set_type: s.set_type };
    for (const field of keep) {
      out[field] = s[field] === undefined ? base[field] : s[field];
    }
    return out;
  });
}
