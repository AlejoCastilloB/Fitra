/** Cuánto se adelanta el AVISO del fin del descanso, en milisegundos.
 *
 * Entre que se pide mostrar la notificación y el sistema la pinta pasan unos segundos, así
 * que se dispara un poco antes para que aparezca justo cuando el descanso termina. El
 * pitido de la app NO se adelanta: ese suena exacto en el cero, que es lo que muestra la
 * cuenta atrás en pantalla.
 *
 * Lo usan tanto el temporizador de la app (components/RestAlarm.tsx) como el cron del
 * servidor (app/api/cron/check-rests). Ambos avisos llevan el mismo `tag`, así que el
 * segundo en llegar reemplaza al primero en vez de apilarse. */
export const REST_NOTIFY_LEAD_MS = 4000;
