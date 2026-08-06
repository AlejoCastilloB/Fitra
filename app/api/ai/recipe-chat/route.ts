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

  const { messages, imageBase64, mimeType } = await request.json();

  const { data: usageRow } = await supabase
    .from("ai_usage")
    .select("messages_used")
    .eq("user_id", user.id)
    .eq("date", new Date().toISOString().slice(0, 10))
    .single();

  if ((usageRow?.messages_used ?? 0) >= DAILY_LIMIT) {
    return NextResponse.json({ error: "quota_exceeded", message: "Ya usaste tus 5 mensajes con la IA de Alejo hoy. Vuelve mañana." }, { status: 429 });
  }

  const systemPrompt = `Eres la IA de Alejo, el asistente de nutrición de FitTrack. Tu especialidad es sugerir recetas prácticas y saludables según los ingredientes que el usuario tiene disponibles. Sé breve, directo y cálido. Cuando sugieras una receta, incluye: nombre, ingredientes con cantidades aproximadas, pasos breves, y una estimación de calorías y macros. Si el usuario manda una foto de ingredientes, identifícalos primero antes de sugerir. Responde en español neutro latinoamericano, sin modismos regionales marcados.`;

  const contents = messages.map((m: any) => ({
    role: m.role === "assistant" ? "model" : "user",
    parts: [{ text: m.content }],
  }));

  if (imageBase64) {
    contents[contents.length - 1].parts.push({ inline_data: { mime_type: mimeType || "image/jpeg", data: imageBase64 } });
  }

  let geminiRes;
  try {
    geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          system_instruction: { parts: [{ text: systemPrompt }] },
          contents,
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
  const reply = geminiData.candidates?.[0]?.content?.parts?.[0]?.text ?? "No pude generar una respuesta, intenta de nuevo.";

  await supabase.rpc("increment_ai_usage", { p_user_id: user.id });

  const { data: newUsage } = await supabase.from("ai_usage").select("messages_used").eq("user_id", user.id).eq("date", new Date().toISOString().slice(0, 10)).single();

  return NextResponse.json({ reply, remaining: DAILY_LIMIT - (newUsage?.messages_used ?? 0) });
}
