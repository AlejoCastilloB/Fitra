"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

// Cada prefetch es un request de servidor independiente (su propio middleware,
// su propio cliente de Supabase, sin lock compartido). Si el access token está
// por vencer justo en ese momento, varios prefetch simultáneos pueden terminar
// intentando refrescar el mismo refresh token a la vez — eso es exactamente lo
// que la protección de "reuso" de Supabase interpreta como robo y cierra toda
// la sesión. Por eso van uno por uno con espacio entre cada uno, no todos juntos.
const STAGGER_MS = 900;

export default function PrecacheWarmup({ routes }: { routes: string[] }) {
  const router = useRouter();

  useEffect(() => {
    const timers = routes.map((route, i) =>
      setTimeout(() => router.prefetch(route), 1500 + i * STAGGER_MS)
    );
    return () => timers.forEach(clearTimeout);
  }, [routes.join(",")]);

  return null;
}
