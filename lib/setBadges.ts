export type SetLike = { set_type: string };

const BADGES: Record<string, { letter: string; color: string }> = {
  warmup: { letter: "C", color: "#FBBF24" },
  dropset: { letter: "D", color: "#C77DFF" },
  failure: { letter: "F", color: "#F87171" },
};

export function getSetBadge(sets: SetLike[], idx: number, accentColor: string) {
  const type = sets[idx].set_type;
  if (type === "normal") {
    const normalNumber = sets.slice(0, idx + 1).filter((s) => s.set_type === "normal").length;
    return { text: String(normalNumber), color: accentColor };
  }
  const b = BADGES[type] ?? { letter: "?", color: accentColor };
  return { text: b.letter, color: b.color };
}

/** Cómo se llama cada tipo de serie fuera de la insignia, cuando hay sitio para el nombre. */
export const SET_TYPE_LABELS: Record<string, string> = {
  warmup: "Calentamiento",
  dropset: "Dropset",
  failure: "Al fallo",
};

/** La insignia de un tipo de serie, o null si es una serie normal (esa lleva su número). */
export function setTypeBadge(type: string): { letter: string; color: string; label: string } | null {
  const b = BADGES[type];
  return b ? { ...b, label: SET_TYPE_LABELS[type] ?? type } : null;
}
