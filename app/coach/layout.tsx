import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Home, Dumbbell, Users, MessageSquare } from "lucide-react";
import Link from "next/link";

const palette = {
  bg: "#0A0C10",
  panel: "rgba(255,255,255,0.055)",
  panelBorder: "rgba(255,255,255,0.09)",
  ink: "#E7EAEE",
  inkDim: "#8A93A0",
  accent: "#B9C2CE",
};

export default async function CoachLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: userRow } = await supabase.from("users").select("role").eq("id", user.id).single();
  if (!userRow) redirect("/onboarding");
  if (userRow.role !== "trainer") redirect("/app");

  return (
    <div style={{ minHeight: "100vh", background: palette.bg, color: palette.ink, fontFamily: "system-ui, sans-serif", display: "flex" }}>
      <aside style={{
        width: 220, flexShrink: 0, borderRight: `1px solid ${palette.panelBorder}`,
        background: palette.panel, backdropFilter: "blur(20px)", padding: "24px 16px",
        display: "flex", flexDirection: "column", gap: 6,
      }}>
        <div style={{ fontWeight: 700, fontSize: 17, padding: "0 8px 22px" }}>FitTrack</div>
        <NavItem href="/coach" icon={<Home size={17} />} label="Hoy" />
        <NavItem href="/coach/clients" icon={<Users size={17} />} label="Clientes" />
        <NavItem href="/coach/exercises" icon={<Dumbbell size={17} />} label="Ejercicios" />
        <NavItem href="/coach/messages" icon={<MessageSquare size={17} />} label="Mensajes" />
      </aside>
      <main style={{ flex: 1, padding: 32 }}>{children}</main>
    </div>
  );
}

function NavItem({ href, icon, label }: { href: string; icon: React.ReactNode; label: string }) {
  return (
    <Link href={href} style={{
      display: "flex", alignItems: "center", gap: 10, padding: "10px 10px", borderRadius: 10,
      color: palette.inkDim, textDecoration: "none", fontSize: 14, fontWeight: 500,
    }}>
      {icon} {label}
    </Link>
  );
}
