import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const BASE = "https://cdn.jsdelivr.net/gh/JahelCuadrado/ExerciseGymGifsDB@v1.1.0";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const secret = url.searchParams.get("secret");
  const muscle = url.searchParams.get("muscle");

  if (secret !== process.env.SEED_SECRET) {
    return NextResponse.json({ error: "unauthorized", reason: "secret_mismatch" }, { status: 401 });
  }

  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json({ error: "falta SUPABASE_SERVICE_ROLE_KEY en Vercel" }, { status: 500 });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  if (!muscle) {
    try {
      const r = await fetch(`${BASE}/api/es/muscles.json`);
      if (!r.ok) {
        return NextResponse.json({ error: `jsDelivr respondió ${r.status}` }, { status: 502 });
      }
      const muscles = await r.json();
      return NextResponse.json({ muscles });
    } catch (e: any) {
      return NextResponse.json({ error: `fallo al conectar con jsDelivr: ${e.message}` }, { status: 502 });
    }
  }

  try {
    const r = await fetch(`${BASE}/api/es/muscles/${muscle}.json`);
    if (!r.ok) {
      return NextResponse.json({ error: `jsDelivr respondió ${r.status} para ${muscle}` }, { status: 502 });
    }
    const exercises: any[] = await r.json();

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
  } catch (e: any) {
    return NextResponse.json({ error: `excepción: ${e.message}` }, { status: 500 });
  }
}
