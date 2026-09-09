import { Suspense } from "react";
import { redirect } from "next/navigation";
import NutritionContent from "@/components/NutritionContent";
import FoodAnamnesisGate from "@/components/FoodAnamnesisGate";
import { isFoodAnamnesisDone } from "@/lib/foodAnamnesis";
import { getAppUser } from "@/lib/getAppUser";

export default async function NutritionPage() {
  // Se comprueba aquí y no solo escondiendo el enlace: si solo se quita del menú, la URL
  // sigue abierta para quien la tenga guardada o llegue desde una notificación vieja.
  const { nutritionEnabled } = await getAppUser();
  if (!nutritionEnabled) redirect("/app");

  const done = await isFoodAnamnesisDone();
  return (
    <FoodAnamnesisGate done={done}>
      <Suspense fallback={null}>
        <NutritionContent />
      </Suspense>
    </FoodAnamnesisGate>
  );
}
