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

  const { data: pending } = await admin
    .from("active_rests")
    .select("user_id, routine_name")
    .eq("notified", false)
    .lte("rest_end_at", new Date().toISOString());

  if (!pending || pending.length === 0) return NextResponse.json({ ok: true, sent: 0 });

  let sent = 0;
  for (const row of pending) {
    const { data: subs } = await admin.from("push_subscriptions").select("*").eq("user_id", row.user_id);

    for (const sub of subs ?? []) {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          JSON.stringify({
            title: "Descanso terminado",
            body: row.routine_name ? `${row.routine_name} — es hora de tu próxima serie` : "Es hora de tu próxima serie",
            url: "/app",
          })
        );
        sent++;
      } catch (err: any) {
        if (err?.statusCode === 404 || err?.statusCode === 410) {
          await admin.from("push_subscriptions").delete().eq("endpoint", sub.endpoint);
        }
      }
    }

    await admin.from("active_rests").update({ notified: true }).eq("user_id", row.user_id);
  }

  return NextResponse.json({ ok: true, sent });
}
