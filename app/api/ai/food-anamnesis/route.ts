import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { checkAiQuota, incrementAiUsage } from "@/lib/aiUsage";

const DAILY_LIMIT = 3;

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "no autenticado" }, { status: 401 });

  const { likes, dislikes, text, audioBase64, audioMimeType } = await request.json();
  const likesArr: string[] = Array.isArray(likes) ? likes : [];
  const dislikesArr: string[] = Array.isArray(dislikes) ? dislikes : [];

  // Si no dio nada de contexto real, no vale la pena gastar una llamada a Gemini —
  // igual se marca completada la anamnesis para no volver a pedirla.
  if (likesArr.length === 0 && dislikesArr.length === 0 && !text && !audioBase64) {
    const { error: skipError } = await supabase.from("clients").update({
      food_likes: [], food_dislikes: [], food_anamnesis_completed_at: new Date().toISOString(),
    }).eq("user_id", user.id);
    if (skipError) return NextResponse.json({ error: skipError.message }, { status: 500 });
    return NextResponse.json({ ok: true, profileSummary: null });
  }

  if (!process.env.GEMINI_API_KEY) {
    return NextResponse.json({ error: "falta GEMINI_API_KEY en Vercel" }, { status: 500 });
  }

  const { exceeded } = await checkAiQuota(supabase, user.id, "food_anamnesis", DAILY_LIMIT);
  if (exceeded) {
    return NextResponse.json({ error: "quota_exceeded", message: "Ya completaste tu anamnesis alimentaria hoy, inténtalo de nuevo mañana." }, { status: 429 });
  }

  const parts: any[] = [
    {
      text: `Eres Fitra, el asistente nutricional de FitTrack. El usuario está completando su anamnesis alimentaria antes de empezar a usar la app — te cuenta qué le gusta comer, qué evita, y un resumen (texto o nota de voz) de lo que suele comer en una semana típica (desayunos, almuerzos, cenas, snacks).

Tu tarea es condensar todo esto en un perfil alimentario corto (máximo 6 líneas), concreto y útil, que OTRO asistente de IA va a leer después para dar sugerencias de comida realistas — menciona patrones típicos de sus comidas, preferencias claras, y qué evitar. No repitas literalmente lo que dijo, sintetiza.

Le gusta: ${likesArr.length > 0 ? likesArr.join(", ") : "no especificó"}.
No le gusta / evita: ${dislikesArr.length > 0 ? dislikesArr.join(", ") : "no especificó"}.

Devuelve SOLO un JSON válido (sin markdown, sin texto extra) con este formato exacto: {"profile_summary": string}. Usa español neutro colombiano/latinoamericano, sin voseo ni modismos argentinos.`,
    },
  ];

  if (audioBase64) parts.push({ inline_data: { mime_type: audioMimeType || "audio/webm", data: audioBase64 } });
  if (text) parts.push({ text: `Lo que contó el usuario sobre su semana típica: ${text}` });

  let geminiRes;
  try {
    geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent?key=${process.env.GEMINI_API_KEY}`,
      { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ contents: [{ parts }] }) }
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

  const { error } = await supabase.from("clients").update({
    food_likes: likesArr,
    food_dislikes: dislikesArr,
    food_profile: parsed.profile_summary || null,
    food_anamnesis_completed_at: new Date().toISOString(),
  }).eq("user_id", user.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const today = new Date().toISOString().slice(0, 10);
  await incrementAiUsage(supabase, user.id, "food_anamnesis", today);

  return NextResponse.json({ ok: true, profileSummary: parsed.profile_summary });
}
