import { NextResponse } from "next/server";
import { isCronAuthorized } from "@/lib/cronAuth";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import webpush from "web-push";
import { ensureVapidConfigured } from "@/lib/vapid";
import { parseMealSlots, dueMeal, logWindowFor, MEAL_COPY, DEFAULT_MEAL_SLOTS } from "@/lib/mealReminders";

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

/**
 * Lee los usuarios con su configuración de comidas.
 *
 * `meal_reminders` es una columna nueva. Si la migración todavía no corrió, la consulta
 * entera falla y NADIE recibiría avisos, así que en ese caso se reintenta sin la columna y
 * todo el mundo se queda con los horarios por defecto.
 */
async function loadUsers(admin: any) {
  const withConfig = await admin
    .from("users")
    .select("id, timezone, meal_reminders")
    .not("timezone", "is", null);

  if (!withConfig.error) return { users: withConfig.data ?? [], hasConfigColumn: true };

  const fallback = await admin
    .from("users")
    .select("id, timezone")
    .not("timezone", "is", null);

  return { users: fallback.data ?? [], hasConfigColumn: false };
}

/**
 * Reserva el aviso de una comida para un usuario y un día.
 *
 * El insert ES la comprobación: la restricción de unicidad sobre (user_id, local_date,
 * slot) hace que solo la primera pasada consiga la fila. Así no hay carrera entre dos
 * ejecuciones del cron que se solapen, y sobre todo: si la escritura falla por cualquier
 * motivo, NO se manda nada. Fallar en silencio es mucho mejor que repetir la notificación
 * cada diez minutos.
 */
async function claimReminder(
  admin: any, userId: string, dateKey: string, slotKey: string,
): Promise<{ claimed: boolean; error?: string }> {
  const { error } = await admin
    .from("meal_reminders_sent")
    .insert({ user_id: userId, local_date: dateKey, slot: slotKey });

  if (!error) return { claimed: true };
  // 23505 = violación de unicidad. Es el caso normal: ya se mandó en una pasada anterior.
  if (error.code === "23505") return { claimed: false };
  return { claimed: false, error: `${error.code ?? "?"}: ${error.message}` };
}

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
  const { users, hasConfigColumn } = await loadUsers(admin);
  if (users.length === 0) return NextResponse.json({ ok: true, sent: 0, hasConfigColumn });

  let sent = 0;
  const problems: { slot: string; error: string }[] = [];

  for (const u of users as any[]) {
    let local;
    try {
      local = localParts(u.timezone, now);
    } catch {
      continue;
    }

    const slots = hasConfigColumn ? parseMealSlots(u.meal_reminders) : DEFAULT_MEAL_SLOTS;
    const slot = dueMeal(slots, local.hour * 60 + local.minute);
    if (!slot) continue;

    // Reservar el aviso ANTES de mandarlo, y solo mandarlo si la reserva se guardó.
    // Antes esto era un upsert cuyo error se ignoraba: si la escritura fallaba, el aviso
    // salía igual y en la siguiente pasada volvía a salir, porque nunca quedaba constancia
    // de haberlo mandado. Con el cron cada 10 minutos y una ventana de una hora, eso son
    // seis notificaciones idénticas de la misma comida.
    const claim = await claimReminder(admin, u.id, local.dateKey, slot.key);
    if (!claim.claimed) {
      if (claim.error) problems.push({ slot: slot.key, error: claim.error });
      continue;
    }

    const { data: subs } = await admin.from("push_subscriptions").select("*").eq("user_id", u.id);
    if (!subs || subs.length === 0) continue;

    // Si ya registró algo en la franja que cubre esta comida, no hace falta recordárselo.
    const window = logWindowFor(slots, slot.key);
    const sinceIso = new Date(now.getTime() - 20 * 60 * 60 * 1000).toISOString();
    const { data: logs } = await admin
      .from("nutrition_logs")
      .select("date")
      .eq("client_id", u.id)
      .gte("date", sinceIso);

    const alreadyLogged = !!window && (logs ?? []).some((log) => {
      const l = localParts(u.timezone, new Date(log.date));
      if (l.dateKey !== local!.dateKey) return false;
      const minutes = l.hour * 60 + l.minute;
      return minutes >= window.startMin && minutes < window.endMin;
    });
    if (alreadyLogged) continue;

    const copy = MEAL_COPY[slot.key];
    for (const sub of subs) {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          JSON.stringify({ title: copy.title, body: copy.body, url: "/app/nutrition" })
        );
        sent++;
      } catch (err: any) {
        if (err?.statusCode === 404 || err?.statusCode === 410) {
          await admin.from("push_subscriptions").delete().eq("endpoint", sub.endpoint);
        }
      }
    }
  }

  // `problems` sale en la respuesta a propósito: si la reserva falla, los avisos se
  // paran (mejor silencio que spam) y el motivo queda a la vista al abrir la URL del cron.
  return NextResponse.json({ ok: true, sent, hasConfigColumn, problems });
}
