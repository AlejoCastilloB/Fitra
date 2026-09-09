import { Suspense } from "react";
import ProgressTabs from "@/components/ProgressTabs";
import { isFoodAnamnesisDone } from "@/lib/foodAnamnesis";
import { getAppUser } from "@/lib/getAppUser";

export default async function ProgressPage() {
  const { nutritionEnabled } = await getAppUser();
  // La pestaña de nutrición de aquí es la MISMA pantalla que /app/nutrition, así que pide
  // lo mismo: antes esta ruta se saltaba la anamnesis por completo y la otra la exigía.
  // Sin nutrición no hace falta ni preguntarlo.
  const anamnesisDone = nutritionEnabled ? await isFoodAnamnesisDone() : true;
  return (
    <Suspense fallback={null}>
      <ProgressTabs anamnesisDone={anamnesisDone} nutritionEnabled={nutritionEnabled} />
    </Suspense>
  );
}
