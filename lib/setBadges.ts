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
