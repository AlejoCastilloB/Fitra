import { NextResponse } from "next/server";
import { isCronAuthorized } from "@/lib/cronAuth";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import webpush from "web-push";
import { ensureVapidConfigured } from "@/lib/vapid";
import { markPushDead, isDeadEndpointError } from "@/lib/pushHealth";
import { decideNudge, nudgeBody } from "@/lib/inactivity";

function horaLocal(timeZone: string, date: Date): number {
  const h = new Intl.DateTimeFormat("en-US", { timeZone, hour12: false, hour: "2-digit" })
    .formatToParts(date).find((p) => p.type === "hour")!.value;
  return h === "24" ? 0 : +h;
}

// Obligatorio: sin esto Next considera la ruta estática y ni comprueba el secreto.
export const dynamic = "force-dynamic";

/**
 * Un toque a quien lleva un día sin abrir la app.
 *
 * Se apoya en `last_seen_at`, que escribe SessionHeartbeat al entrar. No vale mirar
 * entrenamientos ni comidas: quien abre la app, mira su rutina y la cierra sin registrar
 * nada no deja ningún rastro, y es justo a quien conviene dar el toque.
 *
 * Una sola vez por ausencia. El aviso se "reserva" antes de mandarlo con un compare and
 * swap sobre `inactive_notified_at`: si dos pasadas del cron se solapan, solo una gana la
 * reserva y solo esa manda. Y como la condición para volver a avisar es que la persona
 * haya entrado DESPUÉS del último aviso, quien no vuelve no recibe un recordatorio diario
 * que acabaría en "desactivar notificaciones".
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

  const { data: users, error } = await admin
    .from("users")
    .select("id, role, timezone, last_seen_at, inactive_notified_at")
    .eq("role", "client")
    .not("timezone", "is", null);

  // Si la migración 010 no ha corrido, la consulta entera falla. Se dice claramente en vez
  // de devolver un cero que parecería normal.
  if (error) {
    return NextResponse.json({ ok: true, sent: 0, aviso: "falta la migración 010", detalle: error.message });
  }

  const ahora = new Date();
  let sent = 0;
  const problems: { userId: string; error: string }[] = [];
  const skipped = { nuncaHaEntrado: 0, entroHacePoco: 0, yaAvisado: 0, fueraDeHorario: 0, sinSuscripciones: 0, zonaHorariaInvalida: 0, reservaPerdida: 0 };

  for (const u of (users ?? []) as any[]) {
    let hora: number;
    try {
      hora = horaLocal(u.timezone, ahora);
    } catch {
      skipped.zonaHorariaInvalida++; continue;
    }

    const decision = decideNudge(
      { lastSeenAt: u.last_seen_at, inactiveNotifiedAt: u.inactive_notified_at, localHour: hora },
      ahora,
    );
    if (!decision.avisar) { skipped[decision.motivo]++; continue; }

    // Reservar ANTES de mandar, con la marca anterior como condición: si otra pasada ya la
    // cambió, esta no actualiza ninguna fila y se sale sin mandar nada.
    let reserva = admin.from("users").update({ inactive_notified_at: ahora.toISOString() }).eq("id", u.id);
    reserva = u.inactive_notified_at
      ? reserva.eq("inactive_notified_at", u.inactive_notified_at)
      : reserva.is("inactive_notified_at", null);
    const { data: reservada, error: errorReserva } = await reserva.select("id");

    if (errorReserva) { problems.push({ userId: u.id, error: errorReserva.message }); continue; }
    if (!reservada || reservada.length === 0) { skipped.reservaPerdida++; continue; }

    const { data: subs } = await admin.from("push_subscriptions").select("*").eq("user_id", u.id);
    if (!subs || subs.length === 0) { skipped.sinSuscripciones++; continue; }

    const cuerpo = nudgeBody(decision.horasFuera);

    for (const sub of subs) {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          JSON.stringify({ title: "Te echamos de menos 👋", body: cuerpo, url: "/app", tag: "inactividad" })
        );
        sent++;
      } catch (err: any) {
        if (isDeadEndpointError(err)) await markPushDead(admin, sub.endpoint);
      }
    }
  }

  return NextResponse.json({
    ok: true, sent, revisados: (users ?? []).length, problems, skipped, ahora: ahora.toISOString(),
  });
}
