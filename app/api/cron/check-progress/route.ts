import { NextResponse } from "next/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import webpush from "web-push";

webpush.setVapidDetails(
  process.env.VAPID_SUBJECT!,
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!
);

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
  const { data: users } = await admin
    .from("users")
    .select("id, progress_reminder_days, last_progress_reminder_sent_at")
    .not("progress_reminder_days", "is", null);

  if (!users || users.length === 0) return NextResponse.json({ ok: true, sent: 0 });

  let sent = 0;

  for (const u of users) {
    const days = u.progress_reminder_days as number;
    if (!days || days <= 0) continue;

    const last = u.last_progress_reminder_sent_at ? new Date(u.last_progress_reminder_sent_at) : null;
    const dueAt = last ? new Date(last.getTime() + days * 86400000) : now;
    if (now < dueAt) continue;

    const { data: subs } = await admin.from("push_subscriptions").select("*").eq("user_id", u.id);
    if (!subs || subs.length === 0) continue;

    for (const sub of subs) {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          JSON.stringify({
            title: "Hora de registrar tu progreso",
            body: "Suma una foto, tus medidas o tu peso para seguir viendo tu evolución.",
            url: "/app/profile",
          })
        );
        sent++;
      } catch (err: any) {
        if (err?.statusCode === 404 || err?.statusCode === 410) {
          await admin.from("push_subscriptions").delete().eq("endpoint", sub.endpoint);
        }
      }
    }

    await admin.from("users").update({ last_progress_reminder_sent_at: now.toISOString() }).eq("id", u.id);
  }

  return NextResponse.json({ ok: true, sent });
}
