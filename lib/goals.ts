export const GOALS = [
  { id: "fuerza", label: "Fuerza", emoji: "🏋️" },
  { id: "perdida_grasa", label: "Pérdida de grasa", emoji: "🔥" },
  { id: "masa_muscular", label: "Ganancia de masa muscular", emoji: "💪" },
  { id: "rendimiento", label: "Rendimiento deportivo", emoji: "🏆" },
  { id: "salud", label: "Salud general / Fitness en general", emoji: "❤️" },
  { id: "todo", label: "Un poco de todo", emoji: "✨" },
];

export const SPORT_GOAL_ID = "rendimiento";

export function goalLabel(id: string | null | undefined): string {
  return GOALS.find((g) => g.id === id)?.label ?? id ?? "sin especificar";
}
