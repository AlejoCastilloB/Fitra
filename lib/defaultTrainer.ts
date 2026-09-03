import { createAdminClient } from "@/lib/supabase/admin";

/** Entrenador al que se asigna todo el que se registra sin invitación. */
export const DEFAULT_TRAINER_EMAIL =
  process.env.NEXT_PUBLIC_DEFAULT_TRAINER_EMAIL || "topero2008@gmail.com";

/**
 * Resuelve el id del entrenador por defecto con la service role.
 *
 * No se puede hacer desde el navegador: el RLS de "users" solo deja leer la fila propia,
 * así que la búsqueda por correo le devolvía vacío a quien se estaba registrando y el
 * cliente terminaba creado con trainer_id nulo — invisible en el panel del entrenador.
 */
export async function getDefaultTrainerId(): Promise<string | null> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("users")
    .select("id")
    .eq("email", DEFAULT_TRAINER_EMAIL)
    .eq("role", "trainer")
    .maybeSingle();
  return data?.id ?? null;
}
