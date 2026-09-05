import { timingSafeEqual } from "crypto";

/**
 * Autorización de los endpoints de cron.
 *
 * Acepta el secreto de dos formas:
 *   1. Cabecera `Authorization: Bearer <secreto>`
 *   2. Parámetro en la URL: `?key=<secreto>`
 *
 * La segunda existe porque casi todos los programadores gratuitos (cron-job.org,
 * EasyCron, UptimeRobot…) se configuran pegando una sola URL, y añadir una cabecera
 * personalizada está escondido en pantallas de "avanzado" cuando existe. Poner el
 * secreto en la URL es algo peor —queda en los registros del servidor y del
 * programador— pero el daño posible es mínimo: quien lo consiga solo puede provocar
 * que las revisiones corran más veces, y las tablas de control (meal_reminders_sent,
 * active_rests.notified) impiden que se manden avisos repetidos.
 *
 * Si CRON_SECRET no está definida, el endpoint queda abierto. Es el comportamiento de
 * siempre, pensado para desarrollo local.
 */
export function isCronAuthorized(req: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return true;

  const header = req.headers.get("authorization");
  if (header && safeEqual(header, `Bearer ${secret}`)) return true;

  const key = new URL(req.url).searchParams.get("key");
  return !!key && safeEqual(key, secret);
}

/** Comparación de tiempo constante, para no filtrar el secreto carácter a carácter. */
function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}
