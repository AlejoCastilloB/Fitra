import { createClient } from "@supabase/supabase-js";

// Cliente con la service role key — se salta RLS. Solo se usa server-side, y solo
// después de confirmar quién hace la petición (sesión real + filtro por trainer_id/rol),
// nunca a partir de datos que mande el cliente.
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}
