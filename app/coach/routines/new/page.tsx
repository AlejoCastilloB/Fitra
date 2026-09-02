import RoutineBuilder from "@/components/RoutineBuilder";
import { getCoachClients } from "@/lib/coachClients";

export default async function NewRoutinePage() {
  // Los clientes llegan resueltos desde el servidor: antes el builder los pedía por
  // fetch al montarse y, si esa llamada fallaba, el selector "Asignar a" quedaba vacío
  // sin decir nada y no había forma de asignarle la rutina a nadie.
  const clients = await getCoachClients().catch(() => []);
  return <RoutineBuilder clients={clients} />;
}
