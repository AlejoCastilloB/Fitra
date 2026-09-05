/**
 * Cuándo avisar de un entrenamiento que quedó abierto.
 *
 * Pasa seguido: uno termina la última serie, se va, y la sesión se queda corriendo
 * hasta el otro día. Se manda un aviso a los 10 minutos de la última serie y otro a la
 * hora, y ya no más — la idea es recordar, no perseguir.
 *
 * Si la persona vuelve y marca otra serie, `last_activity_at` avanza y los dos avisos
 * se rearman: es una pausa nueva, no la misma.
 */

export const FIRST_REMINDER_MINUTES = 10;
export const SECOND_REMINDER_MINUTES = 60;

export type OpenWorkoutRow = {
  /** Momento de la última serie marcada (o del inicio, si todavía no hay ninguna). */
  lastActivityAt: string | number | Date;
  remindedFirst: boolean;
  remindedSecond: boolean;
};

export type ReminderStage = "first" | "second";

/**
 * Qué aviso toca mandar ahora mismo, o null si ninguno.
 *
 * Cuando ya pasó una hora se manda directamente el segundo aunque el primero nunca
 * hubiera salido (el cron pudo estar caído): llegar dos veces seguidas sería peor que
 * saltarse el primero.
 */
export function dueOpenWorkoutReminder(row: OpenWorkoutRow, nowMs: number): ReminderStage | null {
  const last = new Date(row.lastActivityAt).getTime();
  if (Number.isNaN(last)) return null;

  const idleMinutes = (nowMs - last) / 60000;

  if (idleMinutes >= SECOND_REMINDER_MINUTES && !row.remindedSecond) return "second";
  if (idleMinutes >= FIRST_REMINDER_MINUTES && !row.remindedFirst && !row.remindedSecond) return "first";
  return null;
}

/** Qué banderas quedan marcadas después de mandar un aviso. */
export function flagsAfter(stage: ReminderStage): { reminded_first: boolean; reminded_second: boolean } {
  // Con el segundo se marcan las dos: ya no queda nada más que mandar en esta pausa.
  if (stage === "second") return { reminded_first: true, reminded_second: true };
  return { reminded_first: true, reminded_second: false };
}

export function reminderText(stage: ReminderStage, routineName: string | null): { title: string; body: string } {
  const rutina = routineName?.trim();
  if (stage === "first") {
    return {
      title: "¿Tienes un entrenamiento en curso?",
      body: rutina
        ? `${rutina} sigue abierto. Vuelve a la app para continuar o para terminarlo.`
        : "Tu entrenamiento sigue abierto. Vuelve a la app para continuar o para terminarlo.",
    };
  }
  return {
    title: "Tu entrenamiento sigue abierto",
    body: rutina
      ? `Lleva una hora sin series. Termina ${rutina} desde la app — al final puedes ajustarle la duración.`
      : "Lleva una hora sin series. Termínalo desde la app — al final puedes ajustarle la duración.",
  };
}
