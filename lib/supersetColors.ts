export const SUPERSET_COLORS = ["#C77DFF", "#7DD8C6", "#F5A97F", "#7DC4E8", "#F2B8D4", "#FBBF24"];

export function supersetColor(group?: number | null): string {
  if (!group) return SUPERSET_COLORS[0];
  return SUPERSET_COLORS[(group - 1) % SUPERSET_COLORS.length];
}
