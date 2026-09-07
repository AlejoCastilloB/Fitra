import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireTrainer } from "@/lib/requireTrainer";
import { uploadExerciseMedia } from "@/lib/exerciseMedia";

// Se edita con la service role porque el RLS de "exercises" solo deja tocar las filas
// propias, y hace falta poder corregir también la biblioteca compartida (trainer_id null).
//
// Pero eso salta el RLS por completo, así que el límite lo pone este archivo: se permite
// editar la biblioteca compartida y los ejercicios propios, y NADA MÁS. Sin esta
// comprobación, cualquier cuenta con rol de entrenador podía reescribir el nombre, el GIF
// y el `counts_toward_exercise_id` de los ejercicios privados de otro entrenador —y ese
// último campo decide cómo se agrupa el volumen en las estadísticas de sus clientes.
export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const { user, error } = await requireTrainer();
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

  const { data: target } = await admin.from("exercises").select("trainer_id").eq("id", params.id).maybeSingle();
  if (!target) return NextResponse.json({ error: "ese ejercicio no existe" }, { status: 404 });
  if (target.trainer_id !== null && target.trainer_id !== user!.id) {
    return NextResponse.json({ error: "ese ejercicio es de otro entrenador" }, { status: 403 });
  }

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
