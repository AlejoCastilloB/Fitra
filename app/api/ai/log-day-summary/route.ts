import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { checkAiQuota, incrementAiUsage } from "@/lib/aiUsage";
import { getPersonalizationContext, personalizationPromptBlock } from "@/lib/aiPersonalization";

const DAILY_LIMIT = 20;

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "no autenticado" }, { status: 401 });

  if (!process.env.GEMINI_API_KEY) {
    return NextResponse.json({ error: "falta GEMINI_API_KEY en Vercel" }, { status: 500 });
  }

  const { text, audioBase64, audioMimeType } = await request.json();
  if (!text && !audioBase64) {
    return NextResponse.json({ error: "no diste texto ni audio" }, { status: 400 });
  }

  const today = new Date().toISOString().slice(0, 10);

  const { exceeded } = await checkAiQuota(supabase, user.id, "food_log", DAILY_LIMIT);
  if (exceeded) {
    return NextResponse.json({ error: "quota_exceeded", message: `Ya usaste tus ${DAILY_LIMIT} análisis de Fitra hoy. Vuelve mañana o regístralo manual.` }, { status: 429 });
  }

  const personalization = personalizationPromptBlock(await getPersonalizationContext(supabase, user.id));

  const parts: any[] = [
    {
      text: `Eres Fitra, el asistente nutricional de FitTrack. El usuario está cerrando su día y te está contando, en un solo mensaje (texto o nota de voz), TODO lo que comió hoy — de forma informal, quizás desordenada, mencionando varias comidas juntas (ej: "en el desayuno comí huevos con arepa, a media mañana una manzana, y en el almuerzo arroz con pollo y ensalada").

Tu tarea es separar ese relato en una entrada individual por cada comida o alimento distinto que mencione, y para cada una estimar kcal y macros con la información dada — no pidas más detalles, trabaja con lo que tengas usando tu mejor estimación de porciones típicas cuando no las especifique.

Devuelve SOLO un JSON válido (sin markdown, sin texto extra) con este formato exacto: {"meals": [{"food_name": string, "portion": string, "kcal": number, "protein": number, "carbs": number, "fat": number, "fiber": number, "sugar": number, "sodium": number}], "coach_tip": string}. Si el usuario menciona una sola comida, el array debe tener un solo elemento. "coach_tip" es un mensaje corto (máximo 2 líneas), cálido y motivador sobre el día completo. Usa español neutro colombiano/latinoamericano, sin voseo ni modismos argentinos.
${personalization ? `\nLo que sabes de este usuario en particular:\n${personalization}\n` : ""}`,
    },
  ];

  if (audioBase64) parts.push({ inline_data: { mime_type: audioMimeType || "audio/webm", data: audioBase64 } });
  if (text) parts.push({ text: `Lo que contó el usuario: ${text}` });

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

  const meals: any[] = Array.isArray(parsed.meals) ? parsed.meals : [];
  if (meals.length === 0) {
    return NextResponse.json({ error: "Fitra no pudo identificar ninguna comida en lo que contaste." }, { status: 422 });
  }

  const { data: logs, error } = await supabase.from("nutrition_logs").insert(
    meals.map((m) => ({
      client_id: user.id,
      note: text || null,
      food_name: m.food_name,
      portion: m.portion,
      kcal: m.kcal,
      protein: m.protein,
      carbs: m.carbs,
      fat: m.fat,
      fiber: m.fiber,
      sugar: m.sugar,
      sodium: m.sodium,
      source: "voice_summary",
    }))
  ).select();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const usedNow = await incrementAiUsage(supabase, user.id, "food_log", today);

  return NextResponse.json({ ok: true, logs, count: logs?.length ?? 0, coachTip: parsed.coach_tip, remaining: DAILY_LIMIT - usedNow });
}
