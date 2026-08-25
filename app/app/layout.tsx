import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getAuthenticatedUser } from "@/lib/supabase/getAuthenticatedUser";
import { WorkoutSessionProvider } from "@/lib/workoutSession";
import AppShell from "@/components/AppShell";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const user = await getAuthenticatedUser(supabase);
  if (!user) redirect("/login");

  const { data: userRow } = await supabase.from("users").select("role, theme_pref").eq("id", user.id).single();
  if (!userRow) redirect("/onboarding");
  if (userRow.role !== "client") redirect("/coach");

  return (
    <WorkoutSessionProvider>
      <AppShell initialTheme={userRow.theme_pref === "dark" ? "dark" : "light"}>{children}</AppShell>
    </WorkoutSessionProvider>
  );
}
