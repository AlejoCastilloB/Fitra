import { NextResponse } from "next/server";
import { isCronAuthorized } from "@/lib/cronAuth";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import webpush from "web-push";
import { ensureVapidConfigured } from "@/lib/vapid";
import { dueOpenWorkoutReminder, flagsAfter, reminderText } from "@/lib/openWorkoutReminders";

// Obligatorio. La comprobación del secreto vive en lib/cronAuth, así que Next ya no ve
// que esta ruta lee la cabecera y la considera estática: cachearía la respuesta del build
// y ni ejecutaría la autorización. Con esto se evalúa en cada petición.
export const dynamic = "force-dynamic";

/**
 * Avisa de los entrenamientos que quedaron abiertos.
 *
 * La app escribe una fila en active_workouts mientras hay una sesión en curso y la borra
 * al terminarla o cancelarla. Aquí se buscan las que llevan rato sin una serie nueva.
 * Las reglas de cuándo toca cada aviso están en lib/openWorkoutReminders.
 */
export async function GET(req: Request) {
  if (!isCronAuthorized(req)) {
    return NextResponse.json({ error: "no autorizado" }, { status: 401 });
  }

  if (!ensureVapidConfigured()) {
    return NextResponse.json({ error: "faltan las variables de VAPID" }, { status: 503 });
  }

  const admin = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Las que ya recibieron los dos avisos no vuelven a mirarse hasta que la persona marque
  // otra serie (ahí la app baja las banderas).
  const { data: open, error } = await admin
    .from("active_workouts")
    .select("user_id, routine_name, last_activity_at, reminded_first, reminded_second")
    .eq("reminded_second", false);

  if (error) {
    return NextResponse.json({ ok: false, error: `${error.code ?? "?"}: ${error.message}` }, { status: 500 });
  }

  const now = Date.now();
  let sent = 0;
  const skipped = { sinTiempoSuficiente: 0, sinSuscripciones: 0, volvioAEntrenar: 0 };

  for (const row of open ?? []) {
    const stage = dueOpenWorkoutReminder(
      { lastActivityAt: row.last_activity_at, remindedFirst: row.reminded_first, remindedSecond: row.reminded_second },
      now,
    );
    if (!stage) { skipped.sinTiempoSuficiente++; continue; }

    // Se marca ANTES de mandar. Si el push falla, ese aviso se pierde; si se marcara
    // después y fallara la escritura, llegaría el mismo aviso en cada pasada del cron
    // —que es justo lo que pasó con los recordatorios de comida.
    //
    // La condición sobre last_activity_at hace de candado: si la persona marcó una serie
    // entre la lectura y ahora, la fila ya no coincide, no se avisa y se deja para la
    // próxima pasada. Ya volvió a entrenar.
    const { data: marked, error: markError } = await admin
      .from("active_workouts")
      .update(flagsAfter(stage))
      .eq("user_id", row.user_id)
      .eq("last_activity_at", row.last_activity_at)
      .select("user_id");

    if (markError) continue;
    if (!marked || marked.length === 0) { skipped.volvioAEntrenar++; continue; }

    const { data: subs } = await admin.from("push_subscriptions").select("*").eq("user_id", row.user_id);
    if (!subs || subs.length === 0) { skipped.sinSuscripciones++; continue; }

    const { title, body } = reminderText(stage, row.routine_name);

    for (const sub of subs) {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          // Mismo `tag` para los dos avisos: el segundo reemplaza al primero en la bandeja
          // en vez de dejar dos notificaciones iguales acumuladas.
          JSON.stringify({ title, body, url: "/app", tag: "entreno-abierto" })
        );
        sent++;
      } catch (err: any) {
        if (err?.statusCode === 404 || err?.statusCode === 410) {
          await admin.from("push_subscriptions").delete().eq("endpoint", sub.endpoint);
        }
      }
    }
  }

  return NextResponse.json({ ok: true, sent, abiertos: open?.length ?? 0, skipped });
}
