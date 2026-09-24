"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { POPULAR_EXERCISE_KEYWORDS } from "@/lib/popularExercises";
import { searchTerms, termFilter, rankResults } from "@/lib/exerciseSearch";

export type FoundExercise = {
  id: string;
  name: string;
  media_url?: string;
  measurement_type: string;
  muscle_group?: string;
  equipment?: string;
  trainer_id?: string | null;
};

export type ExerciseFilterOptions = { muscles: string[]; equipment: string[] };

// Sacar los valores distintos obliga a leer la tabla entera, así que se hace una sola vez
// por sesión y se comparte entre el buscador del entreno y el de armar rutina.
let optionsCache: ExerciseFilterOptions | null = null;
let optionsPromise: Promise<ExerciseFilterOptions> | null = null;

/** Cuántas filas devuelve PostgREST como mucho en una consulta. */
const PAGINA = 1000;
/** Tope de páginas. Si algún día una consulta devolviera siempre la misma, el bucle no
 *  terminaría nunca; con esto para y se queda con lo que haya podido leer. */
const MAX_PAGINAS = 25;

function loadFilterOptions(): Promise<ExerciseFilterOptions> {
  if (optionsPromise) return optionsPromise;
  optionsPromise = (async () => {
    const supabase = createClient();
    const muscles = new Set<string>();
    const equipment = new Set<string>();

    // Página a página. Una consulta normal devuelve como mucho 1000 filas —el tope de
    // PostgREST— y no avisa: llegan 1000 y parece que eso es todo. Con 1345 ejercicios en
    // la biblioteca, los últimos 345 no aportaban nada a estos desplegables, así que
    // grupos musculares y materiales que solo existen ahí NO aparecían como filtro. Desde
    // fuera se veía como si a la app le faltaran ejercicios.
    for (let pagina = 0; pagina < MAX_PAGINAS; pagina++) {
      const desde = pagina * PAGINA;
      const { data, error } = await supabase
        .from("exercises").select("muscle_group, equipment").order("id").range(desde, desde + PAGINA - 1);
      if (error || !data || data.length === 0) break;
      data.forEach((r: any) => {
        if (r.muscle_group) muscles.add(r.muscle_group);
        if (r.equipment) equipment.add(r.equipment);
      });
      if (data.length < PAGINA) break;
    }
    optionsCache = {
      muscles: Array.from(muscles).sort(),
      equipment: Array.from(equipment).sort(),
    };
    return optionsCache;
  })();
  return optionsPromise;
}

export function useExerciseFilterOptions(): ExerciseFilterOptions {
  const [options, setOptions] = useState<ExerciseFilterOptions>(optionsCache ?? { muscles: [], equipment: [] });

  useEffect(() => {
    let cancelled = false;
    loadFilterOptions().then((o) => { if (!cancelled) setOptions(o); });
    return () => { cancelled = true; };
  }, []);

  return options;
}

/**
 * Busca ejercicios por nombre, grupo muscular y equipamiento. Los tres filtros se
 * combinan (AND): "pecho + mancuerna" trae solo los de pecho que usen mancuerna.
 * Sin ningún filtro muestra los populares, para no traer la tabla entera.
 */
export function useExerciseSearch({ search, muscle, equipment, reloadKey = 0 }: { search: string; muscle: string; equipment: string; reloadKey?: number }) {
  const [results, setResults] = useState<FoundExercise[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    const t = setTimeout(async () => {
      const supabase = createClient();
      let query = supabase.from("exercises").select("id, name, media_url, measurement_type, muscle_group, equipment, trainer_id");

      const terms = searchTerms(search);
      const hasFilter = terms.length > 0 || !!muscle || !!equipment;

      // Cada palabra se exige por separado (los .or encadenados se combinan con AND),
      // así "tumbado" o "curl tumbado" encuentran "Curl femoral tumbado".
      terms.forEach((term) => { query = query.or(termFilter(term)); });
      if (muscle) query = query.eq("muscle_group", muscle);
      if (equipment) query = query.eq("equipment", equipment);
      // Sin ningún filtro nunca se trae el catálogo entero: solo una selección corta.
      if (!hasFilter) query = query.or(POPULAR_EXERCISE_KEYWORDS.map((k) => `name.ilike.%${k}%`).join(","));

      const { data } = await query.order("name").limit(hasFilter ? 80 : 15);
      if (cancelled) return;
      setResults(rankResults((data ?? []) as FoundExercise[], search));
      setLoading(false);
    }, 250);

    return () => { cancelled = true; clearTimeout(t); };
  }, [search, muscle, equipment, reloadKey]);

  return { results, loading };
}
