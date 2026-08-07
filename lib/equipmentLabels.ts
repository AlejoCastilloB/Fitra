const EQUIPMENT_ES: Record<string, string> = {
  barbell: "Barra", dumbbell: "Mancuerna", "ez barbell": "Barra EZ", "olympic barbell": "Barra olímpica",
  "trap bar": "Barra trampa", machine: "Máquina", "leverage machine": "Máquina de palanca",
  "smith machine": "Máquina Smith", "sled machine": "Máquina de trineo", cable: "Polea",
  bodyweight: "Peso corporal", "body weight": "Peso corporal", band: "Banda", "resistance band": "Banda de resistencia",
  kettlebell: "Kettlebell", "medicine ball": "Balón medicinal", "stability ball": "Balón de estabilidad",
  "assisted": "Asistido", roller: "Rodillo", tire: "Llanta", "weighted": "Con peso extra", none: "Sin equipo",
};

export function equipmentLabel(value?: string | null): string {
  if (!value) return "—";
  const key = value.toLowerCase().trim();
  const es = EQUIPMENT_ES[key] ?? value;
  return es.charAt(0).toUpperCase() + es.slice(1);
}
