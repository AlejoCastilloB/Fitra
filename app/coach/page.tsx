import { createClient } from "@/lib/supabase/server";

export default async function CoachToday() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: clients } = await supabase
    .from("clients")
    .select("user_id, status, users(email)")
    .eq("trainer_id", user!.id);

  return (
    <div>
      <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 4 }}>Hoy</h1>
      <p style={{ color: "#8A93A0", fontSize: 14, marginBottom: 24 }}>Estado de tus clientes</p>

      {(!clients || clients.length === 0) && (
        <div style={{
          padding: 32, borderRadius: 16, border: "1px solid rgba(255,255,255,0.09)",
          background: "rgba(255,255,255,0.04)", textAlign: "center", color: "#8A93A0",
        }}>
          Todavía no tenés clientes asignados.
        </div>
      )}

      {clients?.map((c: any) => (
        <div key={c.user_id} style={{
          display: "flex", justifyContent: "space-between", alignItems: "center",
          padding: "14px 18px", borderRadius: 12, border: "1px solid rgba(255,255,255,0.09)",
          background: "rgba(255,255,255,0.04)", marginBottom: 10,
        }}>
          <span>{c.users?.email}</span>
          <span style={{ fontSize: 12, color: "#8A93A0" }}>{c.status}</span>
        </div>
      ))}
    </div>
  );
}
