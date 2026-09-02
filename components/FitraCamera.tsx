"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { usePalette } from "@/lib/theme";
import { X, Images, RefreshCw, Sparkles } from "lucide-react";

/**
 * Cámara propia a pantalla completa con overlay de Fitra, en vez del selector nativo.
 * `onPickFromGallery` abre el selector del sistema para subir una foto ya tomada; también
 * sirve de respaldo si `getUserMedia` no está disponible o el permiso se niega.
 */
export default function FitraCamera({
  onCapture, onClose, onPickFromGallery,
}: {
  onCapture: (file: File) => void;
  onClose: () => void;
  onPickFromGallery: () => void;
}) {
  const palette = usePalette();
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [facingMode, setFacingMode] = useState<"environment" | "user">("environment");
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [flash, setFlash] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  // La cámara ocupa la pantalla completa: si el body sigue desplazándose detrás, el
  // obturador se va fuera de vista y aparece el menú de la app por encima.
  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = previous; };
  }, []);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      setReady(false);
      setError(null);

      if (!navigator.mediaDevices?.getUserMedia) {
        setError("Tu navegador no deja abrir la cámara desde la app.");
        return;
      }

      try {
        // Sin pedir resolución: forzar 1920x1920 (cuadrado) empujaba al navegador a
        // elegir otro lente —el gran angular— y a recortar. Así usa la cámara por
        // defecto del teléfono, que es lo que el usuario espera.
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: facingMode } },
          audio: false,
        });
        if (cancelled) { stream.getTracks().forEach((t) => t.stop()); return; }

        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play().catch(() => {});
        }
        setReady(true);
      } catch {
        if (!cancelled) setError("No pudimos abrir la cámara. Revisa los permisos.");
      }
    })();

    return () => {
      cancelled = true;
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    };
  }, [facingMode]);

  function capture() {
    const video = videoRef.current;
    if (!video || !ready) return;

    // Se guarda el cuadro completo, sin recortar: el usuario ve en pantalla exactamente
    // lo mismo que queda en la foto, sin zoom ni bordes perdidos.
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    setFlash(true);
    setTimeout(() => setFlash(false), 180);

    canvas.toBlob((blob) => {
      if (!blob) return;
      onCapture(new File([blob], `comida-${Date.now()}.jpg`, { type: "image/jpeg" }));
    }, "image/jpeg", 0.92);
  }

  if (!mounted) return null;

  // Va montada en <body>. Dentro del árbol de la app, un ancestro con animación o
  // filtro le crea un containing block a `position: fixed` y la cámara termina
  // encerrada en la columna del contenido: parece una tarjeta, hay que hacer scroll
  // para llegar al obturador y el vídeo sale recortado.
  return createPortal(
    <div style={{
      position: "fixed", inset: 0, zIndex: 400, background: "#000",
      display: "flex", flexDirection: "column",
    }}>
      <style>{`
        @keyframes ftShutter { from { opacity: .85; } to { opacity: 0; } }
        .ft-shutter { animation: ftShutter .18s ease-out both; }
      `}</style>

      <video
        ref={videoRef} playsInline muted autoPlay
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "contain" }}
      />

      {flash && <div className="ft-shutter" style={{ position: "absolute", inset: 0, background: "#fff", zIndex: 3 }} />}

      {!error && <FramingGuide />}

      {/* Encabezado con la marca */}
      <div style={{
        position: "relative", zIndex: 2, display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "calc(env(safe-area-inset-top) + 14px) 18px 14px",
        background: "linear-gradient(to bottom, rgba(0,0,0,0.55), transparent)",
      }}>
        <button onClick={onClose} aria-label="Cerrar cámara" style={roundBtn}>
          <X size={20} color="#fff" />
        </button>

        <div style={{
          display: "flex", alignItems: "center", gap: 7, padding: "7px 14px", borderRadius: 999,
          background: "rgba(255,255,255,0.16)", backdropFilter: "blur(14px)", WebkitBackdropFilter: "blur(14px)",
          border: "1px solid rgba(255,255,255,0.22)",
        }}>
          <Sparkles size={14} color="#fff" />
          <span style={{ fontSize: 13, fontWeight: 700, color: "#fff", letterSpacing: "0.02em" }}>Fitra</span>
        </div>

        <button onClick={() => setFacingMode((f) => (f === "environment" ? "user" : "environment"))} aria-label="Cambiar cámara" style={roundBtn}>
          <RefreshCw size={18} color="#fff" />
        </button>
      </div>

      {/* Zona central: solo el aviso de error; el marco va como capa aparte */}
      <div style={{ position: "relative", zIndex: 2, flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
        {error && (
          <div style={{ textAlign: "center", maxWidth: 300 }}>
            <p style={{ color: "#fff", fontSize: 14, lineHeight: 1.5, marginBottom: 16 }}>{error}</p>
            <button onClick={onPickFromGallery} style={{
              display: "flex", alignItems: "center", justifyContent: "center", gap: 8, margin: "0 auto",
              padding: "12px 20px", borderRadius: 12, border: "none", cursor: "pointer",
              background: palette.accent, color: palette.bg, fontSize: 13.5, fontWeight: 700,
            }}>
              <Images size={16} /> Subir desde la galería
            </button>
          </div>
        )}
      </div>

      {/* Controles */}
      {!error && (
        <div style={{
          position: "relative", zIndex: 2,
          padding: "18px 28px calc(env(safe-area-inset-bottom) + 26px)",
          background: "linear-gradient(to top, rgba(0,0,0,0.6), transparent)",
        }}>
          <p style={{ textAlign: "center", color: "rgba(255,255,255,0.8)", fontSize: 12.5, marginBottom: 16 }}>
            Encuadra el plato completo
          </p>

          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <button onClick={onPickFromGallery} style={{ ...roundBtn, width: "auto", height: "auto", borderRadius: 16, padding: "8px 10px", flexDirection: "column", gap: 3 }}>
              <Images size={20} color="#fff" />
              <span style={{ fontSize: 10, fontWeight: 700, color: "#fff" }}>Galería</span>
            </button>

            <button
              onClick={capture} disabled={!ready} aria-label="Tomar foto"
              style={{
                width: 74, height: 74, borderRadius: "50%", cursor: ready ? "pointer" : "default",
                border: "4px solid rgba(255,255,255,0.9)", background: "rgba(255,255,255,0.28)",
                display: "flex", alignItems: "center", justifyContent: "center", opacity: ready ? 1 : 0.5,
              }}
            >
              <span style={{ width: 56, height: 56, borderRadius: "50%", background: "#fff" }} />
            </button>

            <span style={{ width: 52 }} />
          </div>
        </div>
      )}
    </div>,
    document.body,
  );
}

function FramingGuide() {
  const CORNERS = [
    { top: 0, left: 0, borderTop: true, borderLeft: true },
    { top: 0, right: 0, borderTop: true, borderRight: true },
    { bottom: 0, left: 0, borderBottom: true, borderLeft: true },
    { bottom: 0, right: 0, borderBottom: true, borderRight: true },
  ];
  return (
    <div style={{
      position: "absolute", inset: 0, zIndex: 1,
      display: "flex", alignItems: "center", justifyContent: "center", pointerEvents: "none",
    }}>
      <div style={{ position: "relative", width: "min(78vw, 340px)", height: "min(78vw, 340px)" }}>
        {CORNERS.map((c, i) => (
          <span key={i} style={{
            position: "absolute", width: 34, height: 34,
            top: c.top, left: c.left, right: c.right, bottom: c.bottom,
            borderTop: c.borderTop ? "3px solid rgba(255,255,255,0.92)" : undefined,
            borderBottom: c.borderBottom ? "3px solid rgba(255,255,255,0.92)" : undefined,
            borderLeft: c.borderLeft ? "3px solid rgba(255,255,255,0.92)" : undefined,
            borderRight: c.borderRight ? "3px solid rgba(255,255,255,0.92)" : undefined,
            borderTopLeftRadius: c.borderTop && c.borderLeft ? 14 : undefined,
            borderTopRightRadius: c.borderTop && c.borderRight ? 14 : undefined,
            borderBottomLeftRadius: c.borderBottom && c.borderLeft ? 14 : undefined,
            borderBottomRightRadius: c.borderBottom && c.borderRight ? 14 : undefined,
          }} />
        ))}
      </div>
    </div>
  );
}

const roundBtn: React.CSSProperties = {
  width: 40, height: 40, borderRadius: "50%", border: "none", cursor: "pointer",
  background: "rgba(255,255,255,0.16)", backdropFilter: "blur(14px)", WebkitBackdropFilter: "blur(14px)",
  display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
};
