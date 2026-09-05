"use client";

import { useEffect, useRef } from "react";
import { useWorkoutSession } from "@/lib/workoutSession";
import { useCurrentUser } from "@/lib/useCurrentUser";
import { createClient } from "@/lib/supabase/client";

/**
 * Deja constancia en el servidor de que hay un entrenamiento abierto.
 *
 * La sesión vive en el teléfono (localStorage), así que si la persona cierra la app el
 * servidor no tendría cómo saber que se quedó a medias. Esta fila es ese aviso: el cron
 * la mira y manda una notificación a los 10 minutos de la última serie y otra a la hora.
 *
 * Solo escribe cuando cambia algo que importa (empezar el entreno o marcar una serie), no
 * en cada segundo del cronómetro.
 */
export default function OpenWorkoutBeacon() {
  const { session, hydrated } = useWorkoutSession();
  const uid = useCurrentUser();
  /** Último `lastSetAt` que este beacon escribió. null = todavía no ha escrito nada. */
  const writtenSetAtRef = useRef<number | null>(null);

  useEffect(() => {
    // Antes de hidratar la sesión siempre es null: borrar aquí se llevaría por delante
    // la fila de un entreno que sí sigue abierto.
    if (!uid || !hydrated) return;
    const supabase = createClient();

    if (!session) {
      if (writtenSetAtRef.current === null) return;
      writtenSetAtRef.current = null;
      supabase.from("active_workouts").delete().eq("user_id", uid).then(() => {});
      return;
    }

    if (writtenSetAtRef.current === session.lastSetAt) return;
    // Solo se rearman los avisos cuando la persona marcó una serie nueva. Volver a abrir
    // la app no cuenta: si se omiten estas dos columnas, el upsert las deja como estaban
    // y no se repite un aviso que ya se mandó en esta misma pausa.
    const marcoSerieNueva = writtenSetAtRef.current !== null;
    writtenSetAtRef.current = session.lastSetAt;

    supabase.from("active_workouts").upsert({
      user_id: uid,
      routine_name: session.routineName,
      started_at: new Date(session.startedAt).toISOString(),
      last_activity_at: new Date(session.lastSetAt).toISOString(),
      ...(marcoSerieNueva ? { reminded_first: false, reminded_second: false } : {}),
      updated_at: new Date().toISOString(),
    }).then(() => {});
  }, [uid, hydrated, session?.startedAt, session?.lastSetAt, session?.routineName, session === null]);

  return null;
}
