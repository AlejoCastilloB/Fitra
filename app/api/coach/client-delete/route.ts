import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireTrainer } from "@/lib/requireTrainer";
import { coachOwnsClient } from "@/lib/coachClientWorkouts";

export const dynamic = "force-dynamic";

/** Donde van a parar todas las fotos: avatares, comidas y progreso, cada usuario en su
 *  carpeta. La base no sabe nada de esto, así que hay que limpiarlo aparte. */
const BUCKET_FOTOS = "food-photos";

/**
 * Borra la cuenta de un cliente y todo lo suyo.
 *
 * Basta con borrar la fila de `auth.users`: `public.users` cuelga de ahí en cascada, y de
 * `users` cuelga `clients`, y de `clients` cuelgan entrenamientos, series, récords,
 * comidas, agua, fotos, insignias, deportes, rachas y sus rutinas. Comprobado sobre el
 * esquema real reconstruido: 25 tablas pasan de tener sus filas a cero con un solo DELETE.
 *
 * Lo único que NO cae solo son las fotos: viven en Storage, que no sabe de claves
 * foráneas. Se borran aquí a mano.
 *
 * Requiere la migración 009. Sin ella, `invites.used_by` apunta a `clients` con NO ACTION
 * y Postgres rechaza el borrado entero en cuanto el cliente haya usado una invitación
 * — es decir, casi siempre.
 */
export async function POST(request: Request) {
  const { user, error } = await requireTrainer();
  if (error) return error;

  const { clientId, confirmEmail } = await request.json();
  if (!clientId || typeof clientId !== "string") {
    return NextResponse.json({ error: "falta el cliente" }, { status: 400 });
  }

  // Nadie se borra a sí mismo por accidente desde el panel de clientes.
  if (clientId === user!.id) {
    return NextResponse.json({ error: "no puedes borrar tu propia cuenta desde aquí" }, { status: 400 });
  }

  if (!(await coachOwnsClient(user!.id, clientId))) {
    return NextResponse.json({ error: "ese cliente no es tuyo" }, { status: 403 });
  }

  const admin = createAdminClient();

  const { data: objetivo } = await admin
    .from("users").select("email, role").eq("id", clientId).single();

  if (!objetivo) {
    return NextResponse.json({ error: "esa cuenta ya no existe" }, { status: 404 });
  }

  // Solo cuentas de cliente. Un entrenador tiene colgando ejercicios propios, plantillas e
  // invitaciones de OTRA gente: eso no se borra desde la ficha de un cliente.
  if (objetivo.role !== "client") {
    return NextResponse.json({ error: "esa cuenta no es de un cliente" }, { status: 400 });
  }

  // La confirmación se comprueba también aquí, no solo en la pantalla. Es la última
  // barrera antes de un borrado que no tiene vuelta atrás: si algún día un botón queda mal
  // conectado y manda el id equivocado, el correo no va a coincidir.
  const esperado = (objetivo.email ?? "").trim().toLowerCase();
  if (esperado && String(confirmEmail ?? "").trim().toLowerCase() !== esperado) {
    return NextResponse.json({ error: "el correo de confirmación no coincide" }, { status: 400 });
  }

  // Las fotos primero: si algo falla después, es mejor haber perdido las imágenes de una
  // cuenta que va a desaparecer que dejar la cuenta borrada y las fotos ocupando espacio
  // para siempre, sin dueño al que atribuirlas.
  let fotosBorradas = 0;
  try {
    const { data: archivos } = await admin.storage.from(BUCKET_FOTOS).list(clientId, { limit: 1000 });
    const rutas = (archivos ?? []).map((f) => `${clientId}/${f.name}`);
    if (rutas.length > 0) {
      const { error: storageError } = await admin.storage.from(BUCKET_FOTOS).remove(rutas);
      if (!storageError) fotosBorradas = rutas.length;
    }
  } catch {
    // Que Storage falle no debe impedir borrar la cuenta: se informa al final.
  }

  const { error: deleteError } = await admin.auth.admin.deleteUser(clientId);
  if (deleteError) {
    return NextResponse.json({ error: deleteError.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, fotosBorradas });
}
