import webpush from "web-push";

let configured = false;

/**
 * Configura web-push la primera vez que se necesita, no al importar el módulo.
 *
 * Antes cada ruta de cron llamaba a `setVapidDetails()` a nivel de módulo. Next.js
 * importa esos módulos durante `next build` para recolectar los datos de las rutas, así
 * que si faltaba una variable de VAPID la librería lanzaba y se caía el build COMPLETO
 * — aunque nada más del proyecto tuviera que ver con notificaciones. Eso es lo que hacía
 * fallar los deploys de preview, donde esas variables no están definidas.
 *
 * Devuelve false si falta configuración, para que la ruta responda un error controlado
 * en vez de tumbar el build.
 */
export function ensureVapidConfigured(): boolean {
  const subject = process.env.VAPID_SUBJECT;
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;

  if (!subject || !publicKey || !privateKey) return false;
  if (configured) return true;

  webpush.setVapidDetails(subject, publicKey, privateKey);
  configured = true;
  return true;
}
