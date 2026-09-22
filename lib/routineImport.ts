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
};

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
};

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

/** Limpia lo que devolvió el modelo y descarta lo que no tiene nombre. */
export function normalizeImported(crudos: RawImportedExercise[]): ImportedExercise[] {
  return (Array.isArray(crudos) ? crudos : [])
    .map((c): ImportedExercise | null => {
      const name = typeof c.name === "string" ? c.name.trim() : "";
      if (!name) return null;
      const { reps, repsMax } = parseReps(c.reps);
      const notes = typeof c.notes === "string" && c.notes.trim() ? c.notes.trim() : undefined;
      return { name, sets: parseSets(c.sets), reps, repsMax, restSeconds: parseRestSeconds(c.rest), notes };
    })
    .filter((e): e is ImportedExercise => e !== null);
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
