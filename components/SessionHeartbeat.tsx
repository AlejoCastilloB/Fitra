"use client";

import { useEffect, useRef } from "react";
import { useCurrentUser } from "@/lib/useCurrentUser";
import { createClient } from "@/lib/supabase/client";
import { ensurePushSubscribed } from "@/lib/push";

/** Cada cuánto se vuelve a apuntar que la persona sigue por aquí. */
const CADA_MS = 30 * 60 * 1000;

/**
 * Deja constancia de que la app se abrió, y repara las notificaciones si hicieran falta.
 *
 * Dos cosas que van juntas porque las dos pasan en el mismo momento — al entrar:
 *
 *  - Apunta `last_seen_at`. De ahí sale el aviso de "llevas un día sin entrar", que no se
 *    puede calcular de otra forma: entrenar o registrar comida deja rastro, pero abrir la
 *    app y mirar no dejaba ninguno.
 *
 *  - Si el servidor marcó la suscripción de push como muerta, la rehace desde cero. Es el
 *    arreglo del "las notificaciones dejan de llegar después de un tiempo": el navegador
 *    guardaba una suscripción que el servicio de push ya había invalidado y la subía una
 *    y otra vez, muerta, sin que nada la reemplazara.
 */
export default function SessionHeartbeat() {
  const uid = useCurrentUser();
  const ultimoAviso = useRef(0);

  useEffect(() => {
    if (!uid) return;
    const supabase = createClient();

    const marcarVisita = () => {
      const ahora = Date.now();
      if (ahora - ultimoAviso.current < CADA_MS) return;
      ultimoAviso.current = ahora;
      // Si la migración 010 no ha corrido, esto falla solo y no rompe nada más.
      supabase.from("users").update({ last_seen_at: new Date().toISOString() }).eq("id", uid).then(() => {});
    };

    marcarVisita();

    // Una app instalada puede quedarse abierta días: volver a ella cuenta como entrar.
    const alVolver = () => { if (document.visibilityState === "visible") marcarVisita(); };
    document.addEventListener("visibilitychange", alVolver);

    // En su propia consulta: pedir una columna que aún no existe tumbaría la fila entera.
    supabase.from("users").select("push_needs_resubscribe").eq("id", uid).single()
      .then(async ({ data }) => {
        if (!(data as any)?.push_needs_resubscribe) {
          // Caso normal: refrescar la suscripción por si el navegador la rotó.
          await ensurePushSubscribed();
          return;
        }
        const ok = await ensurePushSubscribed(true);
        // La marca se quita solo si de verdad quedó una suscripción nueva. Si no, se
        // vuelve a intentar la próxima vez que abra.
        if (ok) await supabase.from("users").update({ push_needs_resubscribe: false }).eq("id", uid);
      });

    return () => document.removeEventListener("visibilitychange", alVolver);
  }, [uid]);

  return null;
}
