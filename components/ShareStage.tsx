"use client";

import { useEffect, useRef, useState } from "react";
import { usePalette } from "@/lib/theme";
import { Share2, Copy, Check } from "lucide-react";
import { nodeToPngBlob, shareBlob, copyPngToClipboard, type ShareTone } from "@/lib/shareImage";
import { SHARE_CARD_WIDTH } from "@/components/ShareCards";

/**
 * El marco de "así va a quedar tu imagen".
 *
 * Lo que se comparte es SOLO lo que va dentro de `children`, que no lleva fondo: el PNG
 * sale transparente. El tablero de cuadros y el tinte son de este marco, que no entra en
 * la captura — están para que se vea el contraste real antes de compartir, porque el
 * texto blanco sobre el fondo claro de la app sería invisible.
 */
export default function ShareStage({
  tone, onToneChange, filename, children, hint, styles, styleId, onStyleChange,
}: {
  tone: ShareTone;
  onToneChange: (t: ShareTone) => void;
  filename: string;
  children: React.ReactNode;
  hint?: string;
  /** Los estilos entre los que se puede elegir. Sin esto no sale el selector. */
  styles?: { id: string; label: string }[];
  styleId?: string;
  onStyleChange?: (id: string) => void;
}) {
  const palette = usePalette();
  const cardRef = useRef<HTMLDivElement>(null);
  const marcoRef = useRef<HTMLDivElement>(null);
  const [sharing, setSharing] = useState(false);
  /** Cuánto hay que encoger la vista previa para que quepa entera sin desplazarse. */
  const [escala, setEscala] = useState(1);
  const [altoReal, setAltoReal] = useState(0);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleShare() {
    if (!cardRef.current) return;
    setSharing(true);
    setError(null);
    try {
      await shareBlob(await nodeToPngBlob(cardRef.current), filename);
    } catch (e: any) {
      // Cerrar el menú de compartir lanza AbortError: eso no es un fallo.
      if (e?.name !== "AbortError") setError("No pudimos generar la imagen, intenta de nuevo.");
    } finally {
      setSharing(false);
    }
  }

  function handleCopy() {
    if (!cardRef.current) return;
    setError(null);
    // Sin await: Safari necesita que la copia salga del toque, no de una promesa ya
    // resuelta. Por eso se le pasa la promesa del PNG todavía sin terminar.
    copyPngToClipboard(nodeToPngBlob(cardRef.current)).then((ok) => {
      if (!ok) { setError("Tu navegador no deja copiar imágenes. Usa Compartir y guárdala."); return; }
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    });
  }

  /**
   * La tarjeta del entreno con ocho récords mide casi 800 px de alto y siempre 320 de
   * ancho. Dentro de la ventana no cabía: había que desplazarse para verla entera y los
   * botones quedaban fuera de la vista.
   *
   * Y había algo peor. El nodo que se captura ocupaba todo el ancho de su contenedor, que
   * en una ventana estrecha es MENOS de 320: la tarjeta se salía y el PNG salía cortado
   * por un lado. Por eso ahora se mide también el ancho y se encoge por lo que peor vaya.
   *
   * Se encoge con transform, que NO cambia el tamaño de maquetación: html-to-image mide
   * con offsetWidth/offsetHeight, así que el PNG sigue saliendo a tamaño completo. Por eso
   * el transform va en el padre y no en el nodo que se captura — ese sí se copiaría al
   * clon y la imagen saldría reducida de verdad.
   */
  useEffect(() => {
    const node = cardRef.current;
    if (!node) return;
    const medir = () => {
      const alto = node.offsetHeight;
      if (!alto) return;
      setAltoReal(alto);
      const altoDisponible = Math.min(420, Math.round(window.innerHeight * 0.46));
      const anchoDisponible = marcoRef.current?.clientWidth ?? SHARE_CARD_WIDTH;
      setEscala(Math.max(0.4, Math.min(1, altoDisponible / alto, anchoDisponible / SHARE_CARD_WIDTH)));
    };
    medir();
    const observer = new ResizeObserver(medir);
    observer.observe(node);
    window.addEventListener("resize", medir);
    return () => { observer.disconnect(); window.removeEventListener("resize", medir); };
  }, []);

  // Sobre qué se previsualiza: oscuro si el texto va en blanco, y al revés.
  const backdrop = tone === "light" ? "#171B21" : "#EEF1F5";
  const checker = tone === "light" ? "rgba(255,255,255,0.045)" : "rgba(11,16,23,0.05)";

  return (
    <div>
      {styles && styles.length > 1 && (
        <div style={{ display: "flex", gap: 6, marginBottom: 12, overflowX: "auto", paddingBottom: 2 }}>
          {styles.map((e) => {
            const activo = e.id === styleId;
            return (
              <button
                key={e.id}
                onClick={() => onStyleChange?.(e.id)}
                className="ft-touch-y"
                style={{
                  flexShrink: 0, padding: "7px 13px", borderRadius: 999, cursor: "pointer", fontFamily: "inherit",
                  fontSize: 12, fontWeight: 700,
                  border: `1px solid ${activo ? palette.accent : palette.panelBorder}`,
                  background: activo ? `${palette.accent}1e` : palette.inputBg,
                  color: activo ? palette.accent : palette.inkDim,
                }}
              >
                {e.label}
              </button>
            );
          })}
        </div>
      )}

      <div style={{
        borderRadius: 20, padding: 14, marginBottom: 12,
        background: backdrop,
        // El damero clásico de "aquí no hay nada": deja claro que el PNG es transparente.
        backgroundImage: `repeating-conic-gradient(${checker} 0% 25%, transparent 0% 50%)`,
        backgroundSize: "22px 22px",
        border: `1px solid ${palette.panelBorder}`,
      }}>
        <div ref={marcoRef} style={{ height: altoReal ? altoReal * escala : undefined, overflow: "hidden" }}>
          <div style={{ transform: `scale(${escala})`, transformOrigin: "top center" }}>
            {/* Exactamente el ancho de la tarjeta: si el nodo capturado fuera más estrecho
                que ella, el PNG saldría cortado. */}
            <div ref={cardRef} style={{ width: SHARE_CARD_WIDTH, margin: "0 auto" }}>{children}</div>
          </div>
        </div>
      </div>

      {escala < 1 && (
        <p style={{ fontSize: 10.5, color: palette.inkDim, textAlign: "center", marginTop: -4, marginBottom: 10 }}>
          Vista previa reducida para que quepa. La imagen se genera a tamaño completo.
        </p>
      )}

      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
        <span style={{ fontSize: 11.5, color: palette.inkDim, fontWeight: 600 }}>Color del texto</span>
        <ToneSwatch tone="light" active={tone === "light"} onClick={() => onToneChange("light")} />
        <ToneSwatch tone="dark" active={tone === "dark"} onClick={() => onToneChange("dark")} />
        <span style={{ fontSize: 11, color: palette.inkDim, marginLeft: "auto", textAlign: "right" }}>
          {tone === "light" ? "Para fotos oscuras" : "Para fotos claras"}
        </span>
      </div>

      {hint && (
        <p style={{ fontSize: 11.5, color: palette.inkDim, lineHeight: 1.5, marginBottom: 12 }}>{hint}</p>
      )}

      {error && <p style={{ fontSize: 11.5, color: "#f87171", marginBottom: 10 }}>{error}</p>}

      <div style={{ display: "flex", gap: 10 }}>
        <button onClick={handleCopy} className="ft-touch" style={{
          flex: 1, padding: 13, borderRadius: 13, cursor: "pointer",
          border: `1px solid ${palette.panelBorder}`, background: palette.inputBg, color: palette.ink,
          fontWeight: 700, fontSize: 13.5, fontFamily: "inherit",
          display: "flex", alignItems: "center", justifyContent: "center", gap: 7,
        }}>
          {copied ? <><Check size={15} /> Copiada</> : <><Copy size={15} /> Copiar</>}
        </button>
        <button onClick={handleShare} disabled={sharing} className="ft-touch" style={{
          flex: 1.4, padding: 13, borderRadius: 13, border: "none", cursor: "pointer",
          background: `linear-gradient(135deg, ${palette.accent}, ${palette.accentDeep})`, color: palette.bg,
          fontWeight: 700, fontSize: 13.5, fontFamily: "inherit", opacity: sharing ? 0.6 : 1,
          display: "flex", alignItems: "center", justifyContent: "center", gap: 7,
        }}>
          <Share2 size={15} /> {sharing ? "Generando..." : "Compartir"}
        </button>
      </div>
    </div>
  );
}

function ToneSwatch({ tone, active, onClick }: { tone: ShareTone; active: boolean; onClick: () => void }) {
  const palette = usePalette();
  return (
    <button
      onClick={onClick}
      aria-label={tone === "light" ? "Texto blanco" : "Texto negro"}
      aria-pressed={active}
      className="ft-touch"
      style={{
        width: 30, height: 30, borderRadius: "50%", cursor: "pointer", padding: 0,
        background: tone === "light" ? "#FFFFFF" : "#0B1017",
        border: active ? `2.5px solid ${palette.accent}` : `1px solid ${palette.panelBorder}`,
        boxShadow: active ? `0 0 0 3px ${palette.accent}33` : "none",
      }}
    />
  );
}
