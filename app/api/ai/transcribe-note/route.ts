import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { checkAiQuota, incrementAiUsage } from "@/lib/aiUsage";

const DAILY_LIMIT = 10;

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "no autenticado" }, { status: 401 });

  if (!process.env.GEMINI_API_KEY) {
    return NextResponse.json({ error: "falta GEMINI_API_KEY en Vercel" }, { status: 500 });
  }

  const { audioBase64, audioMimeType } = await request.json();
  if (!audioBase64) return NextResponse.json({ error: "falta audio" }, { status: 400 });

  const { exceeded, today } = await checkAiQuota(supabase, user.id, "transcribe", DAILY_LIMIT);
  if (exceeded) {
    return NextResponse.json({ error: "quota_exceeded", message: `Ya usaste tus ${DAILY_LIMIT} mensajes con Fitra hoy.` }, { status: 429 });
  }

  const prompt = `Transcribe esta nota de voz de un entrenador sobre un ejercicio, y devuélvela como una nota escrita clara y ordenada (corrige muletillas, ordena la idea, mantén el sentido técnico exacto de lo que dijo). Máximo 3-4 líneas. Responde SOLO con el texto final de la nota, sin comillas ni explicación adicional, en español neutro colombiano/latinoamericano sin voseo.`;

  let geminiRes;
  try {
    geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }, { inline_data: { mime_type: audioMimeType || "audio/webm", data: audioBase64 } }] }],
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
  const text = geminiData.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ?? "";

  const usedNow = await incrementAiUsage(supabase, user.id, "transcribe", today);

  return NextResponse.json({ text, remaining: DAILY_LIMIT - usedNow });
}
