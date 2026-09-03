import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireTrainer } from "@/lib/requireTrainer";
import { getDefaultTrainerId } from "@/lib/defaultTrainer";

/**
 * Vincula a este entrenador todos los clientes que quedaron sin entrenador asignado.
 *
 * Restringido al entrenador por defecto a propósito: si mañana hay más de uno, que
 * cualquiera pueda quedarse con los clientes sueltos sería un problema.
 */
export async function POST() {
  const { user, error } = await requireTrainer();
  if (error) return error;

  const defaultTrainerId = await getDefaultTrainerId();
  if (!defaultTrainerId || defaultTrainerId !== user!.id) {
    return NextResponse.json({ error: "solo el entrenador principal puede hacer esto" }, { status: 403 });
  }

  const admin = createAdminClient();
  const { data, error: updateError } = await admin
    .from("clients")
    .update({ trainer_id: user!.id })
    .is("trainer_id", null)
    .select("user_id");

  if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 });

  return NextResponse.json({ ok: true, claimed: (data ?? []).length });
}
