import { Suspense } from "react";
import ProgressTabs from "@/components/ProgressTabs";
import { isFoodAnamnesisDone } from "@/lib/foodAnamnesis";

export default async function ProgressPage() {
  // La pestaña de nutrición de aquí es la MISMA pantalla que /app/nutrition, así que pide
  // lo mismo: antes esta ruta se saltaba la anamnesis por completo y la otra la exigía.
  const anamnesisDone = await isFoodAnamnesisDone();
  return (
    <Suspense fallback={null}>
      <ProgressTabs anamnesisDone={anamnesisDone} />
    </Suspense>
  );
}
