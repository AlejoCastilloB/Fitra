import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireTrainer } from "@/lib/requireTrainer";

export async function POST(request: Request) {
  const { user, error } = await requireTrainer();
  if (error) return error;

  const body = await request.json();
  const admin = createAdminClient();
  const { data, error: dbError } = await admin.from("exercises").insert({
    trainer_id: user!.id,
    name: body.name,
    muscle_group: body.muscleGroup,
    equipment: body.equipment,
    measurement_type: body.measurementType,
    description: body.description,
    annotations: body.annotations,
    media_url: body.mediaUrl || null,
    video_url: body.videoUrl || null,
    counts_toward_exercise_id: body.countsTowardExerciseId || null,
  }).select().single();

  if (dbError) return NextResponse.json({ error: dbError.message }, { status: 500 });
  return NextResponse.json({ exercise: data });
}
