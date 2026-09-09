/**
 * Las imágenes para compartir en historias.
 *
 * Antes se le sacaba una foto a la tarjeta tal cual estaba en pantalla, con su fondo y
 * con los botones dentro. Eso servía como recuerdo, pero no para lo que la gente hace de
 * verdad: pegarla encima de una foto en una historia. Para eso la imagen tiene que ser
 * transparente y el texto tiene que poder ir en blanco o en negro según la foto.
 */

export type ShareTone = "light" | "dark";

/** Los colores del texto según sobre qué foto se va a pegar. */
export type ShareInk = {
  /** El texto principal: los números y los títulos. */
  ink: string;
  /** Las etiquetas y lo secundario. */
  dim: string;
  /** Lo terciario: la firma, las líneas. */
  faint: string;
  /** Una línea de separación, casi invisible. */
  rule: string;
  /**
   * Una sombra muy suave detrás del texto.
   *
   * No es decoración: sin ella, el texto blanco desaparece si la foto tiene una zona
   * clara justo debajo. Sobre un fondo plano ni se nota.
   */
  shadow: string;
};

export function shareInk(tone: ShareTone): ShareInk {
  if (tone === "light") {
    return {
      ink: "#FFFFFF",
      dim: "rgba(255,255,255,0.74)",
      faint: "rgba(255,255,255,0.54)",
      rule: "rgba(255,255,255,0.22)",
      shadow: "0 1px 14px rgba(0,0,0,0.34)",
    };
  }
  return {
    ink: "#0B1017",
    dim: "rgba(11,16,23,0.66)",
    faint: "rgba(11,16,23,0.46)",
    rule: "rgba(11,16,23,0.16)",
    shadow: "0 1px 14px rgba(255,255,255,0.42)",
  };
}

/**
 * Convierte un nodo del DOM en un PNG con fondo transparente.
 *
 * `pixelRatio: 3` porque el destino es una historia (1080 px de ancho): la tarjeta mide
 * unos 340 px en pantalla, así que sale a poco más de 1000 px y no se ve pixelada.
 */
export async function nodeToPngBlob(node: HTMLElement): Promise<Blob> {
  const { toPng } = await import("html-to-image");
  // backgroundColor sin definir es justo lo que queremos: html-to-image no pinta nada
  // detrás y el alfa del PNG queda en cero donde no hay contenido.
  const dataUrl = await toPng(node, { pixelRatio: 3, backgroundColor: undefined, cacheBust: true });
  return (await fetch(dataUrl)).blob();
}

export const TAG_SUGGESTION = "Compartido desde FitTrack — etiquétanos @alejocastillob en tu historia 💪";

/** Abre el menú de compartir del teléfono; si no existe, descarga el archivo. */
export async function shareBlob(blob: Blob, filename: string): Promise<void> {
  const file = new File([blob], filename, { type: "image/png" });
  if (navigator.canShare && navigator.canShare({ files: [file] })) {
    await navigator.share({ files: [file], text: TAG_SUGGESTION });
    return;
  }
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  // Sin esto el blob se queda en memoria hasta recargar.
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/**
 * Copia el PNG al portapapeles para pegarlo como pegatina encima de la foto.
 *
 * Safari exige que el ClipboardItem se construya con la PROMESA del blob y dentro del
 * mismo gesto del usuario; si se espera al blob y después se copia, lo bloquea por
 * "no user gesture". De ahí que reciba una promesa y no un blob ya resuelto.
 */
export async function copyPngToClipboard(blobPromise: Promise<Blob>): Promise<boolean> {
  try {
    if (typeof ClipboardItem === "undefined" || !navigator.clipboard?.write) return false;
    await navigator.clipboard.write([new ClipboardItem({ "image/png": blobPromise })]);
    return true;
  } catch {
    return false;
  }
}
