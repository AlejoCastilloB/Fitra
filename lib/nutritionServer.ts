import { nutritionEnabledFrom } from "@/lib/nutritionAccess";

/**
 * Si esta persona tiene encendida la parte de nutrición.
 *
 * Va en su propio archivo, aparte de lib/nutritionAccess, porque aquello lo importan
 * componentes de cliente y esto solo tiene sentido en el servidor.
 *
 * La consulta pide una sola columna a propósito: mientras la migración 008 no haya
 * corrido devuelve `null` y la respuesta es `true`, o sea, la app tal como estaba.
 */
export async function isNutritionEnabledFor(supabase: any, userId: string): Promise<boolean> {
  const { data } = await supabase.from("users").select("nutrition_enabled").eq("id", userId).single();
  return nutritionEnabledFrom(data as { nutrition_enabled?: boolean | null } | null);
}
