"use client";

import { useLayoutEffect } from "react";
import { usePathname } from "next/navigation";
import { usePalette, useTheme, type ThemeName } from "@/lib/theme";
import BottomNav from "@/components/BottomNav";
import ActiveWorkoutPill from "@/components/ActiveWorkoutPill";
import AchievementChecker from "@/components/AchievementChecker";
import HomeFab from "@/components/HomeFab";
import RestAlarm from "@/components/RestAlarm";
import TimezoneSync from "@/components/TimezoneSync";
import InviteBanner from "@/components/InviteBanner";
import SessionKeepAlive from "@/components/SessionKeepAlive";
import PrecacheWarmup from "@/components/PrecacheWarmup";

const WARMUP_ROUTES = ["/app/progress", "/app/profile", "/app/nutrition", "/app/nutrition/recipes"];

const HIDE_FLOATING_NAV_ROUTES = ["/app/nutrition/recipes"];

export default function AppShell({ children, initialTheme }: { children: React.ReactNode; initialTheme: ThemeName }) {
  const palette = usePalette();
  const { hydrateTheme } = useTheme();
  const pathname = usePathname();
  const hideFloatingNav = HIDE_FLOATING_NAV_ROUTES.includes(pathname ?? "");

  useLayoutEffect(() => { hydrateTheme(initialTheme); }, [initialTheme]);

  return (
    <div style={{
      minHeight: "100vh", background: palette.bg, color: palette.ink, fontFamily: "system-ui, sans-serif",
      position: "relative", transition: "background .3s ease, color .3s ease",
    }}>
      <div style={{
        // El resplandor se hacía con filter: blur(120px) sobre un degradado. Eso obliga al
        // navegador a reservar un búfer aparte y a desenfocarlo, y deja el fondo de la app
        // "no plano", que es lo que encarecía cada tarjeta. Un degradado radial ya es suave
        // por sí solo: se ve igual y no cuesta una capa extra.
        position: "fixed", top: "-15%", left: "-8%", width: 620, height: 620, borderRadius: "50%",
        opacity: 0.2, background: `radial-gradient(circle, ${palette.accent} 0%, transparent 62%)`,
        pointerEvents: "none", zIndex: 0, transition: "background .3s ease",
      }} />

      <main style={{
        position: "relative", zIndex: 1, maxWidth: 480, margin: "0 auto",
        // El área segura solo vale > 0 en la app instalada, donde la barra de estado se
        // dibuja encima del contenido. En el navegador queda en 0 y no cambia nada.
        paddingTop: "calc(env(safe-area-inset-top) + 24px)",
        paddingLeft: 20, paddingRight: 20,
        paddingBottom: hideFloatingNav ? 24 : 110,
      }}>
        <div key={pathname} className="ft-fade-in-up">{children}</div>
      </main>

      <ActiveWorkoutPill />
      <AchievementChecker />
      <RestAlarm />
      <TimezoneSync />
      <SessionKeepAlive />
      <PrecacheWarmup routes={WARMUP_ROUTES} />
      <InviteBanner />
      {!hideFloatingNav && <HomeFab />}
      {!hideFloatingNav && <BottomNav />}
    </div>
  );
}
