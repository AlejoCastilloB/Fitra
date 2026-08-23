"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, TrendingUp, User } from "lucide-react";
import { usePalette } from "@/lib/theme";

const ITEMS = [
  { href: "/app", icon: Home, label: "Inicio" },
  { href: "/app/progress", icon: TrendingUp, label: "Progreso" },
  { href: "/app/profile", icon: User, label: "Perfil" },
];

function getScrollY() {
  return window.scrollY || document.documentElement.scrollTop || document.body.scrollTop || 0;
}

export default function BottomNav() {
  const palette = usePalette();
  const pathname = usePathname();
  const [visible, setVisible] = useState(true);
  const lastY = useRef(0);
  const ticking = useRef(false);

  useEffect(() => {
    lastY.current = getScrollY();

    function update() {
      const y = getScrollY();
      const maxY = document.documentElement.scrollHeight - window.innerHeight;
      const diff = y - lastY.current;

      if (y <= 24) setVisible(true);
      else if (y >= maxY - 4) setVisible(true);
      else if (diff > 5) setVisible(false);
      else if (diff < -5) setVisible(true);

      lastY.current = y;
      ticking.current = false;
    }

    function onScroll() {
      if (!ticking.current) {
        ticking.current = true;
        requestAnimationFrame(update);
      }
    }

    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("touchmove", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("touchmove", onScroll);
    };
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
        const active = pathname === href || (href === "/app/progress" && (pathname?.startsWith("/app/routines") || pathname?.startsWith("/app/nutrition")));
        return (
          <Link key={href} href={href} style={{
            display: "flex", flexDirection: "column", alignItems: "center", gap: 3, padding: "8px 20px",
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
