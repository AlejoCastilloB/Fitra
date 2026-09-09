"use client";

import { useRef, useState } from "react";
import { usePalette } from "@/lib/theme";
import { Share2, Copy, Check } from "lucide-react";
import { nodeToPngBlob, shareBlob, copyPngToClipboard, type ShareTone } from "@/lib/shareImage";

/**
 * El marco de "así va a quedar tu imagen".
 *
 * Lo que se comparte es SOLO lo que va dentro de `children`, que no lleva fondo: el PNG
 * sale transparente. El tablero de cuadros y el tinte son de este marco, que no entra en
 * la captura — están para que se vea el contraste real antes de compartir, porque el
 * texto blanco sobre el fondo claro de la app sería invisible.
 */
export default function ShareStage({
  tone, onToneChange, filename, children, hint,
}: {
  tone: ShareTone;
  onToneChange: (t: ShareTone) => void;
  filename: string;
  children: React.ReactNode;
  hint?: string;
}) {
  const palette = usePalette();
  const cardRef = useRef<HTMLDivElement>(null);
  const [sharing, setSharing] = useState(false);
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

  // Sobre qué se previsualiza: oscuro si el texto va en blanco, y al revés.
  const backdrop = tone === "light" ? "#171B21" : "#EEF1F5";
  const checker = tone === "light" ? "rgba(255,255,255,0.045)" : "rgba(11,16,23,0.05)";

  return (
    <div>
      <div style={{
        borderRadius: 20, padding: 14, marginBottom: 12,
        background: backdrop,
        // El damero clásico de "aquí no hay nada": deja claro que el PNG es transparente.
        backgroundImage: `repeating-conic-gradient(${checker} 0% 25%, transparent 0% 50%)`,
        backgroundSize: "22px 22px",
        border: `1px solid ${palette.panelBorder}`,
      }}>
        <div ref={cardRef}>{children}</div>
      </div>

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
