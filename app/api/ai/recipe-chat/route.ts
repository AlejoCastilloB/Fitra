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

  const { messages, imageBase64, mimeType } = await request.json();

  const { exceeded, today } = await checkAiQuota(supabase, user.id, "chat", DAILY_LIMIT);
  if (exceeded) {
    return NextResponse.json({ error: "quota_exceeded", message: `Ya usaste tus ${DAILY_LIMIT} mensajes con Fitra hoy. Vuelve mañana.` }, { status: 429 });
  }

  const { data: clientRow } = await supabase.from("clients").select("daily_kcal_goal, daily_protein_goal, daily_carbs_goal, daily_fat_goal").eq("user_id", user.id).single();
  const DAILY_GOALS = clientRow?.daily_kcal_goal
    ? { kcal: clientRow.daily_kcal_goal, protein: clientRow.daily_protein_goal, carbs: clientRow.daily_carbs_goal, fat: clientRow.daily_fat_goal }
    : DEFAULT_DAILY_GOALS;
  const { data: todayLogs } = await supabase.from("nutrition_logs").select("kcal, protein, carbs, fat").eq("client_id", user.id).gte("date", `${today}T00:00:00`);
  const consumed = (todayLogs ?? []).reduce((a, l) => ({
    kcal: a.kcal + (l.kcal ?? 0), protein: a.protein + (l.protein ?? 0), carbs: a.carbs + (l.carbs ?? 0), fat: a.fat + (l.fat ?? 0),
  }), { kcal: 0, protein: 0, carbs: 0, fat: 0 });
  const remainingMacros = {
    kcal: Math.max(0, DAILY_GOALS.kcal - consumed.kcal),
    protein: Math.max(0, DAILY_GOALS.protein - consumed.protein),
    carbs: Math.max(0, DAILY_GOALS.carbs - consumed.carbs),
    fat: Math.max(0, DAILY_GOALS.fat - consumed.fat),
  };

  const personalization = personalizationPromptBlock(await getPersonalizationContext(supabase, user.id));

  const systemPrompt = `Eres Fitra, el asistente de nutrición de FitTrack. Tu personalidad es siempre positiva, cercana y motivadora — guías al usuario, nunca lo juzgas. Tu especialidad es sugerir recetas prácticas y saludables según los ingredientes que el usuario tiene disponibles, y siempre buscas ayudarlo a completar sus metas del día de forma inteligente.

Al usuario le quedan hoy aproximadamente: ${Math.round(remainingMacros.kcal)} kcal, ${Math.round(remainingMacros.protein)}g de proteína, ${Math.round(remainingMacros.carbs)}g de carbohidratos y ${Math.round(remainingMacros.fat)}g de grasa por consumir. Usa este dato para orientar tus sugerencias cuando tenga sentido.
${personalization ? `\nLo que sabes de este usuario en particular:\n${personalization}\n` : ""}

Cuando sugieras UNA receta concreta, responde primero con 2-3 líneas conversacionales y cálidas, y al final agrega un bloque con este formato EXACTO (sin explicarlo, va oculto para el usuario):
\`\`\`recipe
{"title": string, "kcal": number, "protein": number, "carbs": number, "fat": number, "ingredients": string[], "steps": string[]}
\`\`\`
Si todavía no tienes suficiente información para sugerir una receta concreta, no incluyas el bloque, solo conversa y pregunta.

Responde siempre en español neutro colombiano/latinoamericano. Nunca uses voseo ni modismos argentinos (evita palabras como "vos", "dale", "che", "tenés" en su forma voseante, "sos"); usa formas neutras como "tienes", "puedes", "genial". El tono debe sentirse natural para cualquier hispanohablante de Latinoamérica.`;

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
      { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ system_instruction: { parts: [{ text: systemPrompt }] }, contents }) }
    );
  } catch (e: any) {
    return NextResponse.json({ error: `fallo de conexión con Gemini: ${e.message}` }, { status: 502 });
  }

  if (!geminiRes.ok) {
    const errBody = await geminiRes.text();
    return NextResponse.json({ error: `Gemini respondió ${geminiRes.status}: ${errBody.slice(0, 300)}` }, { status: 502 });
  }

  const geminiData = await geminiRes.json();
  const rawText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text ?? "No pude generar una respuesta, intenta de nuevo.";

  let recipe = null;
  let reply = rawText;
  // El bloque ```recipe se saca del texto visible sí o sí, incluso si el JSON
  // de adentro sale mal formado — si no, el usuario ve el bloque crudo en el chat.
  const match = rawText.match(/```recipe\s*([\s\S]*?)```/);
  if (match) {
    reply = rawText.replace(match[0], "").trim();
    try {
      const parsed = JSON.parse(match[1].trim());
      const isValidRecipe =
        parsed && typeof parsed === "object" && !Array.isArray(parsed) &&
        typeof parsed.title === "string" &&
        typeof parsed.kcal === "number" && typeof parsed.protein === "number" &&
        typeof parsed.carbs === "number" && typeof parsed.fat === "number" &&
        Array.isArray(parsed.ingredients) && Array.isArray(parsed.steps);
      if (isValidRecipe) recipe = parsed;
    } catch {}
    if (!reply) reply = recipe ? "Aquí tienes una receta 👇" : "No pude armar la receta bien, ¿lo intentamos de nuevo?";
  }

  const usedNow = await incrementAiUsage(supabase, user.id, "chat", today);

  return NextResponse.json({ reply, recipe, remaining: DAILY_LIMIT - usedNow });
}
