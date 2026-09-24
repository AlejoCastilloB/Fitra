/**
 * Importar una rutina desde un texto pegado o una captura de pantalla.
 *
 * Gemini devuelve lo que lee tal cual lo lee: "90 seg", "2 min", "8 - 12", "4 series".
 * Aquí se convierte todo eso a los números que guarda la app, y se empareja cada nombre
 * con la biblioteca de ejercicios. Está separado de la ruta de IA a propósito: es la
 * parte que se puede probar sin llamar a nadie, y es justo donde se rompen estas cosas.
 */

import { stripAccents } from "@/lib/exerciseSearch";

/** Lo que devuelve el modelo por cada ejercicio, antes de limpiarlo. */
export type RawImportedExercise = {
  name?: unknown;
  sets?: unknown;
  reps?: unknown;
  rest?: unknown;
  notes?: unknown;
  setType?: unknown;
  superset?: unknown;
};

/** Lo que devuelve el modelo por cada día. */
export type RawImportedDay = {
  name?: unknown;
  exercises?: unknown;
};

/** Los tipos de serie que entiende la app. `normal` es el que no hace falta marcar. */
export type SetType = "normal" | "warmup" | "dropset" | "failure";

export type ImportedExercise = {
  /** El nombre tal como venía en el texto o la imagen. */
  name: string;
  sets: number;
  /** Extremo bajo del rango, que es el objetivo que hay que cumplir. */
  reps?: number;
  /** Extremo alto, solo si venía como rango. Sirve para enseñarlo en la revisión. */
  repsMax?: number;
  restSeconds?: number;
  notes?: string;
  setType: SetType;
  /**
   * Número de superserie dentro de SU día, o undefined si va suelto.
   *
   * El modelo devuelve la etiqueta tal como aparece en la rutina ("A", "1", "A1"); aquí se
   * convierte a los números correlativos que usa la app para pintar los colores.
   */
  supersetGroup?: number;
};

export type ImportedDay = {
  /** El nombre del día tal como aparece: "Día 1", "Empuje", "Lunes"... */
  name: string;
  exercises: ImportedExercise[];
};

/**
 * Cómo aparece cada tipo de serie en una rutina escrita.
 *
 * Se mira tanto lo que el modelo diga en `setType` como el texto de las repeticiones y de
 * las notas, porque en una rutina de verdad el dropset no viene en una columna: viene
 * escrito al lado, como "12 + dropset" o "última serie al fallo".
 */
const PISTAS_TIPO: { tipo: SetType; patrones: RegExp }[] = [
  { tipo: "dropset", patrones: /drop\s*-?\s*set|dropset|descendente|series? descendentes?|strip\s*set/i },
  { tipo: "failure", patrones: /al\s*fallo|hasta el fallo|to failure|amrap|maximas|máximas/i },
  { tipo: "warmup", patrones: /calentamiento|warm\s*-?\s*up|aproximaci[oó]n|serie de aproximaci[oó]n/i },
];

/** Series por defecto cuando el texto no lo dice: lo más común en una rutina escrita. */
const SERIES_POR_DEFECTO = 3;
/** Topes de cordura. Un "120 series" es un error de lectura, no una rutina. */
const MAX_SERIES = 20;
const MAX_REPS = 500;
const MAX_DESCANSO = 60 * 60;

function normalizar(texto: string): string {
  return stripAccents(texto).toLowerCase().replace(/\s+/g, " ").trim();
}

/**
 * El descanso en segundos, venga como venga.
 *
 * Los tres formatos que aparecen de verdad en una rutina escrita: "90 seg", "2 min" y
 * "1:30". Un número suelto se lee como segundos salvo que sea pequeño — "2" en la
 * columna de descanso son dos minutos, no dos segundos, y nadie descansa dos segundos.
 */
export function parseRestSeconds(valor: unknown): number | undefined {
  if (typeof valor === "number" && Number.isFinite(valor)) {
    return acotar(Math.round(valor), 0, MAX_DESCANSO);
  }
  if (typeof valor !== "string") return undefined;

  const texto = normalizar(valor);
  if (!texto) return undefined;

  // "1:30" o "1:30 min"
  const reloj = texto.match(/(\d+)\s*:\s*(\d{1,2})/);
  if (reloj) return acotar(+reloj[1] * 60 + +reloj[2], 0, MAX_DESCANSO);

  // "1 min 30", "1 minuto y 30 segundos"
  const mixto = texto.match(/(\d+(?:[.,]\d+)?)\s*(?:min|minuto|minutos|')\D+(\d+)\s*(?:seg|segundo|segundos|s)?\b/);
  if (mixto) return acotar(Math.round(parseFloat(mixto[1].replace(",", ".")) * 60) + +mixto[2], 0, MAX_DESCANSO);

  const numero = texto.match(/(\d+(?:[.,]\d+)?)/);
  if (!numero) return undefined;
  const cantidad = parseFloat(numero[1].replace(",", "."));
  if (!Number.isFinite(cantidad)) return undefined;

  if (/\b(min|minuto|minutos)\b|'/.test(texto)) return acotar(Math.round(cantidad * 60), 0, MAX_DESCANSO);
  if (/\b(seg|segundo|segundos|s)\b|"/.test(texto)) return acotar(Math.round(cantidad), 0, MAX_DESCANSO);

  // Sin unidad: por debajo de 10 son minutos, por encima segundos.
  return acotar(Math.round(cantidad < 10 ? cantidad * 60 : cantidad), 0, MAX_DESCANSO);
}

/**
 * Las repeticiones, que a menudo vienen como rango.
 *
 * De "8 - 12" se guarda el 8: en una rutina el extremo bajo es el objetivo que hay que
 * cumplir, y el alto es hasta dónde puedes llegar antes de subir peso. El alto se conserva
 * aparte para poder enseñarlo en la revisión y que se vea que no se perdió nada.
 *
 * "Al fallo" y "máximas" no son un número: se quedan sin reps, y la persona pone lo que
 * corresponda al entrenar.
 */
export function parseReps(valor: unknown): { reps?: number; repsMax?: number } {
  if (typeof valor === "number" && Number.isFinite(valor)) {
    return { reps: acotar(Math.round(valor), 1, MAX_REPS) };
  }
  if (typeof valor !== "string") return {};

  const texto = normalizar(valor);
  if (!texto || /fallo|maxim|amrap|al\s*max/.test(texto)) return {};

  const rango = texto.match(/(\d+)\s*(?:-|a|\/|hasta)\s*(\d+)/);
  if (rango) {
    const bajo = acotar(+rango[1], 1, MAX_REPS);
    const alto = acotar(+rango[2], 1, MAX_REPS);
    return bajo <= alto ? { reps: bajo, repsMax: alto } : { reps: alto, repsMax: bajo };
  }

  const suelto = texto.match(/(\d+)/);
  return suelto ? { reps: acotar(+suelto[1], 1, MAX_REPS) } : {};
}

/** Las series. "4 series", "4x", "4" — y si no se entiende, tres. */
export function parseSets(valor: unknown): number {
  if (typeof valor === "number" && Number.isFinite(valor)) {
    return acotar(Math.round(valor), 1, MAX_SERIES);
  }
  if (typeof valor === "string") {
    const n = normalizar(valor).match(/(\d+)/);
    if (n) return acotar(+n[1], 1, MAX_SERIES);
  }
  return SERIES_POR_DEFECTO;
}

function acotar(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

/**
 * El tipo de serie, mirando lo que dijo el modelo y también el texto suelto.
 *
 * El orden importa: "dropset al fallo" es un dropset, no una serie al fallo, porque el
 * dropset ya implica llegar al fallo en el último descuelgue.
 */
export function parseSetType(declarado: unknown, ...textos: unknown[]): SetType {
  const candidato = typeof declarado === "string" ? declarado.toLowerCase().trim() : "";
  if (candidato === "dropset" || candidato === "failure" || candidato === "warmup" || candidato === "normal") {
    return candidato;
  }

  const todo = [declarado, ...textos].filter((t): t is string => typeof t === "string").join(" ");
  for (const { tipo, patrones } of PISTAS_TIPO) {
    if (patrones.test(todo)) return tipo;
  }
  return "normal";
}

/**
 * Convierte las etiquetas de superserie en los números correlativos que usa la app.
 *
 * Las rutinas las escriben como "A", "A1/A2", "1", "Superserie 1"... Lo único que importa
 * es qué ejercicios comparten etiqueta, así que se normaliza la etiqueta —quitando el
 * número de orden dentro del grupo— y se numeran los grupos por orden de aparición.
 *
 * Un grupo con un solo ejercicio NO es una superserie: se deja suelto. Pasa cuando el
 * modelo etiqueta cada ejercicio con una letra distinta creyendo que enumera.
 */
export function assignSupersetGroups(etiquetas: (string | undefined)[]): (number | undefined)[] {
  const normalizada = etiquetas.map((e) => {
    if (typeof e !== "string") return undefined;
    // "A1" y "A2" son el mismo grupo A; "superserie 1" es el grupo 1.
    const limpia = normalizar(e).replace(/superserie|superset|bi-?serie|serie combinada/g, "").trim();
    const clave = limpia.match(/^([a-z]+)\s*\d*$/)?.[1] ?? limpia.match(/^(\d+)/)?.[1] ?? limpia;
    return clave || undefined;
  });

  const cuantos = new Map<string, number>();
  normalizada.forEach((k) => { if (k) cuantos.set(k, (cuantos.get(k) ?? 0) + 1); });

  const numeroDe = new Map<string, number>();
  let siguiente = 1;
  return normalizada.map((k) => {
    if (!k || (cuantos.get(k) ?? 0) < 2) return undefined;
    if (!numeroDe.has(k)) numeroDe.set(k, siguiente++);
    return numeroDe.get(k);
  });
}

/** Limpia lo que devolvió el modelo y descarta lo que no tiene nombre. */
export function normalizeImported(crudos: RawImportedExercise[]): ImportedExercise[] {
  return (Array.isArray(crudos) ? crudos : [])
    .map((c): ImportedExercise | null => {
      const name = typeof c.name === "string" ? c.name.trim() : "";
      if (!name) return null;
      const { reps, repsMax } = parseReps(c.reps);
      const notes = typeof c.notes === "string" && c.notes.trim() ? c.notes.trim() : undefined;
      return {
        name, sets: parseSets(c.sets), reps, repsMax, restSeconds: parseRestSeconds(c.rest), notes,
        setType: parseSetType(c.setType, c.reps, c.notes, c.name),
      };
    })
    .filter((e): e is ImportedExercise => e !== null);
}

/**
 * Los días de la rutina, ya limpios.
 *
 * Una rutina subida puede ser un solo día o una semana entera, y eso cambia lo que hay que
 * crear: un día es una rutina, cinco días son cinco rutinas. Si el modelo no separó días
 * pero sí devolvió ejercicios, se tratan como un único día sin nombre — que es el caso de
 * quien pega solo la sesión de hoy.
 *
 * Las superseries se numeran DENTRO de cada día: la "A" del lunes y la "A" del miércoles
 * son grupos distintos.
 */
export function normalizeDays(crudos: RawImportedDay[], sueltos?: RawImportedExercise[]): ImportedDay[] {
  const dias: ImportedDay[] = (Array.isArray(crudos) ? crudos : [])
    .map((d, i): ImportedDay => {
      const ejercicios = normalizeImported((d?.exercises ?? []) as RawImportedExercise[]);
      const grupos = assignSupersetGroups(
        ((d?.exercises ?? []) as RawImportedExercise[])
          .filter((c) => typeof c?.name === "string" && c.name.trim())
          .map((c) => (typeof c.superset === "string" ? c.superset : undefined)),
      );
      ejercicios.forEach((e, j) => { e.supersetGroup = grupos[j]; });
      const nombre = typeof d?.name === "string" && d.name.trim() ? d.name.trim() : `Día ${i + 1}`;
      return { name: nombre, exercises: ejercicios };
    })
    .filter((d) => d.exercises.length > 0);

  if (dias.length > 0) return dias;

  // Sin días pero con ejercicios: es una sesión suelta.
  const unico = normalizeImported(sueltos ?? []);
  const grupos = assignSupersetGroups(
    (sueltos ?? []).filter((c) => typeof c?.name === "string" && c.name.trim())
      .map((c) => (typeof c.superset === "string" ? c.superset : undefined)),
  );
  unico.forEach((e, j) => { e.supersetGroup = grupos[j]; });
  return unico.length > 0 ? [{ name: "Día 1", exercises: unico }] : [];
}

// ---------------------------------------------------------------------------
// Emparejar con la biblioteca
// ---------------------------------------------------------------------------

export type CatalogExercise = { id: string; name: string; slug?: string | null };

export type Match = {
  exercise: CatalogExercise;
  /** 0 a 1. Por debajo de CONFIANZA_MINIMA no se da por bueno. */
  score: number;
};

/**
 * Cuánta coincidencia hace falta para dar un ejercicio por identificado.
 *
 * Preferimos marcar "sin identificar" de más que colar un ejercicio equivocado: una
 * sugerencia que la persona corrige cuesta un toque, pero un ejercicio mal emparejado se
 * cuela en la rutina y no se descubre hasta estar en el gimnasio.
 */
export const CONFIANZA_MINIMA = 0.55;

/** Palabras que no distinguen un ejercicio de otro y ensucian la comparación. */
const VACIAS = new Set(["de", "del", "la", "el", "los", "las", "con", "en", "a", "y", "para", "sobre", "un", "una", "the", "with", "of"]);

function tokens(texto: string): string[] {
  return normalizar(texto)
    .split(/[^a-z0-9]+/)
    .filter((t) => t.length > 1 && !VACIAS.has(t));
}

/**
 * Parecido entre dos nombres, de 0 a 1.
 *
 * Se comparan las palabras que llevan significado, pesando por el lado del texto
 * importado: si el usuario escribió "press banca" y el catálogo tiene "Press de banca con
 * barra", eso es una coincidencia buena aunque al catálogo le sobren palabras. Al revés no
 * — "press" a secas no debería emparejar con nada en concreto.
 */
export function nameSimilarity(importado: string, candidato: string): number {
  const a = tokens(importado);
  const b = new Set(tokens(candidato));
  if (a.length === 0 || b.size === 0) return 0;

  let coinciden = 0;
  for (const t of a) {
    if (b.has(t)) { coinciden += 1; continue; }
    // Coincidencia parcial: "dominadas" con "dominada", "flexion" con "flexiones".
    for (const c of b) {
      if (c.length > 3 && t.length > 3 && (c.startsWith(t) || t.startsWith(c))) { coinciden += 0.8; break; }
    }
  }

  const cobertura = coinciden / a.length;
  // Penaliza que al candidato le sobren muchas palabras: entre "Sentadilla" y "Sentadilla
  // búlgara con mancuernas a una pierna", para "sentadilla" gana la primera.
  const exceso = Math.max(0, b.size - a.length) / (b.size + a.length);
  return Math.max(0, cobertura - exceso * 0.35);
}

/** El mejor candidato de la biblioteca para un nombre importado, o null si ninguno convence. */
export function matchExercise(nombre: string, catalogo: CatalogExercise[]): Match | null {
  let mejor: Match | null = null;

  for (const c of catalogo) {
    const score = Math.max(
      nameSimilarity(nombre, c.name),
      c.slug ? nameSimilarity(nombre, c.slug.replace(/-/g, " ")) : 0,
    );
    if (!mejor || score > mejor.score) mejor = { exercise: c, score };
  }

  return mejor && mejor.score >= CONFIANZA_MINIMA ? mejor : null;
}

// ---------------------------------------------------------------------------
// De lo leído a lo que guarda la app
// ---------------------------------------------------------------------------

/**
 * Qué tipo lleva cada serie de un ejercicio importado.
 *
 * Una rutina escrita marca el ejercicio entero, no cada serie: pone "4x10 + dropset" o
 * "3x8 al fallo". Lo que quiere decir en el gimnasio es distinto según el tipo:
 *
 * - Calentamiento: el ejercicio ENTERO es de calentamiento, así que van todas.
 * - Dropset y al fallo: se hacen en la ÚLTIMA serie. Nadie hace cuatro series seguidas al
 *   fallo; se llega ahí en la de arriba, después de las de trabajo.
 *
 * Es un valor por defecto, no una sentencia: en la revisión se puede cambiar, y dentro de
 * la rutina cada serie se marca una a una como siempre.
 */
export function setTypesFor(sets: number, tipo: SetType): string[] {
  const cuantas = Math.max(1, sets);
  if (tipo === "normal") return Array.from({ length: cuantas }, () => "normal");
  if (tipo === "warmup") return Array.from({ length: cuantas }, () => "warmup");
  return Array.from({ length: cuantas }, (_, i) => (i === cuantas - 1 ? tipo : "normal"));
}

/**
 * Los números de superserie a partir de qué ejercicio va unido al anterior.
 *
 * En la pantalla de revisión las superseries se editan con un eslabón entre dos filas
 * seguidas, que es como funcionan de verdad: una superserie son ejercicios CONSECUTIVOS
 * que se hacen sin descanso en medio. Partir de los eslabones y recalcular los números
 * —en vez de editar los números a mano— hace imposible dejar un grupo roto, con un solo
 * miembro o repartido por la rutina.
 *
 * `enlaces[i]` es si el ejercicio i va unido al i-1; `enlaces[0]` se ignora.
 */
export function supersetGroupsFromLinks(enlaces: boolean[]): (number | undefined)[] {
  const grupos: (number | undefined)[] = enlaces.map(() => undefined);
  let siguiente = 1;
  for (let i = 1; i < enlaces.length; i++) {
    if (!enlaces[i]) continue;
    if (grupos[i - 1] == null) grupos[i - 1] = siguiente++;
    grupos[i] = grupos[i - 1];
  }
  return grupos;
}

/** Al revés: de los números de grupo a los eslabones que enseña la pantalla. */
export function linksFromSupersetGroups(grupos: (number | undefined)[]): boolean[] {
  return grupos.map((g, i) => i > 0 && g != null && g === grupos[i - 1]);
}

/**
 * Cómo se llama la rutina de un día.
 *
 * El día manda —"Día 2 - Espalda" dice más que nada— y el nombre de la rutina se antepone
 * solo si aporta algo. Si el día no tiene nombre propio, se numera... salvo cuando la hoja
 * traía un solo día: ahí "Fuerza · Día 1" sobra y la rutina se llama "Fuerza" y ya está.
 */
export function dayRoutineName(
  nombreRutina: string | null | undefined, nombreDia: string | null | undefined,
  indice: number, totalDias: number,
): string {
  const rutina = (nombreRutina ?? "").trim();
  const dia = (nombreDia ?? "").trim();

  if (dia && rutina) {
    // "Fuerza" + "Fuerza día 2" no se repite; "Fuerza" + "Día 2" sí se junta.
    return normalizar(dia).includes(normalizar(rutina)) ? dia : `${rutina} · ${dia}`;
  }
  if (dia) return dia;
  if (rutina) return totalDias > 1 ? `${rutina} · Día ${indice + 1}` : rutina;
  return `Día ${indice + 1}`;
}
