import { redirect } from "next/navigation";
import { getFolderView } from "@/lib/coachFolder";
import CoachFolderContent from "@/components/CoachFolderContent";

export default async function FolderPage({ params }: { params: { name: string } }) {
  const folder = decodeURIComponent(params.name);
  // getFolderView filtra por el entrenador de la sesión: cambiando el nombre en la URL no
  // se llega a la carpeta de otro.
  const view = await getFolderView(folder);
  if (!view) redirect("/coach/routines");

  return <CoachFolderContent view={view} />;
}
