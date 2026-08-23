import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const DAILY_LIMIT = 20;

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "no autenticado" }, { status: 401 });

  if (!process.env.GEMINI_API_KEY) {
    return NextResponse.json({ error: "falta GEMINI_API_KEY en Vercel" }, { status: 500 });
  }

    const { imageBase64, mimeType, note, audioBase64, audioMimeType, photoUrl } = await request.json();

  const today = new Date().toISOString().slice(0, 10);
  const DAILY_GOALS = { kcal: 2200, protein: 150, carbs: 220, fat: 70 };
  const { data: todayLogs } = await supabase.from("nutrition_logs").select("kcal, protein, carbs, fat").eq("client_id", user.id).gte("date", `${today}T00:00:00`);
  const consumed = (todayLogs ?? []).reduce((a, l) => ({
    kcal: a.kcal + (l.kcal ?? 0), protein: a.protein + (l.protein ?? 0), carbs: a.carbs + (l.carbs ?? 0), fat: a.fat + (l.fat ?? 0),
  }), { kcal: 0, protein: 0, carbs: 0, fat: 0 });

  const { data: usageRow } = await supabase
    .from("ai_usage")
    .select("messages_used")
    .eq("user_id", user.id)
    .eq("date", new Date().toISOString().slice(0, 10))
    .single();

  if ((usageRow?.messages_used ?? 0) >= DAILY_LIMIT) {
    return NextResponse.json({ error: "quota_exceeded", message: `Ya usaste tus ${DAILY_LIMIT} análisis de Fitra hoy. Vuelve mañana o regístralo manual.` }, { status: 429 });
  }

  const parts: any[] = [
    {
        text: `Eres Fitra, el asistente nutricional de FitTrack. Tu tono es siempre positivo, cercano y motivador — nunca juzgas al usuario. Analiza esta comida y devuelve SOLO un JSON válido (sin markdown, sin texto extra) con este formato exacto: {"food_name": string, "portion": string, "kcal": number, "protein": number, "carbs": number, "fat": number, "fiber": number, "sugar": number, "sodium": number, "coach_tip": string}. "portion" describe la cantidad estimada de forma clara y breve. "coach_tip" es un mensaje corto (máximo 2 líneas), cálido y motivador, considerando que al usuario le quedan hoy aproximadamente ${Math.round(DAILY_GOALS.kcal - consumed.kcal)} kcal, ${Math.round(DAILY_GOALS.protein - consumed.protein)}g de proteína, ${Math.round(DAILY_GOALS.carbs - consumed.carbs)}g de carbohidratos y ${Math.round(DAILY_GOALS.fat - consumed.fat)}g de grasa por consumir — sugiere algo simple para su próxima comida si tiene sentido. Si el usuario dio contexto extra en texto o audio, úsalo para ajustar tu estimación. Usa español neutro colombiano/latinoamericano, sin voseo ni modismos argentinos.`,
    },
  ];

  if (imageBase64) parts.push({ inline_data: { mime_type: mimeType || "image/jpeg", data: imageBase64 } });
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

  await supabase.rpc("increment_ai_usage", { p_user_id: user.id });

    const { data: log, error } = await supabase.from("nutrition_logs").insert({
    client_id: user.id,
    photo_url: photoUrl || null,
    note: note || null,
    food_name: parsed.food_name,
    portion: parsed.portion,
    kcal: parsed.kcal,
    protein: parsed.protein,
    carbs: parsed.carbs,
    fat: parsed.fat,
    fiber: parsed.fiber,
    sugar: parsed.sugar,
    sodium: parsed.sodium,
    source: "photo_ai",
  }).select().single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const { data: newUsage } = await supabase.from("ai_usage").select("messages_used").eq("user_id", user.id).eq("date", new Date().toISOString().slice(0, 10)).single();

    return NextResponse.json({ ok: true, log, coachTip: parsed.coach_tip, remaining: DAILY_LIMIT - (newUsage?.messages_used ?? 0) });
}
