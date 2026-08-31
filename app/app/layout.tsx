import { redirect } from "next/navigation";
import { getAppUser } from "@/lib/getAppUser";
import { WorkoutSessionProvider } from "@/lib/workoutSession";
import AppShell from "@/components/AppShell";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { userId, row } = await getAppUser();
  if (!userId) redirect("/login");
  if (!row) redirect("/onboarding");
  if (row.role !== "client") redirect("/coach");

  return (
    <WorkoutSessionProvider>
      <AppShell initialTheme={row.theme_pref === "dark" ? "dark" : "light"}>{children}</AppShell>
    </WorkoutSessionProvider>
  );
}
