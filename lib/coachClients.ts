import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export type CoachClient = {
  user_id: string;
  status: string | null;
  display_name: string | null;
  email: string | null;
};

/**
 * Clientes del entrenador autenticado, resueltos en el servidor.
 *
 * El RLS de "users" solo deja leer la fila propia, así que el nombre de los clientes
 * necesita la service role. Se hace acá y no con un fetch desde el navegador porque
 * ese fetch fallaba en silencio: cualquier error dejaba la lista vacía y la interfaz
 * decía "no tienes clientes" o no ofrecía a nadie a quien asignar la rutina.
 */
export const getCoachClients = cache(async (): Promise<CoachClient[]> => {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("clients")
    .select("user_id, status, users(display_name, email)")
    .eq("trainer_id", user.id);

  if (error) throw new Error(`no pudimos cargar tus clientes: ${error.message}`);

  return (data ?? []).map((c: any) => ({
    user_id: c.user_id,
    status: c.status ?? null,
    display_name: c.users?.display_name ?? null,
    email: c.users?.email ?? null,
  }));
});
