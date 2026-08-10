import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { palette } from "@/lib/theme";
import BottomNav from "@/components/BottomNav";
import { WorkoutSessionProvider } from "@/lib/workoutSession";
import ActiveWorkoutPill from "@/components/ActiveWorkoutPill";
import AchievementChecker from "@/components/AchievementChecker";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: userRow } = await supabase.from("users").select("role").eq("id", user.id).single();
  if (!userRow) redirect("/onboarding");
  if (userRow.role !== "client") redirect("/coach");

  return (
    <WorkoutSessionProvider>
      <div style={{ minHeight: "100vh", background: palette.bg, color: palette.ink, fontFamily: "system-ui, sans-serif", position: "relative" }}>
        <div style={{
          position: "fixed", top: "-15%", left: "-8%", width: 500, height: 500, borderRadius: "50%",
          filter: "blur(120px)", opacity: 0.2, background: `radial-gradient(circle, ${palette.accent}, transparent 70%)`,
          pointerEvents: "none", zIndex: 0,
        }} />

        <main style={{ position: "relative", zIndex: 1, padding: "24px 20px 110px", maxWidth: 480, margin: "0 auto" }}>
          {children}
        </main>

                <ActiveWorkoutPill />
        <AchievementChecker />
        <BottomNav />
      </div>
    </WorkoutSessionProvider>
  );
}
