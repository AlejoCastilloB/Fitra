import { Suspense } from "react";
import NutritionContent from "@/components/NutritionContent";
import FoodAnamnesisGate from "@/components/FoodAnamnesisGate";
import { isFoodAnamnesisDone } from "@/lib/foodAnamnesis";

export default async function NutritionPage() {
  const done = await isFoodAnamnesisDone();
  return (
    <FoodAnamnesisGate done={done}>
      <Suspense fallback={null}>
        <NutritionContent />
      </Suspense>
    </FoodAnamnesisGate>
  );
}
