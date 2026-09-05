/**
 * Horarios de los recordatorios de comida, configurables por cada usuario.
 *
 * Antes eran cuatro franjas fijas escritas en el código del cron. Ahora cada persona
 * decide la hora de hasta cinco comidas y cuáles quiere recibir. Se guardan en
 * `users.meal_reminders` (jsonb); si esa columna todavía no existe o el usuario nunca
 * tocó nada, se usan los valores por defecto de aquí.
 *
 * Las CLAVES no se pueden cambiar ni reordenar: la tabla `meal_reminders_sent` guarda una
 * fila por (usuario, día, clave) para no mandar el mismo aviso dos veces, y renombrar una
 * clave haría que se reenviaran avisos ya enviados.
 */

export type MealSlotKey = "breakfast" | "morning_snack" | "lunch" | "afternoon_snack" | "dinner";

export type MealSlot = {
  key: MealSlotKey;
  label: string;
  /** Hora local del usuario, en formato "HH:MM". */
  time: string;
  enabled: boolean;
};

/** Separación mínima recomendada entre dos comidas, en minutos. */
export const MIN_GAP_MINUTES = 60;

/** Cuánto margen tiene un aviso para salir después de su hora. Un programador gratuito no
 *  es puntual al minuto, así que el primer pase dentro de la ventana lo manda. */
export const MAX_WINDOW_MINUTES = 60;

/** Cuánto después del aviso principal se manda el de seguimiento. */
export const FOLLOWUP_DELAY_MINUTES = 60;

export const MEAL_COPY: Record<MealSlotKey, { title: string; body: string; noun: string }> = {
  breakfast: { title: "¿Qué vas a desayunar hoy?", body: "Registra tu desayuno para arrancar bien el día.", noun: "desayuno" },
  morning_snack: { title: "¿Piensas comer algún snack?", body: "Regístralo y sigue sumando a tu progreso.", noun: "snack de media mañana" },
  lunch: { title: "¿Qué hay de almuerzo?", body: "Regístralo y mantén tus macros al día.", noun: "almuerzo" },
  afternoon_snack: { title: "¿Merienda a la vista?", body: "Regístrala y sigue sumando a tu progreso.", noun: "merienda" },
  dinner: { title: "¿Qué vas a cenar?", body: "Registra tu cena para cerrar el día con tus macros completos.", noun: "cena" },
};

const FOLLOWUP_BODY =
  "No pasa nada, dile a Fitra qué comiste en una nota de voz y sigue sumando tus macros del día.";

export const DEFAULT_MEAL_SLOTS: MealSlot[] = [
  { key: "breakfast", label: "Desayuno", time: "07:00", enabled: true },
  { key: "morning_snack", label: "Media mañana", time: "10:30", enabled: true },
  { key: "lunch", label: "Almuerzo", time: "13:00", enabled: true },
  { key: "afternoon_snack", label: "Merienda", time: "16:30", enabled: true },
  { key: "dinner", label: "Cena", time: "20:00", enabled: true },
];

export function timeToMinutes(time: string): number | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec(time.trim());
  if (!m) return null;
  const h = +m[1];
  const min = +m[2];
  if (h < 0 || h > 23 || min < 0 || min > 59) return null;
  return h * 60 + min;
}

export function minutesToTime(total: number): string {
  const t = ((total % 1440) + 1440) % 1440;
  return `${String(Math.floor(t / 60)).padStart(2, "0")}:${String(t % 60).padStart(2, "0")}`;
}

/**
 * Combina lo que el usuario guardó con los valores por defecto.
 *
 * Tolera datos rotos a propósito: una hora inválida, un campo que no es objeto o una clave
 * desconocida se ignoran y esa comida se queda con su valor por defecto. Nunca lanza, para
 * que un dato mal guardado no deje a nadie sin recordatorios.
 */
export function parseMealSlots(raw: unknown): MealSlot[] {
  const stored = new Map<string, any>();
  if (raw && typeof raw === "object") {
    const list = Array.isArray(raw) ? raw : (raw as any).slots;
    if (Array.isArray(list)) {
      for (const item of list) {
        if (item && typeof item === "object" && typeof item.key === "string") stored.set(item.key, item);
      }
    }
  }

  return DEFAULT_MEAL_SLOTS.map((base) => {
    const s = stored.get(base.key);
    if (!s) return { ...base };
    const time = typeof s.time === "string" && timeToMinutes(s.time) !== null ? s.time : base.time;
    return {
      ...base,
      time,
      enabled: typeof s.enabled === "boolean" ? s.enabled : base.enabled,
    };
  });
}

/** Lo que se guarda en la base: solo lo que el usuario puede cambiar. */
export function serializeMealSlots(slots: MealSlot[]) {
  return { slots: slots.map(({ key, time, enabled }) => ({ key, time, enabled })) };
}

/** Comidas activas ordenadas por hora. Es el orden con el que se calculan las ventanas. */
export function sortedEnabled(slots: MealSlot[]): MealSlot[] {
  return slots
    .filter((s) => s.enabled && timeToMinutes(s.time) !== null)
    .sort((a, b) => timeToMinutes(a.time)! - timeToMinutes(b.time)!);
}

/** Pares de comidas activas que quedaron a menos de MIN_GAP_MINUTES. */
export function tooClosePairs(slots: MealSlot[]): { a: MealSlot; b: MealSlot; minutes: number }[] {
  const active = sortedEnabled(slots);
  const pairs: { a: MealSlot; b: MealSlot; minutes: number }[] = [];
  for (let i = 1; i < active.length; i++) {
    const minutes = timeToMinutes(active[i].time)! - timeToMinutes(active[i - 1].time)!;
    if (minutes < MIN_GAP_MINUTES) pairs.push({ a: active[i - 1], b: active[i], minutes });
  }
  return pairs;
}

export type MealReminderKind = "first" | "followup";

export type DueReminder = {
  slot: MealSlot;
  kind: MealReminderKind;
  /** Con qué clave se deduplica en meal_reminders_sent. */
  dedupeKey: string;
  title: string;
  body: string;
  url: string;
};

function buildReminder(slot: MealSlot, kind: MealReminderKind): DueReminder {
  const copy = MEAL_COPY[slot.key];
  if (kind === "first") {
    return { slot, kind, dedupeKey: slot.key, title: copy.title, body: copy.body, url: "/app/nutrition" };
  }
  return {
    slot, kind,
    // Sufijo propio para que el seguimiento se deduplique por su cuenta y no choque con la
    // fila del aviso principal, que ya está guardada de una hora antes.
    dedupeKey: `${slot.key}:followup`,
    title: `¿Olvidaste tomarle foto a tu ${copy.noun}?`,
    body: FOLLOWUP_BODY,
    // Abre directo el panel de nota de voz, que es lo que propone el mensaje.
    url: "/app/nutrition?closeDay=1",
  };
}

/**
 * Qué aviso de comida toca en este momento, o null.
 *
 * Cada comida activa genera dos: el principal a su hora, y uno de seguimiento una hora
 * después por si no se registró nada. La ventana de ambos se recorta al hueco que hay
 * hasta la siguiente comida activa, así que juntarlas no hace que una se coma el aviso de
 * la otra. Nunca baja de 10 minutos, para que ninguna quede imposible de disparar.
 */
export function dueReminder(slots: MealSlot[], minutesOfDay: number): DueReminder | null {
  const active = sortedEnabled(slots);

  // Los principales van primero: si a este minuto le tocaran a la vez el seguimiento de
  // una comida y el principal de la siguiente, gana el principal.
  for (let i = 0; i < active.length; i++) {
    const start = timeToMinutes(active[i].time)!;
    const next = active[i + 1] ? timeToMinutes(active[i + 1].time)! : Infinity;
    const window = Math.max(10, Math.min(MAX_WINDOW_MINUTES, next - start));
    const diff = minutesOfDay - start;
    if (diff >= 0 && diff < window) return buildReminder(active[i], "first");
  }

  for (let i = 0; i < active.length; i++) {
    const start = timeToMinutes(active[i].time)!;
    const next = active[i + 1] ? timeToMinutes(active[i + 1].time)! : Infinity;

    // Sin hueco suficiente no hay seguimiento: el aviso de la comida siguiente ya viene en
    // camino y serían dos notificaciones pegadas.
    if (next - start <= FOLLOWUP_DELAY_MINUTES) continue;

    // Si el seguimiento se pasaría de medianoche tampoco se manda: la deduplicación es por
    // día local y el aviso acabaría contando para el día equivocado.
    const followupStart = start + FOLLOWUP_DELAY_MINUTES;
    if (followupStart >= 1440) continue;

    const window = Math.max(10, Math.min(MAX_WINDOW_MINUTES, next - followupStart));
    const diff = minutesOfDay - followupStart;
    if (diff >= 0 && diff < window) return buildReminder(active[i], "followup");
  }

  return null;
}

/**
 * Franja del día que "cubre" una comida, para decidir si ya se registró algo por esa hora
 * y ahorrarse el aviso.
 *
 * Se toma el punto medio con la comida anterior y con la siguiente, así las franjas de
 * todas las comidas se reparten el día sin solaparse. La primera empieza dos horas antes
 * y la última termina tres horas después, que es el margen que tenían las franjas fijas.
 */
export function logWindowFor(slots: MealSlot[], key: MealSlotKey): { startMin: number; endMin: number } | null {
  const active = sortedEnabled(slots);
  const i = active.findIndex((s) => s.key === key);
  if (i === -1) return null;

  const at = timeToMinutes(active[i].time)!;
  const prev = active[i - 1] ? timeToMinutes(active[i - 1].time)! : null;
  const next = active[i + 1] ? timeToMinutes(active[i + 1].time)! : null;

  return {
    startMin: Math.max(0, prev === null ? at - 120 : Math.ceil((prev + at) / 2)),
    endMin: Math.min(1440, next === null ? at + 180 : Math.ceil((at + next) / 2)),
  };
}
