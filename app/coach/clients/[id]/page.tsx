import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import ClientDetailContent from "@/components/ClientDetailContent";

export default async function ClientDetailPage({ params }: { params: { id: string } }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: client } = await supabase
    .from("clients")
    .select("user_id, status, created_at, lifestyle, injuries, medical_notes, dietary_restrictions, kitchen_equipment, ai_context, trainer_notes, trainer_id, users(display_name, email)")
    .eq("user_id", params.id)
    .eq("trainer_id", user.id)
    .single();

  if (!client) redirect("/coach/clients");

  const { data: sports } = await supabase
    .from("client_sports")
    .select("sport, level, experience, include_in_plan")
    .eq("client_id", params.id);

  const users = client.users as unknown as { display_name: string | null; email: string | null };

  return (
    <ClientDetailContent
      displayName={users?.display_name ?? null}
      email={users?.email ?? null}
      status={client.status}
      createdAt={client.created_at}
      lifestyle={(client.lifestyle ?? {}) as { goal?: string; secondary_goals?: string[]; level?: string; days_available?: number }}
      injuries={(client.injuries ?? {}) as { notes?: string }}
      medicalNotes={client.medical_notes}
      dietaryRestrictions={client.dietary_restrictions}
      kitchenEquipment={client.kitchen_equipment ?? []}
      aiContext={client.ai_context}
      trainerNotes={client.trainer_notes ?? ""}
      clientId={client.user_id}
      sports={sports ?? []}
    />
  );
}
