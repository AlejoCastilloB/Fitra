import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireTrainer } from "@/lib/requireTrainer";
import { coachOwnsClient } from "@/lib/coachClientWorkouts";

export const dynamic = "force-dynamic";

/**
 * Guarda lo que el entrenador escribe sobre un cliente: la descripción de su plan (que el
 * cliente lee) y las notas privadas del entrenador.
 *
 * Va por una ruta de servidor y no directo desde el navegador porque el RLS de `clients`
 * no deja al entrenador escribir en la fila de otra persona: haciéndolo desde el navegador
 * la escritura se rechazaba y —como el error no se miraba— la pantalla decía "Guardado"
 * igual. Aquí se usa la service role, así que el permiso lo comprueba este archivo:
 * `coachOwnsClient` antes de tocar nada.
 */
export async function PATCH(request: Request) {
  const { user, error } = await requireTrainer();
  if (error) return error;

  const { clientId, trainingDescription, trainerNotes } = await request.json();
  if (!clientId || typeof clientId !== "string") {
    return NextResponse.json({ error: "falta el cliente" }, { status: 400 });
  }

  if (!(await coachOwnsClient(user!.id, clientId))) {
    return NextResponse.json({ error: "ese cliente no es tuyo" }, { status: 403 });
  }

  // Solo se escribe lo que venga en el cuerpo: así esta misma ruta sirve para guardar la
  // descripción sin pisar las notas, y al revés.
  const cambios: Record<string, string | null> = {};
  if (trainingDescription !== undefined) cambios.training_description = String(trainingDescription).trim() || null;
  if (trainerNotes !== undefined) cambios.trainer_notes = String(trainerNotes);

  if (Object.keys(cambios).length === 0) {
    return NextResponse.json({ error: "nada que guardar" }, { status: 400 });
  }

  const { error: dbError } = await createAdminClient()
    .from("clients").update(cambios).eq("user_id", clientId).eq("trainer_id", user!.id);

  if (dbError) return NextResponse.json({ error: dbError.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
