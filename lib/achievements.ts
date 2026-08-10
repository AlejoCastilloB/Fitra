export type Achievement = {
  key: string;
  emoji: string;
  title: string;
  description: string;
};

export const ACHIEVEMENTS: Achievement[] = [
  { key: "first_workout", emoji: "🏋️", title: "Primer paso", description: "Completa tu primer entrenamiento" },
  { key: "workouts_10", emoji: "💪", title: "Constante", description: "Completa 10 entrenamientos" },
  { key: "workouts_50", emoji: "⚡", title: "Imparable", description: "Completa 50 entrenamientos" },
  { key: "workouts_100", emoji: "🔥", title: "Centurión", description: "Completa 100 entrenamientos" },
  { key: "streak_4", emoji: "📅", title: "Un mes sólido", description: "4 semanas seguidas de racha" },
  { key: "streak_12", emoji: "🗓️", title: "Trimestre perfecto", description: "12 semanas seguidas de racha" },
  { key: "streak_26", emoji: "🏔️", title: "Medio año", description: "26 semanas seguidas de racha" },
  { key: "streak_52", emoji: "👑", title: "Un año entero", description: "52 semanas seguidas de racha" },
  { key: "first_pr", emoji: "🏆", title: "Primer récord", description: "Logra tu primer récord personal" },
  { key: "prs_5", emoji: "🥇", title: "Rompe récords", description: "Logra 5 récords personales" },
  { key: "prs_20", emoji: "🌟", title: "Máquina de récords", description: "Logra 20 récords personales" },
  { key: "volume_10k", emoji: "🏅", title: "10 toneladas", description: "Acumula 10,000 kg de volumen" },
  { key: "volume_100k", emoji: "🚀", title: "100 toneladas", description: "Acumula 100,000 kg de volumen" },
  { key: "volume_1m", emoji: "🌋", title: "Un millón", description: "Acumula 1,000,000 kg de volumen" },
  { key: "first_food_log", emoji: "🍽️", title: "Primer registro", description: "Registra tu primera comida" },
  { key: "food_logs_10", emoji: "🍎", title: "Buen hábito", description: "Registra 10 comidas" },
  { key: "food_logs_50", emoji: "🥗", title: "Nutrición al día", description: "Registra 50 comidas" },
  { key: "water_first", emoji: "💧", title: "Hidratado", description: "Registra agua por primera vez" },
  { key: "photo_first", emoji: "📸", title: "Progreso visual", description: "Sube tu primera foto de progreso" },
  { key: "routine_created", emoji: "📝", title: "Arquitecto", description: "Crea tu primera rutina propia" },
];

export function computeUnlockedKeys(stats: {
  totalWorkouts: number;
  currentStreak: number;
  totalPRs: number;
  totalVolume: number;
  totalFoodLogs: number;
  hasWater: boolean;
  hasPhoto: boolean;
  hasOwnRoutine: boolean;
}): string[] {
  const unlocked: string[] = [];
  if (stats.totalWorkouts >= 1) unlocked.push("first_workout");
  if (stats.totalWorkouts >= 10) unlocked.push("workouts_10");
  if (stats.totalWorkouts >= 50) unlocked.push("workouts_50");
  if (stats.totalWorkouts >= 100) unlocked.push("workouts_100");
  if (stats.currentStreak >= 4) unlocked.push("streak_4");
  if (stats.currentStreak >= 12) unlocked.push("streak_12");
  if (stats.currentStreak >= 26) unlocked.push("streak_26");
  if (stats.currentStreak >= 52) unlocked.push("streak_52");
  if (stats.totalPRs >= 1) unlocked.push("first_pr");
  if (stats.totalPRs >= 5) unlocked.push("prs_5");
  if (stats.totalPRs >= 20) unlocked.push("prs_20");
  if (stats.totalVolume >= 10000) unlocked.push("volume_10k");
  if (stats.totalVolume >= 100000) unlocked.push("volume_100k");
  if (stats.totalVolume >= 1000000) unlocked.push("volume_1m");
  if (stats.totalFoodLogs >= 1) unlocked.push("first_food_log");
  if (stats.totalFoodLogs >= 10) unlocked.push("food_logs_10");
  if (stats.totalFoodLogs >= 50) unlocked.push("food_logs_50");
  if (stats.hasWater) unlocked.push("water_first");
  if (stats.hasPhoto) unlocked.push("photo_first");
  if (stats.hasOwnRoutine) unlocked.push("routine_created");
  return unlocked;
}
