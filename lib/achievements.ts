export type AchievementCategory =
  | "entrenamiento" | "racha" | "records" | "volumen" | "constancia" | "nutricion" | "progreso";

export type Achievement = {
  key: string;
  emoji: string;
  title: string;
  /** Qué hay que hacer para conseguirla, en infinitivo. De ahí salen las dos frases de la
   *  ficha: "La ganaste por completar…" y "Desbloquearás esta insignia cuando completes…". */
  description: string;
  category: AchievementCategory;
};

export const CATEGORY_LABELS: Record<AchievementCategory, string> = {
  entrenamiento: "Entrenamientos",
  racha: "Rachas",
  records: "Récords",
  volumen: "Volumen y series",
  constancia: "Constancia y horarios",
  nutricion: "Nutrición",
  progreso: "Progreso y perfil",
};

// Los emojis son a propósito de objetos y símbolos, no de personas: un muñeco levantando
// pesas se dibuja como hombre en casi todos los teléfonos y no representa a media app.
export const ACHIEVEMENTS: Achievement[] = [
  // Entrenamientos
  { key: "first_workout", emoji: "🎯", title: "Primer paso", description: "Completar tu primer entrenamiento", category: "entrenamiento" },
  { key: "workouts_5", emoji: "✨", title: "Ya es costumbre", description: "Completar 5 entrenamientos", category: "entrenamiento" },
  { key: "workouts_10", emoji: "💪", title: "Constante", description: "Completar 10 entrenamientos", category: "entrenamiento" },
  { key: "workouts_25", emoji: "⚡", title: "Con impulso", description: "Completar 25 entrenamientos", category: "entrenamiento" },
  { key: "workouts_50", emoji: "🔥", title: "Imparable", description: "Completar 50 entrenamientos", category: "entrenamiento" },
  { key: "workouts_100", emoji: "💯", title: "Centurión", description: "Completar 100 entrenamientos", category: "entrenamiento" },
  { key: "workouts_250", emoji: "🛡️", title: "Veterano", description: "Completar 250 entrenamientos", category: "entrenamiento" },
  { key: "workouts_500", emoji: "👑", title: "Leyenda", description: "Completar 500 entrenamientos", category: "entrenamiento" },

  // Rachas (semanas seguidas entrenando)
  { key: "streak_2", emoji: "🌱", title: "Arrancando", description: "Encadenar 2 semanas seguidas entrenando", category: "racha" },
  { key: "streak_4", emoji: "📅", title: "Un mes sólido", description: "Encadenar 4 semanas seguidas entrenando", category: "racha" },
  { key: "streak_8", emoji: "🗓️", title: "Dos meses", description: "Encadenar 8 semanas seguidas entrenando", category: "racha" },
  { key: "streak_12", emoji: "⛰️", title: "Trimestre perfecto", description: "Encadenar 12 semanas seguidas entrenando", category: "racha" },
  { key: "streak_26", emoji: "🏔️", title: "Medio año", description: "Encadenar 26 semanas seguidas entrenando", category: "racha" },
  { key: "streak_52", emoji: "🎆", title: "Un año entero", description: "Encadenar 52 semanas seguidas entrenando", category: "racha" },

  // Récords personales
  { key: "first_pr", emoji: "🏆", title: "Primer récord", description: "Lograr tu primer récord personal", category: "records" },
  { key: "prs_5", emoji: "🥇", title: "Rompe récords", description: "Lograr 5 récords personales", category: "records" },
  { key: "prs_10", emoji: "🥈", title: "Subiendo cargas", description: "Lograr 10 récords personales", category: "records" },
  { key: "prs_20", emoji: "🌟", title: "Máquina de récords", description: "Lograr 20 récords personales", category: "records" },
  { key: "prs_50", emoji: "💎", title: "Fuera de serie", description: "Lograr 50 récords personales", category: "records" },

  // Volumen y series
  { key: "volume_1k", emoji: "🪨", title: "Primera tonelada", description: "Acumular 1.000 kg de volumen", category: "volumen" },
  { key: "volume_10k", emoji: "🏅", title: "10 toneladas", description: "Acumular 10.000 kg de volumen", category: "volumen" },
  { key: "volume_50k", emoji: "🚚", title: "50 toneladas", description: "Acumular 50.000 kg de volumen", category: "volumen" },
  { key: "volume_100k", emoji: "🚀", title: "100 toneladas", description: "Acumular 100.000 kg de volumen", category: "volumen" },
  { key: "volume_500k", emoji: "🌊", title: "500 toneladas", description: "Acumular 500.000 kg de volumen", category: "volumen" },
  { key: "volume_1m", emoji: "🌋", title: "Un millón", description: "Acumular 1.000.000 kg de volumen", category: "volumen" },
  { key: "sets_100", emoji: "🧱", title: "Cien series", description: "Registrar 100 series", category: "volumen" },
  { key: "sets_500", emoji: "🏗️", title: "Quinientas series", description: "Registrar 500 series", category: "volumen" },
  { key: "sets_2000", emoji: "🏛️", title: "Dos mil series", description: "Registrar 2.000 series", category: "volumen" },
  { key: "sets_5000", emoji: "🗿", title: "Cinco mil series", description: "Registrar 5.000 series", category: "volumen" },
  { key: "big_session", emoji: "💣", title: "Sesión bestial", description: "Hacer 10.000 kg de volumen en un solo entrenamiento", category: "volumen" },

  // Constancia y horarios
  { key: "time_10h", emoji: "⏱️", title: "10 horas", description: "Acumular 10 horas entrenando", category: "constancia" },
  { key: "time_50h", emoji: "⏰", title: "50 horas", description: "Acumular 50 horas entrenando", category: "constancia" },
  { key: "time_100h", emoji: "🕰️", title: "100 horas", description: "Acumular 100 horas entrenando", category: "constancia" },
  { key: "time_500h", emoji: "♾️", title: "500 horas", description: "Acumular 500 horas entrenando", category: "constancia" },
  { key: "long_session", emoji: "🐢", title: "Sesión larga", description: "Entrenar 90 minutos seguidos en una sesión", category: "constancia" },
  { key: "early_bird", emoji: "🌅", title: "Madrugador", description: "Entrenar 5 veces antes de las 7 de la mañana", category: "constancia" },
  { key: "night_owl", emoji: "🌙", title: "De noche", description: "Entrenar 5 veces después de las 9 de la noche", category: "constancia" },
  { key: "weekend_10", emoji: "🏖️", title: "Sin fines de semana", description: "Entrenar 10 veces en sábado o domingo", category: "constancia" },
  { key: "week_5", emoji: "📈", title: "Semana completa", description: "Entrenar 5 veces en una misma semana", category: "constancia" },
  { key: "days_30", emoji: "🧭", title: "30 días distintos", description: "Entrenar en 30 días diferentes", category: "constancia" },
  { key: "days_100", emoji: "🗺️", title: "100 días distintos", description: "Entrenar en 100 días diferentes", category: "constancia" },
  { key: "exercises_10", emoji: "🧩", title: "Explorando", description: "Entrenar 10 ejercicios distintos", category: "constancia" },
  { key: "exercises_30", emoji: "🎨", title: "Repertorio amplio", description: "Entrenar 30 ejercicios distintos", category: "constancia" },
  { key: "exercises_60", emoji: "🔭", title: "Sin límites", description: "Entrenar 60 ejercicios distintos", category: "constancia" },

  // Nutrición
  { key: "first_food_log", emoji: "🍽️", title: "Primer registro", description: "Registrar tu primera comida", category: "nutricion" },
  { key: "food_logs_10", emoji: "🍎", title: "Buen hábito", description: "Registrar 10 comidas", category: "nutricion" },
  { key: "food_logs_50", emoji: "🥗", title: "Nutrición al día", description: "Registrar 50 comidas", category: "nutricion" },
  { key: "food_logs_150", emoji: "🍲", title: "Sin fallar", description: "Registrar 150 comidas", category: "nutricion" },
  { key: "food_logs_365", emoji: "📗", title: "Un año de registros", description: "Registrar 365 comidas", category: "nutricion" },
  { key: "water_first", emoji: "💧", title: "Hidratado", description: "Registrar agua por primera vez", category: "nutricion" },
  { key: "water_50", emoji: "🚰", title: "Siempre con agua", description: "Registrar agua 50 veces", category: "nutricion" },

  // Progreso y perfil
  { key: "photo_first", emoji: "📸", title: "Progreso visual", description: "Subir tu primera foto de progreso", category: "progreso" },
  { key: "photos_5", emoji: "🖼️", title: "Línea de tiempo", description: "Subir 5 fotos de progreso", category: "progreso" },
  { key: "routine_created", emoji: "📝", title: "Arquitecto", description: "Crear tu primera rutina propia", category: "progreso" },
  { key: "routines_5", emoji: "🧰", title: "Tu propio plan", description: "Crear 5 rutinas propias", category: "progreso" },
  { key: "email_confirmado", emoji: "📬", title: "Correo verificado", description: "Confirmar tu correo", category: "progreso" },
];

export type AchievementStats = {
  totalWorkouts: number;
  /** Semanas seguidas entrenando. */
  currentStreak: number;
  totalPRs: number;
  totalVolume: number;
  totalSets: number;
  bestSessionVolume: number;
  totalTrainingSec: number;
  longestSessionSec: number;
  earlyWorkouts: number;
  nightWorkouts: number;
  weekendWorkouts: number;
  bestWorkoutsInAWeek: number;
  distinctTrainingDays: number;
  distinctExercises: number;
  totalFoodLogs: number;
  waterLogs: number;
  photoCount: number;
  ownRoutines: number;
  emailConfirmed: boolean;
};

/** Umbral simple: la insignia `key` se desbloquea cuando `value >= min`. */
const THRESHOLDS: [key: string, field: keyof AchievementStats, min: number][] = [
  ["first_workout", "totalWorkouts", 1],
  ["workouts_5", "totalWorkouts", 5],
  ["workouts_10", "totalWorkouts", 10],
  ["workouts_25", "totalWorkouts", 25],
  ["workouts_50", "totalWorkouts", 50],
  ["workouts_100", "totalWorkouts", 100],
  ["workouts_250", "totalWorkouts", 250],
  ["workouts_500", "totalWorkouts", 500],

  ["streak_2", "currentStreak", 2],
  ["streak_4", "currentStreak", 4],
  ["streak_8", "currentStreak", 8],
  ["streak_12", "currentStreak", 12],
  ["streak_26", "currentStreak", 26],
  ["streak_52", "currentStreak", 52],

  ["first_pr", "totalPRs", 1],
  ["prs_5", "totalPRs", 5],
  ["prs_10", "totalPRs", 10],
  ["prs_20", "totalPRs", 20],
  ["prs_50", "totalPRs", 50],

  ["volume_1k", "totalVolume", 1000],
  ["volume_10k", "totalVolume", 10000],
  ["volume_50k", "totalVolume", 50000],
  ["volume_100k", "totalVolume", 100000],
  ["volume_500k", "totalVolume", 500000],
  ["volume_1m", "totalVolume", 1000000],
  ["sets_100", "totalSets", 100],
  ["sets_500", "totalSets", 500],
  ["sets_2000", "totalSets", 2000],
  ["sets_5000", "totalSets", 5000],
  ["big_session", "bestSessionVolume", 10000],

  ["time_10h", "totalTrainingSec", 10 * 3600],
  ["time_50h", "totalTrainingSec", 50 * 3600],
  ["time_100h", "totalTrainingSec", 100 * 3600],
  ["time_500h", "totalTrainingSec", 500 * 3600],
  ["long_session", "longestSessionSec", 90 * 60],
  ["early_bird", "earlyWorkouts", 5],
  ["night_owl", "nightWorkouts", 5],
  ["weekend_10", "weekendWorkouts", 10],
  ["week_5", "bestWorkoutsInAWeek", 5],
  ["days_30", "distinctTrainingDays", 30],
  ["days_100", "distinctTrainingDays", 100],
  ["exercises_10", "distinctExercises", 10],
  ["exercises_30", "distinctExercises", 30],
  ["exercises_60", "distinctExercises", 60],

  ["first_food_log", "totalFoodLogs", 1],
  ["food_logs_10", "totalFoodLogs", 10],
  ["food_logs_50", "totalFoodLogs", 50],
  ["food_logs_150", "totalFoodLogs", 150],
  ["food_logs_365", "totalFoodLogs", 365],
  ["water_first", "waterLogs", 1],
  ["water_50", "waterLogs", 50],

  ["photo_first", "photoCount", 1],
  ["photos_5", "photoCount", 5],
  ["routine_created", "ownRoutines", 1],
  ["routines_5", "ownRoutines", 5],
];

export function computeUnlockedKeys(stats: AchievementStats): string[] {
  const unlocked = THRESHOLDS
    .filter(([, field, min]) => (stats[field] as number) >= min)
    .map(([key]) => key);
  if (stats.emailConfirmed) unlocked.push("email_confirmado");
  return unlocked;
}
