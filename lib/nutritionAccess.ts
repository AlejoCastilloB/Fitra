/**
 * Quién ve la parte de nutrición.
 *
 * Hay gente que usa FitTrack solo para entrenar. Para ellos, la pestaña de comidas, los
 * recordatorios y las insignias de nutrición no son una función de más: son ruido, y
 * encima el teléfono les suena cuatro veces al día pidiendo una foto del almuerzo que
 * nunca van a registrar.
 *
 * La bandera vive en `users.nutrition_enabled` y la puede cambiar el coach desde su panel
 * o la persona desde sus ajustes.
 */

import type { Achievement } from "@/lib/achievements";

/** La categoría de insignias que desaparece cuando nutrición está apagada. */
export const NUTRITION_CATEGORY = "nutricion";

/**
 * Lee la bandera de una fila de `users` tolerando que la columna todavía no exista.
 *
 * Mientras la migración 008 no haya corrido, PostgREST devuelve la fila sin el campo (o
 * la consulta falla y llega `null`). En los dos casos la respuesta correcta es `true`: la
 * app sigue exactamente como estaba y nadie pierde nada de un día para otro.
 */
export function nutritionEnabledFrom(row: { nutrition_enabled?: boolean | null } | null | undefined): boolean {
  return row?.nutrition_enabled ?? true;
}

/**
 * Las insignias que la persona puede ver.
 *
 * Con nutrición apagada se esconden las de comidas en vez de dejarlas bloqueadas: una
 * insignia que nunca vas a poder desbloquear no motiva, estorba — y además hundiría el
 * porcentaje de completado de alguien que va al día con todo lo suyo.
 */
export function visibleAchievements(all: Achievement[], nutritionEnabled: boolean): Achievement[] {
  if (nutritionEnabled) return all;
  return all.filter((a) => a.category !== NUTRITION_CATEGORY);
}

/** Las claves de insignia que no cuentan cuando nutrición está apagada. */
export function hiddenAchievementKeys(all: Achievement[], nutritionEnabled: boolean): Set<string> {
  if (nutritionEnabled) return new Set();
  return new Set(all.filter((a) => a.category === NUTRITION_CATEGORY).map((a) => a.key));
}
