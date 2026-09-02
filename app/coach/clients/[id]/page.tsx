import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import ClientDetailContent from "@/components/ClientDetailContent";

export default async function ClientDetailPage({ params }: { params: { id: string } }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Service role para el join a "users" — su RLS no deja leer el nombre/correo
  // de otra persona, pero el .eq("trainer_id", user.id) de abajo ya garantiza
  // que solo se pueda traer un cliente que de verdad es tuyo.
  const admin = createAdminClient();
  const { data: client } = await admin
    .from("clients")
    .select("user_id, status, lifestyle, injuries, medical_notes, dietary_restrictions, kitchen_equipment, ai_context, trainer_notes, trainer_id, users(display_name, email)")
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
      createdAt={null}
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
