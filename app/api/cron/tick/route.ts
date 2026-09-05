import { NextResponse } from "next/server";
import { isCronAuthorized } from "@/lib/cronAuth";
import { GET as checkMeals } from "../check-meals/route";
import { GET as checkRests } from "../check-rests/route";
import { GET as checkProgress } from "../check-progress/route";

export const maxDuration = 60;

/**
 * Una sola entrada que corre todas las revisiones de notificaciones.
 *
 * El plan Hobby de Vercel permite 2 crons y una corrida diaria, así que tener un cron
 * por revisión no cabe. Este endpoint las ejecuta todas juntas y gasta un solo cupo.
 *
 * Solo manda avisos a los clientes (comidas, descansos, progreso). Los recordatorios del
 * entrenador NO van por push: se muestran dentro del panel al entrar, así el poco cupo de
 * ejecuciones queda entero para lo que sí necesita llegar al teléfono del usuario.
 *
 * Para que los avisos de comida y descanso sirvan de verdad hace falta llamarlo cada
 * pocos minutos, no una vez al día. Cualquier programador externo (cron-job.org,
 * GitHub Actions, pg_cron de Supabase) puede pegarle a /api/cron/tick con la cabecera
 * `Authorization: Bearer $CRON_SECRET`.
 */
// Obligatorio. La comprobación del secreto vive en lib/cronAuth, así que Next ya no ve
// que esta ruta lee la cabecera y la considera estática: cachearía la respuesta del build
// y ni ejecutaría la autorización. Con esto se evalúa en cada petición.
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  if (!isCronAuthorized(req)) {
    return NextResponse.json({ error: "no autorizado" }, { status: 401 });
  }

  const checks: [string, (r: Request) => Promise<Response>][] = [
    ["meals", checkMeals],
    ["rests", checkRests],
    ["progress", checkProgress],
  ];

  const results: Record<string, unknown> = {};

  // En serie y cada una aislada: si una falla, las demás igual corren.
  for (const [name, run] of checks) {
    try {
      const res = await run(req);
      results[name] = { status: res.status, body: await res.json().catch(() => null) };
    } catch (e: any) {
      results[name] = { error: e?.message ?? "fallo inesperado" };
    }
  }

  return NextResponse.json({ ok: true, ranAt: new Date().toISOString(), results });
}
