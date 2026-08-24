export async function checkAiQuota(supabase: any, userId: string, feature: string, limit: number) {
  const today = new Date().toISOString().slice(0, 10);
  const { data: usageRow } = await supabase
    .from("ai_usage").select("messages_used").eq("user_id", userId).eq("date", today).eq("feature", feature).single();
  const used = usageRow?.messages_used ?? 0;
  return { exceeded: used >= limit, today };
}

export async function incrementAiUsage(supabase: any, userId: string, feature: string, today: string) {
  await supabase.rpc("increment_ai_usage", { p_user_id: userId, p_feature: feature });
  const { data: newUsage } = await supabase
    .from("ai_usage").select("messages_used").eq("user_id", userId).eq("date", today).eq("feature", feature).single();
  return newUsage?.messages_used ?? 0;
}
