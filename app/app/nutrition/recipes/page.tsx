import { redirect } from "next/navigation";
import RecipeChat from "@/components/RecipeChat";
import FoodAnamnesisGate from "@/components/FoodAnamnesisGate";
import { isFoodAnamnesisDone } from "@/lib/foodAnamnesis";
import { getAppUser } from "@/lib/getAppUser";

export default async function RecipeChatPage() {
  const { nutritionEnabled } = await getAppUser();
  if (!nutritionEnabled) redirect("/app");

  const done = await isFoodAnamnesisDone();
  return (
    <FoodAnamnesisGate done={done}>
      <RecipeChat />
    </FoodAnamnesisGate>
  );
}
