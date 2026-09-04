import { createAdminClient } from "@/lib/supabase/admin";

// Los GIF de ejercicios son de la biblioteca, no archivos personales de nadie. Subirlos
// desde el navegador chocaba con la política del bucket, que exige que la primera carpeta
// sea el id de quien sube ("new row violates row-level security policy"). Se suben acá con
// la service role, igual que ya se escribe la fila del ejercicio.
const BUCKET = "food-photos";
const MAX_BYTES = 4 * 1024 * 1024;

const EXT_BY_TYPE: Record<string, string> = {
  "image/gif": "gif", "image/png": "png", "image/jpeg": "jpg", "image/webp": "webp",
};

export type MediaUploadResult = { url: string } | { error: string };

/** Sube el medio del ejercicio y devuelve su URL pública. */
export async function uploadExerciseMedia(base64: string, mimeType: string): Promise<MediaUploadResult> {
  const ext = EXT_BY_TYPE[mimeType];
  if (!ext) return { error: `formato no soportado (${mimeType || "desconocido"}); usa GIF, PNG, JPG o WebP` };

  let buffer: Buffer;
  try {
    buffer = Buffer.from(base64, "base64");
  } catch {
    return { error: "no pudimos leer el archivo" };
  }

  if (buffer.byteLength === 0) return { error: "el archivo llegó vacío" };
  if (buffer.byteLength > MAX_BYTES) {
    return { error: `la imagen pesa ${(buffer.byteLength / 1024 / 1024).toFixed(1)} MB y el máximo son 4 MB` };
  }

  const admin = createAdminClient();
  const path = `exercise-media/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

  const { error } = await admin.storage.from(BUCKET).upload(path, buffer, { contentType: mimeType, upsert: false });
  if (error) return { error: error.message };

  const { data } = admin.storage.from(BUCKET).getPublicUrl(path);
  return { url: data.publicUrl };
}
