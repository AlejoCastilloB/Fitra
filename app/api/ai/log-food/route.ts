import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const DAILY_LIMIT = 5;

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "no autenticado" }, { status: 401 });

  if (!process.env.GEMINI_API_KEY) {
    return NextResponse.json({ error: "falta GEMINI_API_KEY en Vercel" }, { status: 500 });
  }

  const { imageBase64, mimeType, note } = await request.json();

  const { data: usageRow } = await supabase
    .from("ai_usage")
    .select("messages_used")
    .eq("user_id", user.id)
    .eq("date", new Date().toISOString().slice(0, 10))
    .single();

  if ((usageRow?.messages_used ?? 0) >= DAILY_LIMIT) {
    return NextResponse.json({ error: "quota_exceeded", message: "Ya usaste tus 5 análisis de la IA de Alejo hoy. Vuelve mañana o regístralo manual." }, { status: 429 });
  }

  const parts: any[] = [
    { text: `Eres la IA de Alejo, el asistente nutricional de FitTrack. Analiza esta comida y devuelve SOLO un JSON válido (sin markdown, sin texto extra) con este formato exacto: {"kcal": number, "protein": number, "carbs": number, "fat": number, "fiber": number, "sugar": number, "sodium": number, "food_name": string}. Estima lo mejor posible.` },
  ];
  if (imageBase64) parts.push({ inline_data: { mime_type: mimeType || "image/jpeg", data: imageBase64 } });
  if (note) parts.push({ text: `Nota del usuario: ${note}` });

  let geminiRes;
  try {
    geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
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
    photo_url: null,
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

  return NextResponse.json({ ok: true, log: { ...log, food_name: parsed.food_name }, remaining: DAILY_LIMIT - (newUsage?.messages_used ?? 0) });
}
