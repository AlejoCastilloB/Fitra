/**
 * Qué ejercicio ofrecer cuando alguien quiere cambiar otro.
 *
 * Sin esto, reemplazar abría el buscador en blanco y había que acordarse de un sustituto
 * y escribirlo. La idea es que la app proponga lo que propondría un entrenador: el mismo
 * músculo, el mismo gesto, y con lo que tengas más a mano.
 *
 * Tres criterios, por orden de peso:
 *
 *  1. El MÚSCULO tiene que ser el mismo. No es una preferencia, es un filtro: cambiar una
 *     sentadilla por un hip thrust no es cambiar de ejercicio, es cambiar el día.
 *  2. El PATRÓN DE MOVIMIENTO. Una sentadilla con barra se parece a una hack, a una
 *     pendular, a una en Smith o a una búlgara — todas cargan en vertical flexionando
 *     cadera y rodilla. No se parece a una extensión de cuádriceps, aunque trabaje lo
 *     mismo.
 *  3. El EQUIPAMIENTO. Si estabas con mancuernas, primero otras mancuernas; después barra,
 *     que también es peso libre; y al final máquina o polea, que es otra historia.
 *
 * El patrón NO está en la base: no hay columna que lo diga y rellenarla a mano serían
 * cientos de ejercicios. Se deduce del nombre y del slug en inglés, que es el nombre
 * canónico del catálogo original. Cuando no se reconoce, el patrón queda en null y ese
 * ejercicio simplemente no gana ni pierde puntos por ahí: sigue saliendo por músculo.
 */

export type MovementPattern =
  | "sentadilla" | "zancada" | "bisagra" | "empuje_cadera"
  | "extension_rodilla" | "flexion_rodilla" | "gemelo"
  | "empuje_horizontal" | "empuje_vertical"
  | "traccion_horizontal" | "traccion_vertical"
  | "flexion_codo" | "extension_codo" | "elevacion_hombro"
  | "core" | "cardio";

export type ExerciseLike = {
  id: string;
  name: string;
  slug?: string | null;
  muscle_group?: string | null;
  secondary_muscles?: string[] | null;
  equipment?: string | null;
  counts_toward_exercise_id?: string | null;
};

/**
 * El orden IMPORTA: se devuelve el primer patrón que encaje.
 *
 * "curl femoral" y "leg curl" llevan la palabra "curl" pero no son un curl de bíceps, así
 * que la rodilla se comprueba antes que el codo. Lo mismo con "sentadilla búlgara", que
 * lleva "sentadilla" pero es una zancada: lo unilateral va antes que lo bilateral.
 */
const PATRONES: { pattern: MovementPattern; keywords: string[] }[] = [
  { pattern: "flexion_rodilla", keywords: ["leg curl", "curl femoral", "curl de pierna", "curl nordico", "nordic", "femoral tumbado", "femoral sentado"] },
  { pattern: "extension_rodilla", keywords: ["leg extension", "extension de cuadriceps", "extension de pierna", "extension de rodilla"] },
  { pattern: "zancada", keywords: ["lunge", "zancada", "desplante", "bulgar", "split squat", "sentadilla bulgara", "step up", "step-up", "subida al cajon", "subida a banco"] },
  { pattern: "sentadilla", keywords: ["squat", "sentadilla", "hack", "pendular", "pendulum", "sissy", "leg press", "prensa", "goblet"] },
  { pattern: "empuje_cadera", keywords: ["hip thrust", "empuje de cadera", "glute bridge", "puente de gluteo", "kickback de gluteo", "glute kickback", "patada de gluteo", "pull through"] },
  { pattern: "bisagra", keywords: ["deadlift", "peso muerto", "good morning", "buenos dias", "romanian", "rumano", "hyperextension", "hiperextension", "back extension", "extension lumbar", "swing"] },
  { pattern: "gemelo", keywords: ["calf", "gemelo", "pantorrilla", "soleo", "soleus"] },
  { pattern: "core", keywords: ["crunch", "abdominal", "plank", "plancha", "sit up", "sit-up", "leg raise", "elevacion de piernas", "russian twist", "giro ruso", "hollow", "dead bug", "ab wheel", "rueda abdominal", "encogimiento abdominal", "oblicuo"] },
  { pattern: "cardio", keywords: ["run", "correr", "treadmill", "cinta", "bike", "bicicleta", "elliptical", "eliptica", "jump rope", "cuerda", "burpee", "mountain climber", "escalador", "stair", "escaleras", "remo en maquina", "rowing machine"] },
  { pattern: "traccion_vertical", keywords: ["pull up", "pull-up", "dominada", "chin up", "chin-up", "pulldown", "jalon", "pullover"] },
  { pattern: "traccion_horizontal", keywords: ["row", "remo", "face pull", "tiron facial"] },
  { pattern: "empuje_vertical", keywords: ["overhead press", "military press", "press militar", "shoulder press", "press de hombro", "press sobre la cabeza", "arnold", "push press", "handstand", "pino"] },
  { pattern: "empuje_horizontal", keywords: ["bench press", "press de banca", "press de pecho", "chest press", "push up", "push-up", "flexiones", "fondos", "dip", "aperturas", "fly", "pec deck", "crossover", "cruce de poleas", "contractor de pecho"] },
  { pattern: "extension_codo", keywords: ["triceps", "pushdown", "skull", "press frances", "french press", "jalon de triceps", "patada de triceps"] },
  { pattern: "flexion_codo", keywords: ["curl", "biceps", "predicador", "preacher", "martillo", "hammer", "concentrado", "concentration"] },
  { pattern: "elevacion_hombro", keywords: ["lateral raise", "elevacion lateral", "elevaciones laterales", "front raise", "elevacion frontal", "reverse fly", "pajaro", "rear delt", "deltoide posterior", "upright row", "remo al menton", "shrug", "encogimiento de hombros"] },
];

/** Patrones que se parecen lo bastante como para ofrecerse entre sí. Es simétrico. */
const PARECIDOS: [MovementPattern, MovementPattern][] = [
  ["sentadilla", "zancada"],
  ["sentadilla", "extension_rodilla"],
  ["zancada", "extension_rodilla"],
  ["bisagra", "empuje_cadera"],
  ["bisagra", "flexion_rodilla"],
  ["empuje_cadera", "flexion_rodilla"],
  ["empuje_horizontal", "empuje_vertical"],
  ["empuje_horizontal", "extension_codo"],
  ["empuje_vertical", "elevacion_hombro"],
  ["traccion_horizontal", "traccion_vertical"],
  ["traccion_vertical", "flexion_codo"],
  ["traccion_horizontal", "flexion_codo"],
];

/** Familias de equipamiento: dentro de una familia el cambio se nota poco. */
const FAMILIAS: Record<string, string[]> = {
  mancuerna: ["dumbbell", "kettlebell"],
  barra: ["barbell", "ez barbell", "olympic barbell", "trap bar"],
  maquina: ["machine", "leverage machine", "smith machine", "sled machine"],
  polea: ["cable", "band", "resistance band"],
  corporal: ["body weight", "bodyweight", "assisted", "weighted", "none"],
};

/** Peso libre: mancuerna y barra se sustituyen entre sí mucho mejor que con una máquina. */
const PESO_LIBRE = new Set(["mancuerna", "barra"]);

function normalizar(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/** El gesto que hace un ejercicio, deducido de su nombre y de su slug en inglés. */
export function movementPattern(ex: { name?: string | null; slug?: string | null }): MovementPattern | null {
  const texto = `${normalizar(ex.name ?? "")} ${normalizar(ex.slug ?? "")}`;
  for (const { pattern, keywords } of PATRONES) {
    if (keywords.some((k) => texto.includes(normalizar(k)))) return pattern;
  }
  return null;
}

function familiaDe(equipment?: string | null): string | null {
  if (!equipment) return null;
  const clave = equipment.toLowerCase().trim();
  for (const [familia, valores] of Object.entries(FAMILIAS)) {
    if (valores.includes(clave)) return familia;
  }
  return null;
}

const parecidos = new Map<MovementPattern, Set<MovementPattern>>();
for (const [a, b] of PARECIDOS) {
  if (!parecidos.has(a)) parecidos.set(a, new Set());
  if (!parecidos.has(b)) parecidos.set(b, new Set());
  parecidos.get(a)!.add(b);
  parecidos.get(b)!.add(a);
}

export function patternsAreRelated(a: MovementPattern | null, b: MovementPattern | null): boolean {
  if (!a || !b) return false;
  return parecidos.get(a)?.has(b) ?? false;
}

export type ScoredExercise<T> = { exercise: T; score: number; samePattern: boolean; sameEquipment: boolean };

/** Puntos por parecerse al ejercicio que sale. Más alto es mejor sustituto. */
export function scoreReplacement(base: ExerciseLike, candidato: ExerciseLike): number {
  let score = 0;

  const patronBase = movementPattern(base);
  const patronCand = movementPattern(candidato);
  if (patronBase && patronCand && patronBase === patronCand) score += 100;
  else if (patternsAreRelated(patronBase, patronCand)) score += 55;

  const eqBase = (base.equipment ?? "").toLowerCase().trim();
  const eqCand = (candidato.equipment ?? "").toLowerCase().trim();
  const famBase = familiaDe(eqBase);
  const famCand = familiaDe(eqCand);
  if (eqBase && eqBase === eqCand) score += 30;
  else if (famBase && famBase === famCand) score += 18;
  else if (famBase && famCand && PESO_LIBRE.has(famBase) && PESO_LIBRE.has(famCand)) score += 10;

  // Los músculos secundarios afinan el desempate: un press inclinado y uno plano
  // comparten hombro y tríceps; un contractor de pecho, no.
  const secBase = new Set((base.secondary_muscles ?? []).map((m) => m.toLowerCase()));
  const secCand = (candidato.secondary_muscles ?? []).map((m) => m.toLowerCase());
  score += Math.min(12, secCand.filter((m) => secBase.has(m)).length * 4);

  // Variantes del mismo ejercicio en el catálogo: son el sustituto más directo que hay.
  const canonBase = base.counts_toward_exercise_id ?? base.id;
  const canonCand = candidato.counts_toward_exercise_id ?? candidato.id;
  if (canonBase && canonBase === canonCand) score += 40;

  return score;
}

/**
 * Los mejores sustitutos para `base`, de mejor a peor.
 *
 * Fuera el propio ejercicio y fuera lo que no comparta músculo principal. Los que ya están
 * en la rutina bajan mucho pero no desaparecen: repetir un ejercicio es legítimo, solo que
 * rara vez es lo que se busca al reemplazar.
 */
export function suggestReplacements<T extends ExerciseLike>(
  base: ExerciseLike,
  candidatos: T[],
  opciones: { alreadyInRoutine?: string[]; limit?: number } = {},
): ScoredExercise<T>[] {
  const yaPuestos = new Set(opciones.alreadyInRoutine ?? []);
  const musculoBase = (base.muscle_group ?? "").toLowerCase();
  const patronBase = movementPattern(base);
  const eqBase = (base.equipment ?? "").toLowerCase().trim();

  const puntuados = candidatos
    .filter((c) => c.id !== base.id)
    .filter((c) => !musculoBase || (c.muscle_group ?? "").toLowerCase() === musculoBase)
    .map((c) => {
      const patronCand = movementPattern(c);
      return {
        exercise: c,
        score: scoreReplacement(base, c) - (yaPuestos.has(c.id) ? 40 : 0),
        samePattern: !!patronBase && patronBase === patronCand,
        sameEquipment: !!eqBase && eqBase === (c.equipment ?? "").toLowerCase().trim(),
      };
    });

  puntuados.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    // A igualdad de puntos, el nombre más corto: suele ser el ejercicio más común.
    return a.exercise.name.length - b.exercise.name.length;
  });

  return opciones.limit ? puntuados.slice(0, opciones.limit) : puntuados;
}

/** Por qué se sugiere este ejercicio, en una línea para la pantalla. */
export function suggestionReason(base: ExerciseLike, s: ScoredExercise<ExerciseLike>): string {
  if (s.samePattern && s.sameEquipment) return "Mismo gesto y mismo equipo";
  if (s.samePattern) return "Mismo gesto";
  if (patternsAreRelated(movementPattern(base), movementPattern(s.exercise))) return "Gesto parecido";
  if (s.sameEquipment) return "Mismo músculo y mismo equipo";
  return "Mismo músculo";
}
