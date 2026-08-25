import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function requireTrainer() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: NextResponse.json({ error: "no autenticado" }, { status: 401 }) };
  const { data: userRow } = await supabase.from("users").select("role").eq("id", user.id).single();
  if (userRow?.role !== "trainer") return { error: NextResponse.json({ error: "solo entrenadores" }, { status: 403 }) };
  return { user };
}
