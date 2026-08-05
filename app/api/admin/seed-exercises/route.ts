import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const maxDuration = 60;

const BASE = "https://cdn.jsdelivr.net/gh/JahelCuadrado/ExerciseGymGifsDB@v1.1.0";

export async function GET(request: Request) {
  const secret = new URL(request.url).searchParams.get("secret");
  if (secret !== process.env.SEED_SECRET) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const muscles: string[] = await fetch(`${BASE}/api/es/muscles.json`).then((r) => r.json());

  // descarga todos los grupos musculares en paralelo
  const results = await Promise.all(
    muscles.map((muscle) =>
      fetch(`${BASE}/api/es/muscles/${muscle}.json`).then((r) => r.json())
    )
  );

  const rows = results.flat().map((ex: any) => ({
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

  // upsert en lotes de 300 para no pasarnos de tamaño por request
  let inserted = 0;
  for (let i = 0; i < rows.length; i += 300) {
    const batch = rows.slice(i, i + 300);
    const { error } = await supabase.from("exercises").upsert(batch, { onConflict: "slug" });
    if (error) return NextResponse.json({ error: error.message, insertedSoFar: inserted }, { status: 500 });
    inserted += batch.length;
  }

  return NextResponse.json({ ok: true, inserted });
}
