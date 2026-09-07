import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getClientProgram } from "@/lib/coachClientProgram";
import CoachClientProgramContent from "@/components/CoachClientProgramContent";

export default async function CoachClientProgramPage({ params }: { params: { id: string } }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // getClientProgram comprueba que este cliente sea de este entrenador y devuelve null si
  // no lo es; sin eso, la service role dejaría ver el plan de cualquiera.
  const program = await getClientProgram(user.id, params.id);
  if (!program) redirect("/coach/clients");

  return (
    <CoachClientProgramContent
      clientId={params.id}
      clientName={program.clientName}
      trainingDescription={program.trainingDescription}
      programs={program.programs}
    />
  );
}
