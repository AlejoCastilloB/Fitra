import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const DAILY_LIMIT = 10;

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "no autenticado" }, { status: 401 });

  if (!process.env.GEMINI_API_KEY) {
    return NextResponse.json({ error: "falta GEMINI_API_KEY en Vercel" }, { status: 500 });
  }

  const { prompt, imageBase64, mimeType, audioBase64, audioMimeType, minutesAvailable } = await request.json();

  const { data: usageRow } = await supabase
    .from("ai_usage").select("messages_used").eq("user_id", user.id).eq("date", new Date().toISOString().slice(0, 10)).single();

  if ((usageRow?.messages_used ?? 0) >= DAILY_LIMIT) {
    return NextResponse.json({ error: "quota_exceeded", message: `Ya usaste tus ${DAILY_LIMIT} mensajes con Fitra hoy. Vuelve mañana.` }, { status: 429 });
  }

  const MUSCLE_KEYWORDS: Record<string, string[]> = {
    pierna: ["quads", "hamstrings", "glutes", "calves", "adductors", "abductors"],
    cuadriceps: ["quads"], isquios: ["hamstrings"], gluteo: ["glutes"], gemelo: ["calves"], pantorrilla: ["calves"],
    espalda: ["lats", "traps", "upper-back", "spine"], dorsal: ["lats"], trapecio: ["traps"],
    pecho: ["pectorals"], hombro: ["delts"], biceps: ["biceps"], triceps: ["triceps"], brazo: ["biceps", "triceps", "forearms"],
    antebrazo: ["forearms"], abdomen: ["abs"], core: ["abs"], cardio: ["cardio"], gemelos: ["calves"],
  };

  const promptLower = (prompt || "").toLowerCase();
  const targetMuscles = new Set<string>();
  for (const [es, ens] of Object.entries(MUSCLE_KEYWORDS)) {
    if (promptLower.includes(es)) ens.forEach((e) => targetMuscles.add(e));
  }

  const EQUIPMENT_KEYWORDS: Record<string, string[]> = {
    mancuerna: ["dumbbell"], mancuernas: ["dumbbell"], barra: ["barbell", "ez barbell", "olympic barbell"],
    maquina: ["machine", "leverage machine", "smith machine"], polea: ["cable"],
    "peso corporal": ["bodyweight", "body weight"], banda: ["band", "resistance band"], kettlebell: ["kettlebell"],
  };
  const targetEquipment = new Set<string>();
  for (const [es, ens] of Object.entries(EQUIPMENT_KEYWORDS)) {
    if (promptLower.includes(es)) ens.forEach((e) => targetEquipment.add(e));
  }

  let candidatesQuery = supabase
    .from("exercises")
    .select("id, name, muscle_group, equipment, measurement_type")
    .or(`trainer_id.is.null,trainer_id.eq.${user.id}`);

  if (targetMuscles.size > 0) {
    candidatesQuery = candidatesQuery.in("muscle_group", Array.from(targetMuscles));
  }
  if (targetEquipment.size > 0) {
    candidatesQuery = candidatesQuery.or(Array.from(targetEquipment).map((e) => `equipment.ilike.%${e}%`).join(","));
  }

  const { data: filtered } = await candidatesQuery.limit(200);
  let candidates = filtered ?? [];
  if (candidates.length < 15) {
    const { data: fallback } = await supabase
      .from("exercises").select("id, name, muscle_group, equipment, measurement_type")
      .or(`trainer_id.is.null,trainer_id.eq.${user.id}`).limit(150);
    candidates = [...candidates, ...(fallback ?? [])].filter((c, i, arr) => arr.findIndex((x) => x.id === c.id) === i);
  }

  if (!candidates || candidates.length === 0) {
    return NextResponse.json({ error: "Tu biblioteca de ejercicios está vacía, no puedo armar una rutina todavía." }, { status: 400 });
  }

  const candidateList = candidates.map((c) => `${c.id}|${c.name}|${c.muscle_group}|${c.equipment}|${c.measurement_type}`).join("\n");

  const minutes = Number(minutesAvailable) || null;
  const timeBudgetLine = minutes
    ? `\nTIEMPO DISPONIBLE: el usuario tiene ${minutes} minutos para esta sesión. Cada serie efectiva (sin contar calentamiento) ocupa en promedio ~2.5 minutos entre ejecutarla y descansar — usá ese criterio para calcular cuántos ejercicios y series totales entran realmente en ${minutes} minutos, en vez de usar siempre el mismo rango por defecto. Si el tiempo es corto (30 min o menos), preferí menos ejercicios con superseries o dropsets en vez de recortar todos los ejercicios a 1-2 series.`
    : "";

  const systemPrompt = `Eres Fitra, el asistente de entrenamiento de FitTrack. Tu tono es positivo y motivador. Vas a armar una rutina de entrenamiento según lo que te pida el usuario (por texto, foto o audio).

REGLA CRÍTICA: solo puedes usar ejercicios de esta lista (formato id|nombre|músculo|equipo|tipo_medición), nunca inventes ejercicios ni uses ids que no estén aquí:
${candidateList}
${timeBudgetLine}

Devuelve SOLO un JSON válido (sin markdown, sin texto extra) con este formato exacto:
{"name": string, "exercises": [{"exercise_id": string, "superset_group": number | null, "sets": [{"set_type": "normal", "reps": number, "weight": number}]}]}

Para ejercicios de tiempo usa {"set_type":"normal","time_sec":number}, para distancia {"set_type":"normal","distance_m":number}, para tiempo y distancia ambos campos. El "exercise_id" debe ser EXACTAMENTE uno de los ids de la lista.

CÓMO ARMAR LA RUTINA:
- Balance entre grupos musculares: si el usuario menciona varios grupos o una zona amplia (ej: "brazos" = bíceps + tríceps + antebrazo), reparte el volumen entre TODOS esos subgrupos, no te concentres solo en uno.
- Frecuencia por grupo muscular dentro de la misma sesión: no seguidos más de 2 ejercicios enfocados en el mismo grupo muscular principal salvo que el usuario lo pida explícitamente (ej: "solo pierna hoy") — intercalá grupos para que el cuerpo tenga tiempo de recuperar entre series indirectas del mismo músculo.
- Reparto de series por sesión: la cantidad de series de cada grupo muscular debe ser proporcional a cuántos grupos distintos se estén trabajando esa sesión (si son 2 grupos, cada uno se lleva más series; si son 5 grupos, menos series por grupo para no pasarte del tiempo/volumen razonable).
- Evita elegir dos ejercicios casi idénticos (mismo patrón de movimiento, mismo ángulo).
- Superseries (bi-series): cuando el tiempo disponible es limitado, o cuando dos ejercicios trabajan grupos musculares antagonistas o no compiten por el mismo equipo, podés agruparlos como superserie asignándoles el mismo número en "superset_group" (ej: ambos con superset_group: 1). Los ejercicios que NO son parte de ninguna superserie llevan "superset_group": null. No abuses de esto — solo cuando de verdad ahorra tiempo real.
- Dropset: si el equipo disponible es limitado y no hay suficiente variedad de ejercicios, preferí usar menos ejercicios distintos pero marcar una de sus series como "set_type":"dropset" en vez de repetir el mismo movimiento dos veces. Ejemplo de sets con dropset: [{"set_type":"normal","reps":10,"weight":20},{"set_type":"normal","reps":10,"weight":20},{"set_type":"dropset","reps":8,"weight":14}].
- Arma entre 4 y 8 ejercicios según lo pedido, con 3-4 series cada uno salvo que el usuario pida otra cosa o el tiempo disponible indique otro número.

Responde en español neutro colombiano/latinoamericano, sin voseo ni modismos argentinos.`;

  const parts: any[] = [{ text: prompt || "Arma una rutina general de cuerpo completo." }];
  if (imageBase64) parts.push({ inline_data: { mime_type: mimeType || "image/jpeg", data: imageBase64 } });
  if (audioBase64) parts.push({ inline_data: { mime_type: audioMimeType || "audio/webm", data: audioBase64 } });

  let geminiRes;
  try {
    geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          system_instruction: { parts: [{ text: systemPrompt }] },
          contents: [{ parts }],
          generationConfig: { temperature: 0.9 },
        }),
      }
    );
  } catch (e: any) {
    return NextResponse.json({ error: `fallo de conexión con Gemini: ${e.message}` }, { status: 502 });
  }

  if (!geminiRes.ok) {
    const errBody = await geminiRes.text();
    return NextResponse.json({ error: `Gemini respondió ${geminiRes.status}: ${errBody.slice(0, 300)}` }, { status: 502 });
  }

  const geminiData = await geminiRes.json();
  const rawText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text ?? "{}";
  const cleaned = rawText.replace(/```json|```/g, "").trim();

  let parsed;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    return NextResponse.json({ error: `no pude interpretar la respuesta de Gemini: ${cleaned.slice(0, 200)}` }, { status: 500 });
  }

  const validIds = new Set(candidates.map((c) => c.id));
  const byId = Object.fromEntries(candidates.map((c) => [c.id, c]));

  const exercises = (parsed.exercises ?? [])
    .filter((e: any) => validIds.has(e.exercise_id))
    .map((e: any) => ({
      id: e.exercise_id,
      name: byId[e.exercise_id].name,
      muscle_group: byId[e.exercise_id].muscle_group,
      measurement_type: byId[e.exercise_id].measurement_type,
      sets: e.sets ?? [],
      superset_group: typeof e.superset_group === "number" ? e.superset_group : undefined,
    }));

  await supabase.rpc("increment_ai_usage", { p_user_id: user.id });
  const { data: newUsage } = await supabase.from("ai_usage").select("messages_used").eq("user_id", user.id).eq("date", new Date().toISOString().slice(0, 10)).single();

  return NextResponse.json({ name: parsed.name || "Rutina generada", exercises, remaining: DAILY_LIMIT - (newUsage?.messages_used ?? 0) });
}
