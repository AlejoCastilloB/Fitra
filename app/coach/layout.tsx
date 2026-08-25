import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getAuthenticatedUser } from "@/lib/supabase/getAuthenticatedUser";
import CoachShell from "@/components/CoachShell";

export default async function CoachLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const user = await getAuthenticatedUser(supabase);
  if (!user) redirect("/login");

  const { data: userRow } = await supabase.from("users").select("role, theme_pref").eq("id", user.id).single();
  if (!userRow) redirect("/onboarding");
  if (userRow.role !== "trainer") redirect("/app");

  return (
    <CoachShell userEmail={user.email} initialTheme={userRow.theme_pref === "dark" ? "dark" : "light"}>
      {children}
    </CoachShell>
  );
}
