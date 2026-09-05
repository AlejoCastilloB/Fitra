import { NextResponse } from "next/server";

/**
 * Comprobación de vida, sin secreto ni datos.
 *
 * Sirve para distinguir de dónde viene un 401 cuando un programador externo no consigue
 * llamar a /api/cron/tick:
 *   - Si esto responde 200 y tick responde 401, el problema es el secreto (CRON_SECRET
 *     mal copiado, o la cabecera no llega).
 *   - Si esto TAMBIÉN responde 401, el 401 no lo pone la app: lo pone la protección de
 *     despliegue de Vercel, que bloquea todo el dominio antes de llegar al código.
 */
export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({
    ok: true,
    service: "fitra-cron",
    cronSecretConfigured: !!process.env.CRON_SECRET,
    vapidConfigured: !!process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY && !!process.env.VAPID_PRIVATE_KEY && !!process.env.VAPID_SUBJECT,
    now: new Date().toISOString(),
  });
}
