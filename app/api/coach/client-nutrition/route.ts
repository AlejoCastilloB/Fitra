import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireTrainer } from "@/lib/requireTrainer";
import { coachOwnsClient } from "@/lib/coachClientWorkouts";

export const dynamic = "force-dynamic";

/**
 * Enciende o apaga la parte de nutrición de un cliente.
 *
 * Va por el servidor con la service role porque el RLS de `users` no deja a nadie escribir
 * en la fila de otra persona: desde el navegador la escritura se rechazaría en silencio.
 * El permiso lo comprueba este archivo — `requireTrainer` y después `coachOwnsClient`—,
 * que es lo único que separa a un entrenador de la fila de un cliente ajeno.
 */
export async function PATCH(request: Request) {
  const { user, error } = await requireTrainer();
  if (error) return error;

  const { clientId, enabled } = await request.json();
  if (!clientId || typeof clientId !== "string") {
    return NextResponse.json({ error: "falta el cliente" }, { status: 400 });
  }
  if (typeof enabled !== "boolean") {
    return NextResponse.json({ error: "falta si va encendida o apagada" }, { status: 400 });
  }

  if (!(await coachOwnsClient(user!.id, clientId))) {
    return NextResponse.json({ error: "ese cliente no es tuyo" }, { status: 403 });
  }

  const { error: dbError } = await createAdminClient()
    .from("users").update({ nutrition_enabled: enabled }).eq("id", clientId);

  if (dbError) {
    // El caso más probable es que la migración 008 no haya corrido todavía.
    return NextResponse.json({ error: dbError.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true, enabled });
}
