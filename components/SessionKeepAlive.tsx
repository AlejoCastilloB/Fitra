"use client";

// El middleware ya refresca la sesión en cada request al servidor (lib/supabase/middleware.ts),
// y el SDK de Supabase ya maneja su propio refresh automático en el cliente (autoRefreshToken).
// Este componente antes disparaba un refresh manual extra en cada visibilitychange — un tercer
// trigger independiente que podía competir con los otros dos por rotar el mismo refresh token
// casi al mismo tiempo, lo cual Supabase puede interpretar como reuso y cerrar la sesión entera.
// Se deja como no-op para no perder el punto de montaje si hace falta reintroducir algo puntual.
export default function SessionKeepAlive() {
  return null;
}
