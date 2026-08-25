import { Suspense } from "react";
import NutritionContent from "@/components/NutritionContent";
import FoodAnamnesisGate from "@/components/FoodAnamnesisGate";

export default function NutritionPage() {
  return (
    <FoodAnamnesisGate>
      <Suspense fallback={null}>
        <NutritionContent />
      </Suspense>
    </FoodAnamnesisGate>
  );
}
