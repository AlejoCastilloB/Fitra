"use client";

import { useLayoutEffect, useState } from "react";
import { usePalette, useTheme, type ThemeName } from "@/lib/theme";
import { Home, Dumbbell, Users, MessageSquare, Settings, LogOut } from "lucide-react";
import Link from "next/link";

export default function CoachShell({ userEmail, children, initialTheme }: { userEmail: string | undefined; children: React.ReactNode; initialTheme: ThemeName }) {
  const palette = usePalette();
  const { hydrateTheme } = useTheme();

  useLayoutEffect(() => { hydrateTheme(initialTheme); }, [initialTheme]);

  return (
    <div style={{
      minHeight: "100vh", background: palette.bg, color: palette.ink, fontFamily: "system-ui, sans-serif",
      position: "relative", overflow: "hidden", transition: "background .3s ease, color .3s ease",
    }}>
      {/* blobs de luz — esto es lo que hace que el blur se vea */}
      <div style={{
        position: "fixed", top: "-15%", left: "-8%", width: 500, height: 500, borderRadius: "50%",
        filter: "blur(120px)", opacity: 0.22, background: `radial-gradient(circle, ${palette.accent}, transparent 70%)`,
        pointerEvents: "none",
      }} />
      <div style={{
        position: "fixed", bottom: "-18%", right: "-10%", width: 460, height: 460, borderRadius: "50%",
        filter: "blur(130px)", opacity: 0.14, background: `radial-gradient(circle, ${palette.accentDeep}, transparent 70%)`,
        pointerEvents: "none",
      }} />

      <div style={{ position: "relative", zIndex: 1, display: "flex", minHeight: "100vh" }}>
        <aside style={{
          width: 230, flexShrink: 0, borderRight: `1px solid ${palette.panelBorder}`,
          background: palette.panel, backdropFilter: "blur(24px)", WebkitBackdropFilter: "blur(24px)",
          padding: "24px 14px", display: "flex", flexDirection: "column", gap: 4,
        }}>
          <div style={{ fontWeight: 700, fontSize: 17, padding: "0 10px 24px", letterSpacing: "-0.01em" }}>FitTrack</div>

          <NavItem href="/coach" icon={<Home size={17} />} label="Hoy" />
          <NavItem href="/coach/clients" icon={<Users size={17} />} label="Clientes" />
          <NavItem href="/coach/routines" icon={<Dumbbell size={17} />} label="Rutinas" />
          <NavItem href="/coach/exercises" icon={<Dumbbell size={17} />} label="Ejercicios" />
          <NavItem href="/coach/message" icon={<MessageSquare size={17} />} label="Mensajes" />

          <div style={{ flex: 1 }} />

          <NavItem href="/coach/settings" icon={<Settings size={17} />} label="Ajustes" />

          <div style={{
            display: "flex", alignItems: "center", gap: 10, padding: "12px 10px", marginTop: 8,
            borderTop: `1px solid ${palette.panelBorder}`,
          }}>
            <div style={{
              width: 30, height: 30, borderRadius: "50%", background: `${palette.accent}33`,
              display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12.5, fontWeight: 700, color: palette.accent, flexShrink: 0,
            }}>
              {userEmail?.[0]?.toUpperCase()}
            </div>
            <span style={{ fontSize: 12.5, color: palette.inkDim, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1 }}>
              {userEmail}
            </span>
            <form action="/auth/signout" method="post">
              <button type="submit" style={{ background: "none", border: "none", color: palette.inkDim, cursor: "pointer", display: "flex" }}>
                <LogOut size={15} />
              </button>
            </form>
          </div>
        </aside>

        <main style={{ flex: 1, padding: 32 }}>{children}</main>
      </div>
    </div>
  );
}

function NavItem({ href, icon, label }: { href: string; icon: React.ReactNode; label: string }) {
  const palette = usePalette();
  const [hover, setHover] = useState(false);
  return (
    <Link
      href={href}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        display: "flex", alignItems: "center", gap: 10, padding: "10px 10px", borderRadius: 10,
        color: hover ? palette.ink : palette.inkDim, textDecoration: "none", fontSize: 14, fontWeight: 500,
        background: hover ? palette.panelHover : "transparent",
        transition: "background .15s ease, color .15s ease",
      }}
    >
      {icon} {label}
    </Link>
  );
}
