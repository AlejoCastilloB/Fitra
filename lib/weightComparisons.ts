export type WeightComparison = { threshold: number; emoji: string; text: string };

// ordenado ascendente por threshold en kg — se elige la última entrada cuyo threshold sea <= al volumen movido
const COMPARISONS: WeightComparison[] = [
  { threshold: 0, emoji: "🔥", text: "apenas estás calentando" },
  { threshold: 50, emoji: "🧳", text: "una maleta de viaje bien cargada" },
  { threshold: 100, emoji: "🧊", text: "un refrigerador" },
  { threshold: 150, emoji: "🎹", text: "un piano de cola pequeño" },
  { threshold: 200, emoji: "🛋️", text: "un sofá de tres puestos" },
  { threshold: 300, emoji: "🐼", text: "un oso panda adulto" },
  { threshold: 400, emoji: "🏍️", text: "una moto grande" },
  { threshold: 500, emoji: "🐎", text: "un caballo de carreras" },
  { threshold: 650, emoji: "🐄", text: "una vaca adulta" },
  { threshold: 800, emoji: "🎳", text: "una máquina de boliche completa" },
  { threshold: 1000, emoji: "🐴", text: "un caballo grande (¡ya moviste 1 tonelada!)" },
  { threshold: 1300, emoji: "🚗", text: "un auto pequeño" },
  { threshold: 1600, emoji: "🦏", text: "un rinoceronte bebé" },
  { threshold: 2000, emoji: "🛻", text: "una camioneta" },
  { threshold: 2500, emoji: "🦛", text: "un hipopótamo joven" },
  { threshold: 3000, emoji: "🐘", text: "un elefante bebé" },
  { threshold: 3500, emoji: "⛵", text: "un velero pequeño" },
  { threshold: 4000, emoji: "🚚", text: "un camión de reparto" },
  { threshold: 5000, emoji: "🚌", text: "un autobús escolar" },
  { threshold: 6000, emoji: "🦒", text: "una jirafa adulta" },
  { threshold: 7000, emoji: "🐘", text: "un elefante africano adulto" },
  { threshold: 8000, emoji: "📦", text: "un contenedor de carga pequeño" },
  { threshold: 9000, emoji: "🗑️", text: "un camión de basura" },
  { threshold: 10000, emoji: "🐳", text: "una ballena beluga joven (¡10 toneladas!)" },
  { threshold: 11500, emoji: "🚌", text: "un autobús articulado" },
  { threshold: 13000, emoji: "💧", text: "un tanque de agua gigante" },
  { threshold: 14000, emoji: "🦖", text: "un T-Rex (según los cálculos de los paleontólogos)" },
  { threshold: 15500, emoji: "🚃", text: "un vagón de tren pequeño" },
  { threshold: 17000, emoji: "🛥️", text: "un yate pequeño" },
  { threshold: 18500, emoji: "🐋", text: "una ballena gris joven" },
  { threshold: 20000, emoji: "✈️", text: "¡un avión pequeño completo!" },
];

const BEYOND: WeightComparison = { threshold: 20000, emoji: "🚀", text: "rompiste la escala — sos una máquina" };

export function getWeightComparison(volumeKg: number): WeightComparison {
  if (volumeKg > 20000) return BEYOND;
  let best = COMPARISONS[0];
  for (const c of COMPARISONS) {
    if (volumeKg >= c.threshold) best = c;
    else break;
  }
  return best;
}
