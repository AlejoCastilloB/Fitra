import { NextResponse } from "next/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import webpush from "web-push";

webpush.setVapidDetails(
  process.env.VAPID_SUBJECT!,
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!
);

const MEAL_SLOTS = [
  {
    key: "breakfast", hour: 8, windowStart: 5, windowEnd: 11,
    title: "¿Ya desayunaste?", body: "Registra tu desayuno para llevar bien el conteo de calorías de hoy.",
  },
  {
    key: "lunch", hour: 13, windowStart: 11, windowEnd: 16,
    title: "Hora del almuerzo", body: "No olvides registrar tu almuerzo en FitTrack.",
  },
  {
    key: "dinner", hour: 20, windowStart: 18, windowEnd: 23,
    title: "¿Ya cenaste?", body: "Registra tu cena para cerrar el día con tus macros completos.",
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

    const slot = MEAL_SLOTS.find((s) => local!.hour === s.hour && local!.minute < 15);
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
