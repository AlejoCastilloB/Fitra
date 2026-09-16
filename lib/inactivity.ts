/**
 * A quién se le da un toque por llevar tiempo sin abrir la app.
 *
 * La lógica vive aparte del cron para poder probarla: son reglas con fechas, husos y una
 * condición de "ya avisado" que es fácil equivocar, y equivocarse aquí significa o no
 * avisar nunca o avisar todos los días, que es peor.
 */

/** Horas sin abrir la app antes de dar un toque. */
export const HORAS_SIN_ENTRAR = 20;

/** Franja en la que se puede avisar, en la hora de la persona. */
export const DESDE_HORA = 9;
export const HASTA_HORA = 21;

export type EstadoUsuario = {
  lastSeenAt: string | null;
  inactiveNotifiedAt: string | null;
  /** La hora local de la persona, 0-23. */
  localHour: number;
};

export type Decision =
  | { avisar: true; horasFuera: number }
  | { avisar: false; motivo: "nuncaHaEntrado" | "entroHacePoco" | "yaAvisado" | "fueraDeHorario" };

export function decideNudge(u: EstadoUsuario, ahora: Date): Decision {
  // Quien nunca abrió la app desde que existe la columna no cuenta como ausente: no se
  // sabe si lleva un día o seis meses, y el primer contacto no debería ser un reproche.
  if (!u.lastSeenAt) return { avisar: false, motivo: "nuncaHaEntrado" };

  const horasFuera = (ahora.getTime() - new Date(u.lastSeenAt).getTime()) / 3_600_000;
  if (horasFuera < HORAS_SIN_ENTRAR) return { avisar: false, motivo: "entroHacePoco" };

  // Ya se avisó de ESTA ausencia. Solo se vuelve a avisar si entró después del aviso, o
  // sea, si hay una ausencia nueva. Si no, quien se va un mes recibiría un toque diario y
  // acabaría apagando las notificaciones.
  if (u.inactiveNotifiedAt && new Date(u.inactiveNotifiedAt) >= new Date(u.lastSeenAt)) {
    return { avisar: false, motivo: "yaAvisado" };
  }

  if (u.localHour < DESDE_HORA || u.localHour >= HASTA_HORA) {
    return { avisar: false, motivo: "fueraDeHorario" };
  }

  return { avisar: true, horasFuera };
}

/** El texto del aviso, que cambia según cuánto lleve fuera. */
export function nudgeBody(horasFuera: number): string {
  const dias = Math.floor(horasFuera / 24);
  return dias >= 2
    ? `Llevas ${dias} días sin pasar por aquí. Retomar hoy cuesta menos que mañana.`
    : "Llevas un día sin pasar por aquí. Un entreno corto también cuenta.";
}
