import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getDefaultTrainerId } from "@/lib/defaultTrainer";

// Solo devuelve a quién asignar al que se registra. Requiere sesión para no exponer
// el id a cualquiera, aunque de por sí no da acceso a nada.
export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "no autenticado" }, { status: 401 });

  return NextResponse.json({ trainerId: await getDefaultTrainerId() });
}
