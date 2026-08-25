import type { SupabaseClient } from "@supabase/supabase-js";

// getUser() valida el token contra el servidor de Supabase por red — un solo hiccup de
// conexión (timeout, 5xx pasajero) hace que devuelva null aunque la sesión sea válida,
// y eso ya provocó cierres de sesión falsos. Antes de asumir que el usuario no tiene
// sesión, se reintenta una vez.
export async function getAuthenticatedUser(supabase: SupabaseClient) {
  const first = await supabase.auth.getUser();
  if (first.data.user) return first.data.user;

  await new Promise((r) => setTimeout(r, 400));
  const second = await supabase.auth.getUser();
  return second.data.user;
}
