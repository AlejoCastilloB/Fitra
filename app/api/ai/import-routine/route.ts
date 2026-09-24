import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { checkAiQuota, incrementAiUsage } from "@/lib/aiUsage";
import { normalizeImported, matchExercise, type CatalogExercise } from "@/lib/routineImport";

const DAILY_LIMIT = 10;

/** Tope del texto pegado. Una rutina entera cabe de sobra; más que eso es otra cosa. */
const MAX_TEXTO = 12_000;
/** Tope de la imagen en base64, unos 4 MB de foto. */
const MAX_IMAGEN_BASE64 = 6_000_000;

/**
 * El encargo, escrito para que el modelo no improvise.
 *
 * Dos cosas se le dicen explícitamente porque son las que aparecen en cualquier rutina
 * escrita y las que más se malinterpretan: el descanso puede venir como "90 seg" o como
 * "2 min", y las repeticiones como rango ("8 - 12"). NO se le pide que las convierta: que
 * devuelva el texto tal cual lo lee y ya lo normaliza lib/routineImport, que es código con
 * pruebas en vez de una instrucción que el modelo puede saltarse.
 */
const INSTRUCCIONES = `Eres un lector de rutinas de gimnasio. Te dan el texto o la captura de pantalla de una rutina y extraes los ejercicios.

Devuelve SOLO un objeto JSON válido, sin explicaciones y sin markdown, con esta forma exacta:
{"name": "nombre de la rutina si aparece, si no null", "exercises": [{"name": "...", "sets": "...", "reps": "...", "rest": "...", "notes": "..."}]}

Reglas:
- "name" de cada ejercicio: el nombre tal como aparece, sin añadir ni traducir. Si está en inglés, déjalo en inglés.
- "sets": el número de series. Si no aparece, null.
- "reps": las repeticiones TAL CUAL aparecen. Pueden venir como un número ("10"), como un rango ("8 - 12") o como texto ("al fallo"). No las conviertas ni elijas un valor del rango: copia lo que pone.
- "rest": el descanso TAL CUAL aparece. Puede venir como "90 seg", "90s", "2 min", "1:30". No lo conviertas a segundos: copia lo que pone. Si no aparece, null.
- "notes": la descripción, técnica o indicación del ejercicio si la hay. Si no, null.
- Respeta el ORDEN en el que aparecen.
- Si una fila es un encabezado, un día de la semana o un total, NO es un ejercicio: omítela.
- Si no reconoces ningún ejercicio, devuelve {"name": null, "exercises": []}.`;

export const dynamic = "force-dynamic";

/** Cuántas filas devuelve PostgREST como mucho en una consulta. */
const PAGINA = 1000;
/** Tope de páginas. Si algún día una consulta devolviera siempre la misma, el bucle no
 *  terminaría nunca; con esto para y se queda con lo que haya podido leer. */
const MAX_PAGINAS = 25;

/**
 * El catálogo entero, página a página.
 *
 * Una consulta normal devuelve como mucho 1000 filas: es el tope de PostgREST, y no avisa
 * — simplemente llegan 1000 y parece que eso es todo lo que hay. Con una biblioteca de más
 * de mil ejercicios, el emparejado no vería los últimos y los daría por "sin identificar"
 * sin que nada lo delatara.
 */
async function cargarCatalogo(supabase: any): Promise<CatalogExercise[]> {
  const todos: CatalogExercise[] = [];
  for (let pagina = 0; pagina < MAX_PAGINAS; pagina++) {
    const desde = pagina * PAGINA;
    const { data, error } = await supabase
      .from("exercises").select("id, name, slug").order("id").range(desde, desde + PAGINA - 1);
    if (error || !data || data.length === 0) break;
    todos.push(...(data as CatalogExercise[]));
    if (data.length < PAGINA) break;
  }
  return todos;
}

/**
 * Lee una rutina desde texto pegado o una captura y la devuelve lista para revisar.
 *
 * El emparejado con la biblioteca se hace AQUÍ y no en el navegador: para acertar hace
 * falta comparar contra el catálogo entero, y mandarlo al teléfono serían cientos de
 * kilobytes en cada importación.
 */
export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "no autenticado" }, { status: 401 });

  if (!process.env.GEMINI_API_KEY) {
    return NextResponse.json({ error: "falta GEMINI_API_KEY en Vercel" }, { status: 500 });
  }

  const { text, imageBase64, mimeType } = await request.json();

  const texto = typeof text === "string" ? text.trim() : "";
  const imagen = typeof imageBase64 === "string" ? imageBase64 : "";

  if (!texto && !imagen) {
    return NextResponse.json({ error: "pega el texto de la rutina o sube una captura" }, { status: 400 });
  }
  if (texto.length > MAX_TEXTO) {
    return NextResponse.json({ error: "el texto es demasiado largo" }, { status: 413 });
  }
  if (imagen.length > MAX_IMAGEN_BASE64) {
    return NextResponse.json({ error: "la imagen pesa demasiado, prueba con una captura más pequeña" }, { status: 413 });
  }

  const { exceeded, today } = await checkAiQuota(supabase, user.id, "import_routine", DAILY_LIMIT);
  if (exceeded) {
    return NextResponse.json(
      { error: "quota_exceeded", message: `Ya usaste tus ${DAILY_LIMIT} importaciones de hoy. Vuelve mañana o arma la rutina a mano.` },
      { status: 429 },
    );
  }

  const parts: any[] = [{ text: INSTRUCCIONES }];
  if (imagen) parts.push({ inline_data: { mime_type: mimeType || "image/jpeg", data: imagen } });
  if (texto) parts.push({ text: `Rutina:\n${texto}` });

  let geminiRes;
  try {
    geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // response_mime_type obliga a que la respuesta sea JSON y no prosa con el JSON
        // dentro, que es de donde salían los fallos al interpretarla.
        body: JSON.stringify({ contents: [{ parts }], generationConfig: { response_mime_type: "application/json", temperature: 0 } }),
      },
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
  // Aunque se pida JSON puro, a veces llega envuelto en vallas de markdown.
  const limpio = rawText.replace(/```json|```/g, "").trim();

  let parsed: any;
  try {
    parsed = JSON.parse(limpio);
  } catch {
    return NextResponse.json({ error: `no pude interpretar la respuesta: ${limpio.slice(0, 200)}` }, { status: 502 });
  }

  const ejercicios = normalizeImported(parsed?.exercises);
  if (ejercicios.length === 0) {
    return NextResponse.json({ error: "no encontré ningún ejercicio ahí. Prueba con otra captura o pega el texto." }, { status: 422 });
  }

  const biblioteca = await cargarCatalogo(supabase);

  const emparejados = ejercicios.map((e) => {
    const match = matchExercise(e.name, biblioteca);
    return {
      importedName: e.name,
      sets: e.sets,
      reps: e.reps,
      repsMax: e.repsMax,
      restSeconds: e.restSeconds,
      notes: e.notes,
      exerciseId: match?.exercise.id ?? null,
      matchedName: match?.exercise.name ?? null,
      confidence: match ? Math.round(match.score * 100) : 0,
    };
  });

  // Los datos que la pantalla necesita para pintar las filas ya identificadas.
  const ids = emparejados.map((e) => e.exerciseId).filter((id): id is string => !!id);
  let detalles: Record<string, { media_url?: string; measurement_type: string }> = {};
  if (ids.length > 0) {
    const { data: filas } = await supabase
      .from("exercises").select("id, media_url, measurement_type").in("id", ids);
    (filas ?? []).forEach((f: any) => { detalles[f.id] = { media_url: f.media_url, measurement_type: f.measurement_type }; });
  }

  const usadas = await incrementAiUsage(supabase, user.id, "import_routine", today);

  return NextResponse.json({
    ok: true,
    routineName: typeof parsed?.name === "string" ? parsed.name.trim() : null,
    exercises: emparejados.map((e) => ({ ...e, ...(e.exerciseId ? detalles[e.exerciseId] : {}) })),
    sinIdentificar: emparejados.filter((e) => !e.exerciseId).length,
    remaining: DAILY_LIMIT - usadas,
  });
}
