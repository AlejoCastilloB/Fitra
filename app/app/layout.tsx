import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { WorkoutSessionProvider } from "@/lib/workoutSession";
import AppShell from "@/components/AppShell";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: userRow } = await supabase.from("users").select("role").eq("id", user.id).single();
  if (!userRow) redirect("/onboarding");
  if (userRow.role !== "client") redirect("/coach");

  return (
    <WorkoutSessionProvider>
      <AppShell>{children}</AppShell>
    </WorkoutSessionProvider>
  );
}
