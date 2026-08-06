import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Home, Dumbbell, Apple, User } from "lucide-react";
import Link from "next/link";
import { palette } from "@/lib/theme";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: userRow } = await supabase.from("users").select("role").eq("id", user.id).single();
  if (!userRow) redirect("/onboarding");
  if (userRow.role !== "client") redirect("/coach");

  return (
    <div style={{ minHeight: "100vh", background: palette.bg, color: palette.ink, fontFamily: "system-ui, sans-serif", position: "relative", overflow: "hidden" }}>
      <div style={{
        position: "fixed", top: "-15%", left: "-8%", width: 500, height: 500, borderRadius: "50%",
        filter: "blur(120px)", opacity: 0.2, background: `radial-gradient(circle, ${palette.accent}, transparent 70%)`,
        pointerEvents: "none",
      }} />

      <main style={{ position: "relative", zIndex: 1, padding: "24px 20px 100px", maxWidth: 480, margin: "0 auto" }}>
        {children}
      </main>

      <nav style={{
        position: "fixed", bottom: 18, left: "50%", transform: "translateX(-50%)",
        display: "flex", gap: 4, padding: 8, borderRadius: 20,
        background: palette.panel, border: `1px solid ${palette.panelBorder}`,
        backdropFilter: "blur(24px)", WebkitBackdropFilter: "blur(24px)",
        boxShadow: "0 12px 40px -12px rgba(0,0,0,0.5)", zIndex: 10,
      }}>
        <NavIcon href="/app" icon={<Home size={19} />} label="Hoy" />
        <NavIcon href="/app/routines" icon={<Dumbbell size={19} />} label="Rutinas" />
        <NavIcon href="/app/nutrition" icon={<Apple size={19} />} label="Nutrición" />
        <NavIcon href="/app/profile" icon={<User size={19} />} label="Perfil" />
      </nav>
    </div>
  );
}

function NavIcon({ href, icon, label }: { href: string; icon: React.ReactNode; label: string }) {
  return (
    <Link href={href} style={{
      display: "flex", flexDirection: "column", alignItems: "center", gap: 3, padding: "8px 16px",
      borderRadius: 14, color: palette.inkDim, textDecoration: "none",
    }}>
      {icon}
      <span style={{ fontSize: 9.5, fontWeight: 600 }}>{label}</span>
    </Link>
  );
}
