"use client";

import { useLayoutEffect, useState } from "react";
import { usePalette, useTheme, type ThemeName } from "@/lib/theme";
import { Home, Dumbbell, Users, MessageSquare, Settings, LogOut, Menu, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { clearSwCache } from "@/lib/clearSwCache";
import SessionKeepAlive from "@/components/SessionKeepAlive";
import PrecacheWarmup from "@/components/PrecacheWarmup";

const WARMUP_ROUTES = ["/coach/clients", "/coach/routines", "/coach/exercises", "/coach/message"];

const MAIN_NAV = [
  { href: "/coach", icon: Home, label: "Hoy" },
  { href: "/coach/clients", icon: Users, label: "Clientes" },
  { href: "/coach/routines", icon: Dumbbell, label: "Rutinas" },
  { href: "/coach/settings", icon: Settings, label: "Ajustes" },
];

const MORE_NAV = [
  { href: "/coach/exercises", icon: Dumbbell, label: "Ejercicios" },
  { href: "/coach/message", icon: MessageSquare, label: "Mensajes" },
];

export default function CoachShell({ userEmail, children, initialTheme }: { userEmail: string | undefined; children: React.ReactNode; initialTheme: ThemeName }) {
  const palette = usePalette();
  const { hydrateTheme } = useTheme();
  const pathname = usePathname();
  const [moreOpen, setMoreOpen] = useState(false);

  useLayoutEffect(() => { hydrateTheme(initialTheme); }, [initialTheme]);

  return (
    <div style={{
      minHeight: "100vh", background: palette.bg, color: palette.ink, fontFamily: "system-ui, sans-serif",
      position: "relative", overflow: "hidden", transition: "background .3s ease, color .3s ease",
    }}>
      <SessionKeepAlive />
      <PrecacheWarmup routes={WARMUP_ROUTES} />
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
        <aside className="coach-desktop-only" style={{
          width: 230, flexShrink: 0, borderRight: `1px solid ${palette.panelBorder}`,
          background: palette.panel, backdropFilter: "blur(24px)", WebkitBackdropFilter: "blur(24px)",
          padding: "24px 14px", flexDirection: "column", gap: 4,
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
            <form action="/auth/signout" method="post" onSubmit={clearSwCache}>
              <button type="submit" style={{ background: "none", border: "none", color: palette.inkDim, cursor: "pointer", display: "flex" }}>
                <LogOut size={15} />
              </button>
            </form>
          </div>
        </aside>

        <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
          <div className="coach-mobile-topbar" style={{
            alignItems: "center", justifyContent: "space-between", padding: "16px 18px",
            borderBottom: `1px solid ${palette.panelBorder}`, background: palette.panel,
            backdropFilter: "blur(24px)", WebkitBackdropFilter: "blur(24px)", position: "sticky", top: 0, zIndex: 40,
          }}>
            <span style={{ fontWeight: 700, fontSize: 16, letterSpacing: "-0.01em" }}>FitTrack</span>
            <button onClick={() => setMoreOpen(true)} aria-label="Más opciones" style={{
              background: "none", border: "none", color: palette.ink, cursor: "pointer", display: "flex",
            }}>
              <Menu size={22} />
            </button>
          </div>

          <main className="coach-main" style={{ flex: 1 }}><div key={pathname} className="ft-fade-in-up">{children}</div></main>
        </div>
      </div>

      <nav className="coach-mobile-only" style={{
        position: "fixed", left: "50%", bottom: 14, zIndex: 50, transform: "translateX(-50%)",
        gap: 2, padding: 6, borderRadius: 18,
        background: `${palette.bg}99`, border: `1px solid ${palette.panelBorder}`,
        backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)",
        boxShadow: "0 12px 40px -12px rgba(0,0,0,0.5)",
      }}>
        {MAIN_NAV.map(({ href, icon: Icon, label }) => {
          const active = pathname === href;
          return (
            <Link key={href} href={href} style={{
              display: "flex", flexDirection: "column", alignItems: "center", gap: 3, padding: "8px 15px",
              borderRadius: 13, color: active ? palette.accent : palette.inkDim, textDecoration: "none",
              background: active ? `${palette.accent}18` : "transparent",
            }}>
              <Icon size={18} />
              <span style={{ fontSize: 9.5, fontWeight: 600 }}>{label}</span>
            </Link>
          );
        })}
      </nav>

      {moreOpen && (
        <div
          onClick={() => setMoreOpen(false)}
          style={{
            position: "fixed", inset: 0, zIndex: 90, background: "rgba(0,0,0,0.5)",
            display: "flex", alignItems: "flex-end",
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{ ...palette.glassPanel, width: "100%", padding: 18, paddingBottom: "calc(18px + env(safe-area-inset-bottom))" }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
              <span style={{ fontSize: 14, fontWeight: 700 }}>Más</span>
              <button onClick={() => setMoreOpen(false)} style={{ background: "none", border: "none", color: palette.inkDim, cursor: "pointer" }}>
                <X size={18} />
              </button>
            </div>
            {MORE_NAV.map(({ href, icon: Icon, label }) => (
              <Link key={href} href={href} onClick={() => setMoreOpen(false)} style={{
                display: "flex", alignItems: "center", gap: 12, padding: "13px 6px",
                color: palette.ink, textDecoration: "none", fontSize: 14.5, fontWeight: 500,
              }}>
                <Icon size={18} color={palette.accent} /> {label}
              </Link>
            ))}
            <form action="/auth/signout" method="post" onSubmit={clearSwCache}>
              <button type="submit" style={{
                display: "flex", alignItems: "center", gap: 12, padding: "13px 6px", width: "100%",
                background: "none", border: "none", color: palette.inkDim, cursor: "pointer", fontSize: 14.5, fontWeight: 500, textAlign: "left",
              }}>
                <LogOut size={18} /> Cerrar sesión
              </button>
            </form>
          </div>
        </div>
      )}
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
