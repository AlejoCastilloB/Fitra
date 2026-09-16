function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i++) outputArray[i] = rawData.charCodeAt(i);
  return outputArray;
}

/**
 * La suscripción de este navegador, creándola si no hay.
 *
 * Con `force` se tira primero la que hubiera. Hace falta cuando el servidor avisa de que
 * el endpoint está muerto: reutilizar la guardada sería volver a subir exactamente la
 * misma suscripción que ya falló, que es lo que mantenía a la gente sin notificaciones
 * para siempre sin que nadie se enterara.
 */
async function subscribe(force = false): Promise<PushSubscription | null> {
  if (!("serviceWorker" in navigator) || !("PushManager" in window)) return null;
  const registration = await navigator.serviceWorker.ready;
  let sub = await registration.pushManager.getSubscription();

  if (sub && force) {
    try { await sub.unsubscribe(); } catch {}
    sub = null;
  }

  if (!sub) {
    sub = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!),
    });
  }
  return sub;
}

async function sendSubscriptionToServer(sub: PushSubscription) {
  await fetch("/api/push/subscribe", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(sub),
  });
}

// pide permiso al navegador y registra la suscripción. Devuelve false si el usuario la rechazó.
export async function requestPushPermissionAndSubscribe(): Promise<boolean> {
  if (!("Notification" in window)) return false;
  const permission = await Notification.requestPermission();
  if (permission !== "granted") return false;
  const sub = await subscribe();
  if (!sub) return false;
  await sendSubscriptionToServer(sub);
  return true;
}

/**
 * Re-registra la suscripción sin pedir permiso, solo si ya estaba concedido antes.
 *
 * Con `force` la rehace desde cero en vez de reutilizar la que tenga el navegador.
 * Devuelve true si quedó una suscripción registrada en el servidor.
 */
export async function ensurePushSubscribed(force = false): Promise<boolean> {
  if (!("Notification" in window) || Notification.permission !== "granted") return false;
  try {
    const sub = await subscribe(force);
    if (!sub) return false;
    await sendSubscriptionToServer(sub);
    return true;
  } catch {
    return false;
  }
}

export async function unsubscribeFromPush(): Promise<void> {
  if (!("serviceWorker" in navigator)) return;
  try {
    const registration = await navigator.serviceWorker.ready;
    const sub = await registration.pushManager.getSubscription();
    if (sub) {
      await fetch("/api/push/subscribe", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ endpoint: sub.endpoint }),
      });
      await sub.unsubscribe();
    }
  } catch {}
}
