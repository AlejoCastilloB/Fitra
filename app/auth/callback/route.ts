import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");

  if (code) {
    const supabase = await createClient();
    const { data } = await supabase.auth.exchangeCodeForSession(code);

    if (data.user) {
      const { data: userRow } = await supabase.from("users").select("role").eq("id", data.user.id).single();
      if (userRow) {
        return NextResponse.redirect(`${origin}${userRow.role === "trainer" ? "/coach" : "/app"}`);
      }
    }
  }

  return NextResponse.redirect(`${origin}/onboarding`);
}
