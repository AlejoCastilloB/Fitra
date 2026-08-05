import { createClient } from "@/lib/supabase/server";

export default async function CoachToday() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: clients } = await supabase
    .from("clients")
    .select("user_id, status, users(email)")
    .eq("trainer_id", user!.id);

  const activeCount = clients?.filter((c) => c.status === "active").length ?? 0;
  const total = clients?.length ?? 0;

  return (
    <div>
      <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 4 }}>Hoy</h1>
      <p style={{ color: "#8A93A0", fontSize: 14, marginBottom: 24 }}>Estado general de tus clientes</p>

      {/* stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 12, marginBottom: 28 }}>
        <StatCard label="Clientes activos" value={activeCount} />
        <StatCard label="Total de clientes" value={total} />
        <StatCard label="Adherencia semanal" value="—" hint="próximamente" />
        <StatCard label="Alertas" value="—" hint="próximamente" />
      </div>

      {/* clientes que necesitan atención — placeholder hasta tener streaks/adherencia */}
      <Section title="Necesitan atención">
        <EmptyState text="Todavía no hay datos de adherencia para mostrar alertas." />
      </Section>

      {/* lista completa de clientes */}
      <Section title="Todos tus clientes">
        {(!clients || clients.length === 0) ? (
          <EmptyState text="Todavía no tenés clientes asignados. Generá un link de invitación para sumar el primero." />
        ) : (
          clients.map((c: any) => (
            <div key={c.user_id} style={{
              display: "flex", justifyContent: "space-between", alignItems: "center",
              padding: "14px 18px", borderRadius: 12, border: "1px solid rgba(255,255,255,0.09)",
              background: "rgba(255,255,255,0.04)", marginBottom: 10,
            }}>
              <span>{c.users?.email}</span>
              <span style={{ fontSize: 12, color: "#8A93A0" }}>{c.status}</span>
            </div>
          ))
        )}
      </Section>
    </div>
  );
}

function StatCard({ label, value, hint }: { label: string; value: string | number; hint?: string }) {
  return (
    <div style={{ padding: 16, borderRadius: 14, border: "1px solid rgba(255,255,255,0.09)", background: "rgba(255,255,255,0.04)" }}>
      <div style={{ fontSize: 22, fontWeight: 700 }}>{value}</div>
      <div style={{ fontSize: 12, color: "#8A93A0", marginTop: 2 }}>{label}</div>
      {hint && <div style={{ fontSize: 10.5, color: "#5B6472", marginTop: 2 }}>{hint}</div>}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 28 }}>
      <h2 style={{ fontSize: 14, fontWeight: 700, color: "#B9C2CE", marginBottom: 10, textTransform: "uppercase", letterSpacing: "0.04em" }}>{title}</h2>
      {children}
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div style={{ padding: 24, borderRadius: 14, border: "1px solid rgba(255,255,255,0.09)", background: "rgba(255,255,255,0.04)", color: "#8A93A0", fontSize: 13.5, textAlign: "center" }}>
      {text}
    </div>
  );
}
