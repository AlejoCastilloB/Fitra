"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const MIN_INTERVAL_MS = 20_000;

// El middleware refresca la sesión en cada request al servidor (lib/supabase/middleware.ts),
// pero eso pasa del lado del servidor — el cliente de Supabase del navegador (un singleton,
// @supabase/ssr) no se entera de esa rotación: su temporizador interno de auto-refresh sigue
// programado según la sesión que tenía en memoria desde la última vez que la leyó. Si el
// middleware rota el refresh token durante una navegación y ese temporizador interno dispara
// después con el token viejo (ya afuera de la ventana de reuso de Supabase, hoy 10s), Supabase
// lo trata como robo y cierra toda la sesión — coincide con el patrón de "se cierra sola a los
// pocos minutos de usar la app".
//
// getSession() no compite por rotar nada — solo relee la cookie actual (siempre fresca, la
// escribe el middleware) y resincroniza el estado en memoria del cliente, lo que reprograma su
// temporizador interno contra el token vigente de verdad. Se llama al volver a la pestaña y en
// cada cambio de ruta, con una guarda mínima entre llamadas para no encimarse.
export default function SessionKeepAlive() {
  const lastSync = useRef(0);
  const pathname = usePathname();

  useEffect(() => {
    const supabase = createClient();

    function sync() {
      const now = Date.now();
      if (now - lastSync.current < MIN_INTERVAL_MS) return;
      lastSync.current = now;
      supabase.auth.getSession().catch(() => {});
    }

    function onVisible() {
      if (document.visibilityState === "visible") sync();
    }

    sync();
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [pathname]);

  return null;
}
