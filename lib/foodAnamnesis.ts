import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { getAppUser } from "@/lib/getAppUser";

/**
 * ¿Ya contestó la anamnesis alimentaria?
 *
 * Se resuelve en el servidor, dentro del mismo request que ya pinta la página. Antes lo
 * preguntaba un componente de cliente que, mientras esperaba, devolvía null: la pantalla
 * quedaba EN BLANCO durante dos viajes al servidor, y solo entonces empezaban los cuatro
 * de la pantalla de nutrición. Y como no distinguía un fallo de red de un "no la ha
 * contestado", cualquier error tapaba la nutrición con el formulario.
 *
 * `cache` lo resuelve una sola vez por request.
 */
export const isFoodAnamnesisDone = cache(async (): Promise<boolean> => {
  const { userId } = await getAppUser();
  if (!userId) return true; // sin sesión no hay nada que preguntar; el layout ya redirige

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("clients").select("food_anamnesis_completed_at").eq("user_id", userId).maybeSingle();

  // Ante un fallo se deja pasar: es mejor que la pantalla de nutrición se vea sin haber
  // contestado, a taparla con un formulario por un problema de red.
  if (error) return true;
  return !!data?.food_anamnesis_completed_at;
});
