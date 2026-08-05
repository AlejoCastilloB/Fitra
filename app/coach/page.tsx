import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function CoachDashboard() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: userRow } = await supabase.from("users").select("role").eq("id", user.id).single();
  if (!userRow) redirect("/onboarding");
  if (userRow.role !== "trainer") redirect("/app");

  return (
    <main style={{ minHeight: "100vh", background: "#0A0C10", color: "#E7EAEE", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "system-ui, sans-serif" }}>
      <h1>Dashboard de entrenador 🚧</h1>
    </main>
  );
}
