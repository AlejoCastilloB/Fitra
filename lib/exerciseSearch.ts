// Letras que en español pueden llevar tilde o virgulilla. En el patrón de búsqueda se
// reemplazan por "_" (comodín de un carácter en LIKE), así "tumbado" encuentra
// "túmbado" y "biceps" encuentra "bíceps" sin depender de la extensión unaccent.
const ACCENTABLE = /[aeiouncAEIOUNC]/g;

/** Quita tildes de lo que escribe el usuario, para comparar en el cliente. */
export function stripAccents(value: string): string {
  return value.normalize("NFD").replace(/[̀-ͯ]/g, "");
}

function escapeLike(value: string): string {
  return value.replace(/[%_\\]/g, (m) => `\\${m}`);
}

/**
 * Divide lo que escribió el usuario en palabras sueltas. Buscar "leg curl tumbado" o
 * "tumbado curl" tiene que dar lo mismo: cada palabra se exige por separado, en
 * cualquier orden y en cualquier parte del nombre, en vez de pedir la frase literal.
 */
export function searchTerms(query: string): string[] {
  return stripAccents(query)
    .toLowerCase()
    .split(/[\s,._/-]+/)
    .map((w) => w.trim())
    .filter((w) => w.length >= 2)
    .slice(0, 6);
}

/**
 * Filtro PostgREST para una palabra: coincide en el nombre (español) o en el slug, que
 * viene del catálogo original en inglés — por eso "leg curl" encuentra el mismo
 * ejercicio que "curl femoral" sin guardar traducciones aparte.
 */
export function termFilter(term: string): string {
  const pattern = `%${escapeLike(term).replace(ACCENTABLE, "_")}%`;
  return `name.ilike.${pattern},slug.ilike.${pattern}`;
}

/** Ordena dejando arriba lo que empieza por lo buscado y luego lo más corto. */
export function rankResults<T extends { name: string }>(rows: T[], query: string): T[] {
  const q = stripAccents(query).toLowerCase().trim();
  if (!q) return rows;
  return [...rows].sort((a, b) => {
    const an = stripAccents(a.name).toLowerCase();
    const bn = stripAccents(b.name).toLowerCase();
    const aStarts = an.startsWith(q) ? 0 : 1;
    const bStarts = bn.startsWith(q) ? 0 : 1;
    if (aStarts !== bStarts) return aStarts - bStarts;
    return an.length - bn.length;
  });
}
