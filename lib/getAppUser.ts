import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { getAuthenticatedUser } from "@/lib/supabase/getAuthenticatedUser";

export type AppUserRow = { role: string; theme_pref: string | null; display_name: string | null };

// El layout y la página de /app necesitaban lo mismo (quién es el usuario y su fila
// en `users`) y cada uno lo pedía por su cuenta: dos validaciones de token contra el
// servidor de Supabase y dos consultas a `users` por cada navegación. `cache` de React
// lo resuelve una sola vez por request y el segundo llamado sale gratis.
export const getAppUser = cache(async (): Promise<{ userId: string | null; row: AppUserRow | null }> => {
  const supabase = await createClient();
  const user = await getAuthenticatedUser(supabase);
  if (!user) return { userId: null, row: null };

  const { data: row } = await supabase
    .from("users")
    .select("role, theme_pref, display_name")
    .eq("id", user.id)
    .single();

  return { userId: user.id, row: (row as AppUserRow) ?? null };
});
