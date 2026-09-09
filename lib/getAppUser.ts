import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { getAuthenticatedUser } from "@/lib/supabase/getAuthenticatedUser";
import { nutritionEnabledFrom } from "@/lib/nutritionAccess";

export type AppUserRow = { role: string; theme_pref: string | null; display_name: string | null; timezone: string | null };

// El layout y la página de /app necesitaban lo mismo (quién es el usuario y su fila
// en `users`) y cada uno lo pedía por su cuenta: dos validaciones de token contra el
// servidor de Supabase y dos consultas a `users` por cada navegación. `cache` de React
// lo resuelve una sola vez por request y el segundo llamado sale gratis.
export const getAppUser = cache(async (): Promise<{ userId: string | null; row: AppUserRow | null; nutritionEnabled: boolean }> => {
  const supabase = await createClient();
  const user = await getAuthenticatedUser(supabase);
  if (!user) return { userId: null, row: null, nutritionEnabled: true };

  // Dos consultas y no una sola con todas las columnas, a propósito. PostgREST no devuelve
  // la fila "a medias": si se pide una columna que todavía no existe, se pierde la fila
  // ENTERA y con ella el rol, el tema y la zona horaria. Mientras la migración 008 no haya
  // corrido, esta segunda consulta falla sola y todo lo demás sigue llegando.
  // Van en paralelo, así que no cuestan un viaje de más.
  const [{ data: row }, { data: prefs }] = await Promise.all([
    supabase.from("users").select("role, theme_pref, display_name, timezone").eq("id", user.id).single(),
    supabase.from("users").select("nutrition_enabled").eq("id", user.id).single(),
  ]);

  return {
    userId: user.id,
    row: (row as AppUserRow) ?? null,
    nutritionEnabled: nutritionEnabledFrom(prefs as { nutrition_enabled?: boolean | null } | null),
  };
});
