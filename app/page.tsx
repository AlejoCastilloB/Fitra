import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getAuthenticatedUser } from "@/lib/supabase/getAuthenticatedUser";
import LandingContent from "@/components/landing/LandingContent";

export default async function Home() {
  const supabase = await createClient();
  const user = await getAuthenticatedUser(supabase);

  if (user) {
    const { data: userRow } = await supabase.from("users").select("role").eq("id", user.id).single();
    if (userRow) redirect(userRow.role === "trainer" ? "/coach" : "/app");
  }

  return <LandingContent />;
}
