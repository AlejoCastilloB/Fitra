import { Suspense } from "react";
import NutritionContent from "@/components/NutritionContent";

export default function NutritionPage() {
  return (
    <Suspense fallback={null}>
      <NutritionContent />
    </Suspense>
  );
}
