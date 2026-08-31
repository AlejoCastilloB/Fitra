import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { checkAiQuota, incrementAiUsage } from "@/lib/aiUsage";
import { DAILY_GOALS as DEFAULT_DAILY_GOALS } from "@/lib/nutritionGoals";
import { getPersonalizationContext, personalizationPromptBlock } from "@/lib/aiPersonalization";

const DAILY_LIMIT = 20;

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "no autenticado" }, { status: 401 });

  if (!process.env.GEMINI_API_KEY) {
    return NextResponse.json({ error: "falta GEMINI_API_KEY en Vercel" }, { status: 500 });
  }

  const { imageBase64, mimeType, note, audioBase64, audioMimeType, photoUrl, logId } = await request.json();

  // Corrección de un registro ya existente: se reanaliza la MISMA foto sumándole el
  // contexto nuevo que da el usuario, y al final se actualiza esa fila en vez de crear otra.
  let existingLog: any = null;
  if (logId) {
    const { data } = await supabase
      .from("nutrition_logs")
      .select("id, photo_url, note, food_name, portion, kcal, protein, carbs, fat")
      .eq("id", logId)
      .eq("client_id", user.id)
      .single();
    if (!data) return NextResponse.json({ error: "no encontramos ese registro" }, { status: 404 });
    existingLog = data;
  }

  const today = new Date().toISOString().slice(0, 10);
  const { data: clientRow } = await supabase.from("clients").select("daily_kcal_goal, daily_protein_goal, daily_carbs_goal, daily_fat_goal").eq("user_id", user.id).single();
  const DAILY_GOALS = clientRow?.daily_kcal_goal
    ? { kcal: clientRow.daily_kcal_goal, protein: clientRow.daily_protein_goal, carbs: clientRow.daily_carbs_goal, fat: clientRow.daily_fat_goal }
    : DEFAULT_DAILY_GOALS;
  const { data: todayLogs } = await supabase.from("nutrition_logs").select("kcal, protein, carbs, fat").eq("client_id", user.id).gte("date", `${today}T00:00:00`);
  const consumed = (todayLogs ?? []).reduce((a, l) => ({
    kcal: a.kcal + (l.kcal ?? 0), protein: a.protein + (l.protein ?? 0), carbs: a.carbs + (l.carbs ?? 0), fat: a.fat + (l.fat ?? 0),
  }), { kcal: 0, protein: 0, carbs: 0, fat: 0 });

  const { exceeded } = await checkAiQuota(supabase, user.id, "food_log", DAILY_LIMIT);
  if (exceeded) {
    return NextResponse.json({ error: "quota_exceeded", message: `Ya usaste tus ${DAILY_LIMIT} análisis de Fitra hoy. Vuelve mañana o regístralo manual.` }, { status: 429 });
  }

  const personalization = personalizationPromptBlock(await getPersonalizationContext(supabase, user.id));

  const parts: any[] = [
    {
        text: `Eres Fitra, el asistente nutricional de FitTrack. Tu tono es siempre positivo, cercano y motivador — nunca juzgas al usuario.

Antes de calcular nada, MIDE la porción que de verdad aparece en la foto — este es el paso que más se te suele olvidar:
- Cuenta las unidades discretas que veas (ej: "cuento 4 albóndigas", "cuento 7 rodajas de batata", "1 huevo entero") en vez de asumir cuántas "debería" haber en un plato típico de ese platillo.
- Fíjate en cuánto del plato está cubierto y qué tan alto está apilada la comida — un plato con comida solo en el centro NO es la misma porción que un plato lleno hasta el borde, aunque sea la misma receta.
- Usa el tamaño del plato, los cubiertos o la mano de la persona (si aparecen) como referencia de escala.
- Dos fotos del mismo tipo de platillo pueden tener cantidades muy distintas — nunca reutilices una porción "estándar" de memoria, calcula específicamente sobre lo que ves en ESTA imagen, y si el plato se ve claramente más lleno o más vacío que un plato normal, que el cálculo lo refleje.

Devuelve SOLO un JSON válido (sin markdown, sin texto extra) con este formato exacto: {"food_name": string, "portion": string, "kcal": number, "protein": number, "carbs": number, "fat": number, "fiber": number, "sugar": number, "sodium": number, "coach_tip": string}. "portion" debe listar las cantidades contadas de cada componente (ej: "4 albóndigas medianas, media taza de arroz, 3 rodajas de batata con mantequilla, 1 huevo duro"), no una descripción genérica — los números de kcal/macros deben ser consistentes con esa lista, no con una porción típica. "coach_tip" es un mensaje corto (máximo 2 líneas), cálido y motivador, considerando que al usuario le quedan hoy aproximadamente ${Math.round(DAILY_GOALS.kcal - consumed.kcal)} kcal, ${Math.round(DAILY_GOALS.protein - consumed.protein)}g de proteína, ${Math.round(DAILY_GOALS.carbs - consumed.carbs)}g de carbohidratos y ${Math.round(DAILY_GOALS.fat - consumed.fat)}g de grasa por consumir — sugiere algo simple para su próxima comida si tiene sentido, ojalá acorde a lo que sabes de sus gustos. Si el usuario dio contexto extra en texto o audio, úsalo para ajustar tu estimación. Usa español neutro colombiano/latinoamericano, sin voseo ni modismos argentinos.
${personalization ? `\nLo que sabes de este usuario en particular:\n${personalization}\n` : ""}`,
    },
  ];

  let effectiveImage: { data: string; mime: string } | null =
    imageBase64 ? { data: imageBase64, mime: mimeType || "image/jpeg" } : null;

  if (!effectiveImage && existingLog?.photo_url) {
    try {
      const photoRes = await fetch(existingLog.photo_url);
      if (photoRes.ok) {
        const buf = Buffer.from(await photoRes.arrayBuffer());
        effectiveImage = { data: buf.toString("base64"), mime: photoRes.headers.get("content-type") || "image/jpeg" };
      }
    } catch {
      // sin la foto original igual se puede recalcular con el texto previo y la corrección
    }
  }

  if (existingLog) {
    parts.push({
      text: `Este es un ANÁLISIS PREVIO tuyo que el usuario quiere corregir: ${JSON.stringify({
        food_name: existingLog.food_name, portion: existingLog.portion,
        kcal: existingLog.kcal, protein: existingLog.protein, carbs: existingLog.carbs, fat: existingLog.fat,
      })}.${existingLog.note ? ` El contexto que ya había dado era: "${existingLog.note}".` : ""} A continuación viene una corrección o un dato que faltaba. Vuelve a calcular TODO el registro teniendo en cuenta esa corrección; no la ignores ni te limites a repetir tu estimación anterior.`,
    });
  }

  if (effectiveImage) parts.push({ inline_data: { mime_type: effectiveImage.mime, data: effectiveImage.data } });
  if (audioBase64) parts.push({ inline_data: { mime_type: audioMimeType || "audio/webm", data: audioBase64 } });
  if (note) parts.push({ text: `Nota adicional del usuario: ${note}` });

  let geminiRes;
  try {
    geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contents: [{ parts }] }),
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

  const values = {
    food_name: parsed.food_name,
    portion: parsed.portion,
    kcal: parsed.kcal,
    protein: parsed.protein,
    carbs: parsed.carbs,
    fat: parsed.fat,
    fiber: parsed.fiber,
    sugar: parsed.sugar,
    sodium: parsed.sodium,
  };

  const { data: log, error } = existingLog
    ? await supabase.from("nutrition_logs").update({
        ...values,
        note: [existingLog.note, note].filter(Boolean).join(" · ") || null,
      }).eq("id", existingLog.id).eq("client_id", user.id).select().single()
    : await supabase.from("nutrition_logs").insert({
        ...values,
        client_id: user.id,
        photo_url: photoUrl || null,
        note: note || null,
        source: "photo_ai",
      }).select().single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const usedNow = await incrementAiUsage(supabase, user.id, "food_log", today);

  return NextResponse.json({ ok: true, log, coachTip: parsed.coach_tip, remaining: DAILY_LIMIT - usedNow });
}
