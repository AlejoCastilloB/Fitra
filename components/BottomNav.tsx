"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Dumbbell, Apple, User } from "lucide-react";
import { palette } from "@/lib/theme";

const ITEMS = [
  { href: "/app", icon: Home, label: "Hoy" },
  { href: "/app/routines", icon: Dumbbell, label: "Rutinas" },
  { href: "/app/nutrition", icon: Apple, label: "Nutrición" },
  { href: "/app/profile", icon: User, label: "Perfil" },
];

export default function BottomNav() {
  const pathname = usePathname();
  const [visible, setVisible] = useState(true);
  const lastY = useRef(0);

  useEffect(() => {
    lastY.current = window.scrollY;
    function onScroll() {
      const y = window.scrollY;
      const diff = y - lastY.current;
      if (y < 40) setVisible(true);
      else if (diff > 6) setVisible(false);
      else if (diff < -6) setVisible(true);
      lastY.current = y;
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <nav
      style={{
        position: "fixed", left: "50%", bottom: 18, zIndex: 50,
        display: "flex", gap: 4, padding: 8, borderRadius: 20,
        background: palette.panel, border: `1px solid ${palette.panelBorder}`,
        backdropFilter: "blur(24px)", WebkitBackdropFilter: "blur(24px)",
        boxShadow: "0 12px 40px -12px rgba(0,0,0,0.5)",
        transform: `translate3d(-50%, ${visible ? 0 : 120}px, 0)`,
        WebkitTransform: `translate3d(-50%, ${visible ? 0 : 120}px, 0)`,
        transition: "transform .35s cubic-bezier(.16,.8,.24,1)",
        willChange: "transform",
      }}
    >
      {ITEMS.map(({ href, icon: Icon, label }) => {
        const active = pathname === href;
        return (
          <Link key={href} href={href} style={{
            display: "flex", flexDirection: "column", alignItems: "center", gap: 3, padding: "8px 16px",
            borderRadius: 14, color: active ? palette.accent : palette.inkDim, textDecoration: "none",
            background: active ? `${palette.accent}18` : "transparent",
          }}>
            <Icon size={19} />
            <span style={{ fontSize: 9.5, fontWeight: 600 }}>{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
