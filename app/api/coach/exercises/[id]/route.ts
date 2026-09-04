import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireTrainer } from "@/lib/requireTrainer";
import { uploadExerciseMedia } from "@/lib/exerciseMedia";

// Cualquier entrenador autenticado puede editar cualquier ejercicio, incluyendo
// los de la biblioteca compartida (trainer_id null) — el RLS normal de "exercises"
// no lo permitiría (solo deja tocar filas donde trainer_id = auth.uid()), así que
// esto usa la service role a propósito. Es una decisión consciente: se prioriza
// poder corregir nombres/vínculos de la biblioteca sobre aislar ediciones por dueño.
export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const { error } = await requireTrainer();
  if (error) return error;

  const body = await request.json();

  // El GIF llega en base64 y se sube acá con la service role, porque desde el navegador
  // la política del bucket lo rechazaba.
  let mediaUrl: string | null = body.mediaUrl || null;
  if (body.mediaBase64) {
    const uploaded = await uploadExerciseMedia(body.mediaBase64, body.mediaType);
    if ("error" in uploaded) return NextResponse.json({ error: `no pudimos subir la imagen: ${uploaded.error}` }, { status: 400 });
    mediaUrl = uploaded.url;
  }

  const admin = createAdminClient();
  const { data, error: dbError } = await admin.from("exercises").update({
    name: body.name,
    muscle_group: body.muscleGroup,
    equipment: body.equipment,
    measurement_type: body.measurementType,
    description: body.description,
    annotations: body.annotations,
    media_url: mediaUrl,
    video_url: body.videoUrl || null,
    counts_toward_exercise_id: body.countsTowardExerciseId || null,
  }).eq("id", params.id).select().single();

  if (dbError) return NextResponse.json({ error: dbError.message }, { status: 500 });
  return NextResponse.json({ exercise: data });
}
