"use client";

import { useState } from "react";
import FoodAnamnesisFlow from "@/components/FoodAnamnesisFlow";

/**
 * Muestra la anamnesis alimentaria antes de la pantalla de nutrición, si falta.
 *
 * El dato llega ya resuelto desde el servidor (lib/foodAnamnesis): este componente solo
 * decide qué pintar y recuerda que se acaba de completar, sin volver a preguntar.
 */
export default function FoodAnamnesisGate({
  done, children,
}: { done: boolean; children: React.ReactNode }) {
  const [completada, setCompletada] = useState(done);

  if (!completada) return <FoodAnamnesisFlow onDone={() => setCompletada(true)} />;
  return <>{children}</>;
}
