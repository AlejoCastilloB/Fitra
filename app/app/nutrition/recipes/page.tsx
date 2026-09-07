import RecipeChat from "@/components/RecipeChat";
import FoodAnamnesisGate from "@/components/FoodAnamnesisGate";
import { isFoodAnamnesisDone } from "@/lib/foodAnamnesis";

export default async function RecipeChatPage() {
  const done = await isFoodAnamnesisDone();
  return (
    <FoodAnamnesisGate done={done}>
      <RecipeChat />
    </FoodAnamnesisGate>
  );
}
