"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

/**
 * Capa flotante montada en <body>.
 *
 * `position: fixed` se vuelve relativo a cualquier ancestro con transform, filtro o
 * animación — y tanto AppShell como CoachShell envuelven cada página en .ft-fade-in-up.
 * Por eso los modales quedaban anclados a la mitad del documento y había que bajar
 * para verlos. Montándolos en <body> vuelven a ser relativos a la ventana y aparecen
 * siempre centrados en lo que el usuario está viendo.
 */
export default function Overlay({
  children, onClose, zIndex = 200, align = "center", lockScroll = true,
}: {
  children: React.ReactNode;
  onClose?: () => void;
  zIndex?: number;
  align?: "center" | "end";
  lockScroll?: boolean;
}) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!lockScroll) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = previous; };
  }, [lockScroll]);

  useEffect(() => {
    if (!onClose) return;
    function onKey(e: KeyboardEvent) { if (e.key === "Escape") onClose!(); }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  if (!mounted) return null;

  return createPortal(
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, zIndex,
        background: "rgba(0,0,0,0.6)",
        backdropFilter: "blur(4px)", WebkitBackdropFilter: "blur(4px)",
        display: "flex", alignItems: align === "end" ? "flex-end" : "center", justifyContent: "center",
        padding: align === "end" ? 0 : 20,
        overscrollBehavior: "contain",
      }}
    >
      {children}
    </div>,
    document.body,
  );
}
