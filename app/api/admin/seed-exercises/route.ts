import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const BASE = "https://cdn.jsdelivr.net/gh/JahelCuadrado/ExerciseGymGifsDB@v1.1.0";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const secret = url.searchParams.get("secret");
  const muscle = url.searchParams.get("muscle");

  if (secret !== process.env.SEED_SECRET) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // sin ?muscle= devuelve la lista de músculos para que el admin sepa qué pedir
  if (!muscle) {
    const muscles = await fetch(`${BASE}/api/es/muscles.json`).then((r) => r.json());
    return NextResponse.json({ muscles });
  }

  const exercises: any[] = await fetch(`${BASE}/api/es/muscles/${muscle}.json`).then((r) => r.json());

  const rows = exercises.map((ex) => ({
    slug: ex.slug,
    name: ex.name,
    muscle_group: ex.muscle,
    body_part: ex.bodyPart,
    equipment: ex.equipment,
    category: ex.category,
    secondary_muscles: ex.secondaryMuscles ?? [],
    instructions: ex.instructions ?? [],
    measurement_type: "reps_weight",
    media_url: ex.gifUrl,
    trainer_id: null,
  }));

  const { error } = await supabase.from("exercises").upsert(rows, { onConflict: "slug" });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true, muscle, inserted: rows.length });
}
