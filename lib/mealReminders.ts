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

export const MEAL_COPY: Record<MealSlotKey, { title: string; body: string }> = {
  breakfast: { title: "¿Qué vas a desayunar hoy?", body: "Registra tu desayuno para arrancar bien el día." },
  morning_snack: { title: "¿Piensas comer algún snack?", body: "Regístralo y sigue sumando a tu progreso." },
  lunch: { title: "¿Qué hay de almuerzo?", body: "Regístralo y mantén tus macros al día." },
  afternoon_snack: { title: "¿Merienda a la vista?", body: "Regístrala y sigue sumando a tu progreso." },
  dinner: { title: "¿Qué vas a cenar?", body: "Registra tu cena para cerrar el día con tus macros completos." },
};

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

/**
 * Qué comida toca avisar en este momento, o null.
 *
 * La ventana de cada comida se recorta al hueco que hay hasta la siguiente activa: si
 * alguien pone el desayuno a las 7:00 y el snack a las 7:30, la del desayuno dura media
 * hora y no se come la del snack. Nunca baja de 10 minutos, para que ninguna comida quede
 * imposible de disparar; si dos coinciden a la misma hora solo sale la primera, y de eso
 * avisa la pantalla de ajustes.
 */
export function dueMeal(slots: MealSlot[], minutesOfDay: number): MealSlot | null {
  const active = sortedEnabled(slots);
  for (let i = 0; i < active.length; i++) {
    const start = timeToMinutes(active[i].time)!;
    const next = active[i + 1] ? timeToMinutes(active[i + 1].time)! : Infinity;
    const window = Math.max(10, Math.min(MAX_WINDOW_MINUTES, next - start));
    const diff = minutesOfDay - start;
    if (diff >= 0 && diff < window) return active[i];
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
