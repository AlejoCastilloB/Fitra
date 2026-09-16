/**
 * Cuando una suscripción de push se muere.
 *
 * El servicio de push (Apple, Google) responde 404 o 410 cuando el endpoint ya no existe:
 * la persona desinstaló la app, borró los datos del sitio, o el navegador rotó la
 * suscripción. Ese endpoint no vuelve nunca.
 *
 * Borrar la fila no bastaba, y aquí estaba el fallo de "las notificaciones dejan de
 * llegar después de un tiempo": el NAVEGADOR seguía teniendo guardada esa misma
 * suscripción muerta. Al abrir la app, `getSubscription()` la devolvía, se subía otra vez
 * igual de muerta, el siguiente envío volvía a fallar con 410, se borraba otra vez... y
 * así para siempre. La persona no recibía nada nunca más y no había forma de enterarse.
 *
 * La marca `push_needs_resubscribe` rompe ese bucle: la próxima vez que la app se abra,
 * tira la suscripción vieja y pide una nueva de cero.
 */
export async function markPushDead(admin: any, endpoint: string): Promise<void> {
  // Primero de quién era, porque después de borrarla ya no se puede saber.
  const { data: fila } = await admin
    .from("push_subscriptions").select("user_id").eq("endpoint", endpoint).single();

  await admin.from("push_subscriptions").delete().eq("endpoint", endpoint);

  if (fila?.user_id) {
    // Si la columna todavía no existe (migración 010 sin correr), esto falla solo y no
    // arrastra al borrado, que es lo que de verdad importa hacer.
    await admin.from("users").update({ push_needs_resubscribe: true }).eq("id", fila.user_id);
  }
}

/** Si el error de web-push dice que el endpoint ya no existe. */
export function isDeadEndpointError(err: any): boolean {
  return err?.statusCode === 404 || err?.statusCode === 410;
}
