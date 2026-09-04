import { NextResponse } from "next/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import webpush from "web-push";
import { ensureVapidConfigured } from "@/lib/vapid";

const MEAL_SLOTS = [
  {
    key: "breakfast", hour: 7, minute: 0, windowStart: 5, windowEnd: 10,
    title: "¿Qué vas a desayunar hoy?", body: "Registra tu desayuno para arrancar bien el día.",
  },
  {
    key: "morning_snack", hour: 11, minute: 30, windowStart: 10, windowEnd: 13,
    title: "¿Piensas comer algún snack?", body: "Regístralo y sigue sumando a tu progreso.",
  },
  {
    key: "afternoon_snack", hour: 15, minute: 30, windowStart: 13, windowEnd: 17,
    title: "¿Merienda a la vista?", body: "Regístrala y sigue sumando a tu progreso.",
  },
  {
    key: "dinner", hour: 18, minute: 30, windowStart: 17, windowEnd: 22,
    title: "¿Qué vas a cenar?", body: "Registra tu cena para cerrar el día con tus macros completos.",
  },
] as const;

function localParts(timeZone: string, date: Date) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone, hour12: false,
    year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit",
  }).formatToParts(date);
  const get = (type: string) => parts.find((p) => p.type === type)!.value;
  return {
    dateKey: `${get("year")}-${get("month")}-${get("day")}`,
    hour: get("hour") === "24" ? 0 : +get("hour"),
    minute: +get("minute"),
  };
}

export async function GET(req: Request) {
  if (process.env.CRON_SECRET) {
    const auth = req.headers.get("authorization");
    if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: "no autorizado" }, { status: 401 });
    }
  }

  if (!ensureVapidConfigured()) {
    return NextResponse.json({ error: "faltan las variables de VAPID" }, { status: 503 });
  }

  const admin = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const now = new Date();
  const { data: users } = await admin.from("users").select("id, timezone").not("timezone", "is", null);
  if (!users || users.length === 0) return NextResponse.json({ ok: true, sent: 0 });

  let sent = 0;

  for (const u of users) {
    let local;
    try {
      local = localParts(u.timezone, now);
    } catch {
      continue;
    }

    // La ventana era de 15 minutos, lo que obligaba a que el cron cayera justo dentro de
    // ella. Ningún programador gratuito es tan puntual (GitHub Actions puede retrasarse
    // bastante cuando hay cola), así que con 15 minutos el aviso simplemente no salía.
    // Con una hora de margen, el primer pase después de la hora de la comida lo manda —y
    // la fila en meal_reminders_sent garantiza que solo salga uno por franja y día—.
    // Las franjas están separadas por 3 horas o más, así que no se pisan entre ellas.
    const localTotalMin = local.hour * 60 + local.minute;
    const slot = MEAL_SLOTS.find((s) => {
      const diff = localTotalMin - (s.hour * 60 + s.minute);
      return diff >= 0 && diff < 60;
    });
    if (!slot) continue;

    const { data: already } = await admin
      .from("meal_reminders_sent")
      .select("slot")
      .eq("user_id", u.id).eq("local_date", local.dateKey).eq("slot", slot.key)
      .maybeSingle();
    if (already) continue;

    await admin.from("meal_reminders_sent").upsert(
      { user_id: u.id, local_date: local.dateKey, slot: slot.key },
      { onConflict: "user_id,local_date,slot" }
    );

    const { data: subs } = await admin.from("push_subscriptions").select("*").eq("user_id", u.id);
    if (!subs || subs.length === 0) continue;

    const sinceIso = new Date(now.getTime() - 20 * 60 * 60 * 1000).toISOString();
    const { data: logs } = await admin
      .from("nutrition_logs")
      .select("date")
      .eq("client_id", u.id)
      .gte("date", sinceIso);

    const alreadyLogged = (logs ?? []).some((log) => {
      const logLocal = localParts(u.timezone, new Date(log.date));
      return logLocal.dateKey === local!.dateKey && logLocal.hour >= slot.windowStart && logLocal.hour < slot.windowEnd;
    });
    if (alreadyLogged) continue;

    for (const sub of subs) {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          JSON.stringify({ title: slot.title, body: slot.body, url: "/app/nutrition" })
        );
        sent++;
      } catch (err: any) {
        if (err?.statusCode === 404 || err?.statusCode === 410) {
          await admin.from("push_subscriptions").delete().eq("endpoint", sub.endpoint);
        }
      }
    }
  }

  return NextResponse.json({ ok: true, sent });
}
