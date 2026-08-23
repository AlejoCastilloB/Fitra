"use client";

import { useLayoutEffect } from "react";
import { usePalette, useTheme, type ThemeName } from "@/lib/theme";
import BottomNav from "@/components/BottomNav";
import ActiveWorkoutPill from "@/components/ActiveWorkoutPill";
import AchievementChecker from "@/components/AchievementChecker";
import HomeFab from "@/components/HomeFab";
import RestAlarm from "@/components/RestAlarm";
import TimezoneSync from "@/components/TimezoneSync";
import InviteBanner from "@/components/InviteBanner";

export default function AppShell({ children, initialTheme }: { children: React.ReactNode; initialTheme: ThemeName }) {
  const palette = usePalette();
  const { hydrateTheme } = useTheme();

  useLayoutEffect(() => { hydrateTheme(initialTheme); }, [initialTheme]);

  return (
    <div style={{
      minHeight: "100vh", background: palette.bg, color: palette.ink, fontFamily: "system-ui, sans-serif",
      position: "relative", transition: "background .3s ease, color .3s ease",
    }}>
      <div style={{
        position: "fixed", top: "-15%", left: "-8%", width: 500, height: 500, borderRadius: "50%",
        filter: "blur(120px)", opacity: 0.2, background: `radial-gradient(circle, ${palette.accent}, transparent 70%)`,
        pointerEvents: "none", zIndex: 0, transition: "background .3s ease",
      }} />

      <main style={{ position: "relative", zIndex: 1, padding: "24px 20px 110px", maxWidth: 480, margin: "0 auto" }}>
        {children}
      </main>

      <ActiveWorkoutPill />
      <AchievementChecker />
      <RestAlarm />
      <TimezoneSync />
      <InviteBanner />
      <HomeFab />
      <BottomNav />
    </div>
  );
}
