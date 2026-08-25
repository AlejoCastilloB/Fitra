import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

// El RLS de "users" solo deja a cada quien leer su propia fila, así que el join
// clients -> users(display_name, email) desde el cliente del navegador siempre
// vuelve null para los clientes de un entrenador. Esta ruta usa la service role
// para resolver esos nombres, verificando primero que quien pregunta sea
// realmente el entrenador dueño de esos clientes.
export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "no autenticado" }, { status: 401 });

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("clients")
    .select("user_id, status, created_at, users(display_name, email)")
    .eq("trainer_id", user.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const clients = (data ?? []).map((c: any) => ({
    user_id: c.user_id,
    status: c.status,
    created_at: c.created_at,
    display_name: c.users?.display_name ?? null,
    email: c.users?.email ?? null,
  }));

  return NextResponse.json({ clients });
}
