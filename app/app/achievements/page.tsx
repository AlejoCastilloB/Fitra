import { createClient } from "@/lib/supabase/server";
import AchievementsContent from "@/components/AchievementsContent";
import { getAppUser } from "@/lib/getAppUser";

export default async function AchievementsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: unlockedRows } = await supabase.from("user_achievements").select("achievement_key").eq("client_id", user!.id);
  const unlockedKeys = (unlockedRows ?? []).map((r) => r.achievement_key);

  const { nutritionEnabled } = await getAppUser();
  return <AchievementsContent unlockedKeys={unlockedKeys} nutritionEnabled={nutritionEnabled} />;
}
