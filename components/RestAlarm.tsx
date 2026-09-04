"use client";

import { useEffect, useRef } from "react";
import { useWorkoutSession } from "@/lib/workoutSession";
import { useCurrentUser } from "@/lib/useCurrentUser";
import { createClient } from "@/lib/supabase/client";
import { ensurePushSubscribed } from "@/lib/push";
import { REST_NOTIFY_LEAD_MS } from "@/lib/restNotify";

const SOUNDS: Record<string, { freq: number; pattern: number[] }> = {
  clasico: { freq: 880, pattern: [0.35] },
  suave: { freq: 660, pattern: [0.5] },
  energico: { freq: 990, pattern: [0.12, 0.12, 0.12] },
  campana: { freq: 1046, pattern: [0.5] },
  digital: { freq: 1400, pattern: [0.08, 0.08, 0.08, 0.08] },
};

export default function RestAlarm() {
  const { session, now } = useWorkoutSession();
  const uid = useCurrentUser();
  const soundRef = useRef("clasico");
  const alarmedForRef = useRef<number | null>(null);
  const lastReminderRef = useRef<number>(0);

  useEffect(() => {
    if (!uid) return;
    const supabase = createClient();
    supabase.from("users").select("timer_sound").eq("id", uid).single().then(({ data }) => {
      if (data?.timer_sound) soundRef.current = data.timer_sound;
    });
  }, [uid]);

  useEffect(() => {
    if (!uid) return;
    ensurePushSubscribed();
  }, [uid]);

  useEffect(() => {
    if (!uid) return;
    const supabase = createClient();
    if (session?.restEndAt) {
      supabase.from("active_rests").upsert({
        user_id: uid,
        rest_end_at: new Date(session.restEndAt).toISOString(),
        routine_name: session.routineName,
        notified: false,
      }).then(() => {});
    } else {
      supabase.from("active_rests").delete().eq("user_id", uid).then(() => {});
    }
  }, [uid, session?.restEndAt]);

  function playBeeps(times: number) {
    const s = SOUNDS[soundRef.current] || SOUNDS.clasico;
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      let t = ctx.currentTime;
      for (let rep = 0; rep < times; rep++) {
        s.pattern.forEach((dur) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.frequency.value = s.freq;
          osc.connect(gain);
          gain.connect(ctx.destination);
          gain.gain.setValueAtTime(0.15, t);
          osc.start(t);
          osc.stop(t + dur);
          t += dur + 0.08;
        });
        t += 0.4;
      }
    } catch {}
  }

  // El aviso del fin del descanso lo dispara la propia app con un temporizador, no el cron:
  // el cron corre cada varios minutos y llegaría tardísimo. Se programa unos segundos antes
  // del cero para compensar lo que tarda el sistema en pintarlo. Lleva `tag`, así que si
  // además llega el push del servidor lo reemplaza en vez de duplicarlo.
  useEffect(() => {
    const endAt = session?.restEndAt;
    if (!endAt) return;
    if (!("Notification" in window) || Notification.permission !== "granted") return;

    const delay = endAt - REST_NOTIFY_LEAD_MS - Date.now();
    if (delay < 0) return;

    const routineName = session?.routineName;
    const timer = setTimeout(async () => {
      try {
        const registration = await navigator.serviceWorker.ready;
        await registration.showNotification("Descanso terminado", {
          body: routineName ? `${routineName} — es hora de tu próxima serie` : "Es hora de tu próxima serie",
          icon: "/icon-192.png", badge: "/icon-192.png",
          tag: "rest-done",
          data: { url: "/app" },
        });
      } catch {}
    }, delay);

    return () => clearTimeout(timer);
  }, [session?.restEndAt, session?.routineName]);

  useEffect(() => {
    if (!session?.restEndAt) return;
    const elapsedSinceEnd = now - session.restEndAt;
    if (elapsedSinceEnd >= 0 && elapsedSinceEnd < 1200 && alarmedForRef.current !== session.restEndAt) {
      alarmedForRef.current = session.restEndAt;
      playBeeps(3);
      if (navigator.vibrate) navigator.vibrate([200, 100, 200, 100, 200]);
    }
  }, [now, session?.restEndAt]);

  useEffect(() => {
    if (!session) { lastReminderRef.current = 0; return; }
    const referencePoint = session.restEndAt ?? session.startedAt;
    const idleMs = now - referencePoint;
    if (idleMs > 5 * 60 * 1000 && now - lastReminderRef.current > 5 * 60 * 1000) {
      lastReminderRef.current = now;
      playBeeps(1);
      if ("Notification" in window && Notification.permission === "granted") {
        try {
          new Notification("Tu entrenamiento sigue en pausa", {
            body: `${session.routineName} — volvé a la app para continuar o terminarlo.`,
          });
        } catch {}
      }
    }
  }, [now, session]);

  return null;
}
