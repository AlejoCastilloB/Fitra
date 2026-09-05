import { NextResponse } from "next/server";
import { isCronAuthorized } from "@/lib/cronAuth";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import webpush from "web-push";
import { ensureVapidConfigured } from "@/lib/vapid";

// Obligatorio. La comprobación del secreto vive en lib/cronAuth, así que Next ya no ve
// que esta ruta lee la cabecera y la considera estática: cachearía la respuesta del build
// y ni ejecutaría la autorización. Con esto se evalúa en cada petición.
export const dynamic = "force-dynamic";

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

  const now = new Date();

  async function sendTo(userId: string, payload: { title: string; body: string; url: string }) {
    const { data: subs } = await admin.from("push_subscriptions").select("*").eq("user_id", userId);
    if (!subs || subs.length === 0) return 0;
    let count = 0;
    for (const sub of subs) {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          JSON.stringify(payload)
        );
        count++;
      } catch (err: any) {
        if (err?.statusCode === 404 || err?.statusCode === 410) {
          await admin.from("push_subscriptions").delete().eq("endpoint", sub.endpoint);
        }
      }
    }
    return count;
  }

  let sent = 0;

  const { data: progressUsers } = await admin
    .from("users")
    .select("id, progress_reminder_days, last_progress_reminder_sent_at")
    .not("progress_reminder_days", "is", null);

  for (const u of progressUsers ?? []) {
    const days = u.progress_reminder_days as number;
    if (!days || days <= 0) continue;

    const last = u.last_progress_reminder_sent_at ? new Date(u.last_progress_reminder_sent_at) : null;
    const dueAt = last ? new Date(last.getTime() + days * 86400000) : now;
    if (now < dueAt) continue;

    sent += await sendTo(u.id, {
      title: "Hora de registrar tu progreso",
      body: "Suma una foto, tus medidas o tu peso para seguir viendo tu evolución.",
      url: "/app/profile",
    });
    await admin.from("users").update({ last_progress_reminder_sent_at: now.toISOString() }).eq("id", u.id);
  }

  const { data: physicalUsers } = await admin
    .from("users")
    .select("id, physical_reminder_days, last_physical_reminder_sent_at")
    .not("physical_reminder_days", "is", null);

  for (const u of physicalUsers ?? []) {
    const days = u.physical_reminder_days as number;
    if (!days || days <= 0) continue;

    const last = u.last_physical_reminder_sent_at ? new Date(u.last_physical_reminder_sent_at) : null;
    const dueAt = last ? new Date(last.getTime() + days * 86400000) : now;
    if (now < dueAt) continue;

    sent += await sendTo(u.id, {
      title: "Actualiza tus datos físicos",
      body: "Revisa tu peso, altura y edad para que tus metas de calorías sigan siendo precisas.",
      url: "/app/profile/settings",
    });
    await admin.from("users").update({ last_physical_reminder_sent_at: now.toISOString() }).eq("id", u.id);
  }

  // Colombia no usa horario de verano, así que un offset fijo de -5h basta para calcular
  // la hora local sin depender de zonas horarias por usuario (que hoy no se guardan).
  const BOGOTA_OFFSET_MS = 5 * 3600000;
  const bNow = new Date(now.getTime() - BOGOTA_OFFSET_MS);
  const bTodayStr = bNow.toISOString().slice(0, 10);

  const { data: nutritionUsers } = await admin
    .from("users")
    .select("id, nutrition_reminder_time, last_nutrition_reminder_sent_at")
    .not("nutrition_reminder_time", "is", null);

  for (const u of nutritionUsers ?? []) {
    const time = u.nutrition_reminder_time as string;
    if (!time) continue;
    if (u.last_nutrition_reminder_sent_at === bTodayStr) continue;

    const targetBogota = new Date(`${bTodayStr}T${time}:00.000Z`);
    if (bNow < targetBogota) continue;

    sent += await sendTo(u.id, {
      title: "Cierra tu día en FitTrack",
      body: "Cuéntale a Fitra todo lo que comiste hoy — por texto o nota de voz — y arma tu registro completo.",
      url: "/app/nutrition?closeDay=1",
    });
    await admin.from("users").update({ last_nutrition_reminder_sent_at: bTodayStr }).eq("id", u.id);
  }

  return NextResponse.json({ ok: true, sent });
}
