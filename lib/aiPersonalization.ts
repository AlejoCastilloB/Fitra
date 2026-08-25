import type { SupabaseClient } from "@supabase/supabase-js";

export type PersonalizationContext = {
  dietaryRestrictions: string | null;
  kitchenEquipment: string[];
  frequentFoods: string[];
  favoriteMeals: string[];
};

export async function getPersonalizationContext(supabase: SupabaseClient, userId: string): Promise<PersonalizationContext> {
  const since = new Date(Date.now() - 30 * 86400000).toISOString();

  const [{ data: clientRow }, { data: recentLogs }, { data: savedMeals }] = await Promise.all([
    supabase.from("clients").select("dietary_restrictions, kitchen_equipment").eq("user_id", userId).single(),
    supabase.from("nutrition_logs").select("food_name").eq("client_id", userId).gte("date", since).limit(200),
    supabase.from("saved_meals").select("name").eq("client_id", userId).limit(20),
  ]);

  const freq: Record<string, number> = {};
  (recentLogs ?? []).forEach((l: any) => {
    if (!l.food_name) return;
    freq[l.food_name] = (freq[l.food_name] || 0) + 1;
  });
  const frequentFoods = Object.entries(freq)
    .filter(([, count]) => count > 1)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([name]) => name);

  const favoriteMeals = (savedMeals ?? []).map((m: any) => m.name).filter(Boolean).slice(0, 6);

  return {
    dietaryRestrictions: clientRow?.dietary_restrictions || null,
    kitchenEquipment: clientRow?.kitchen_equipment || [],
    frequentFoods,
    favoriteMeals,
  };
}

// Se usa tal cual dentro de los prompts de Gemini para que las sugerencias reflejen
// gustos y restricciones reales del usuario en vez de ser genéricas.
export function personalizationPromptBlock(ctx: PersonalizationContext): string {
  const lines: string[] = [];
  if (ctx.dietaryRestrictions) {
    lines.push(`Restricciones alimentarias del usuario (respétalas siempre, nunca sugieras algo que las incumpla): ${ctx.dietaryRestrictions}.`);
  }
  if (ctx.kitchenEquipment.length > 0) {
    lines.push(`Utensilios de cocina disponibles: ${ctx.kitchenEquipment.join(", ")} — prioriza sugerencias que se puedan preparar con esto.`);
  }
  if (ctx.frequentFoods.length > 0) {
    lines.push(`Comidas que el usuario registra seguido (son sus gustos reales, úsalas de referencia para sugerir cosas parecidas o variaciones, no para repetirlas literal siempre): ${ctx.frequentFoods.join(", ")}.`);
  }
  if (ctx.favoriteMeals.length > 0) {
    lines.push(`Comidas que el usuario guardó como favoritas: ${ctx.favoriteMeals.join(", ")}.`);
  }
  return lines.join("\n");
}
