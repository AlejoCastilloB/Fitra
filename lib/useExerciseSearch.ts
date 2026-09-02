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

function loadFilterOptions(): Promise<ExerciseFilterOptions> {
  if (optionsPromise) return optionsPromise;
  optionsPromise = (async () => {
    const supabase = createClient();
    const { data } = await supabase.from("exercises").select("muscle_group, equipment");
    const muscles = new Set<string>();
    const equipment = new Set<string>();
    (data ?? []).forEach((r: any) => {
      if (r.muscle_group) muscles.add(r.muscle_group);
      if (r.equipment) equipment.add(r.equipment);
    });
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
