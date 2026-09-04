"use client";

import { useEffect, useRef, useState } from "react";
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
    return () => {
      // Devolver el scroll al body obliga al navegador a re-maquetar la página entera.
      // Hacerlo en el siguiente frame deja que la tarjeta desaparezca primero, así el
      // cierre se ve inmediato aunque esa re-maquetación cueste.
      requestAnimationFrame(() => { document.body.style.overflow = previous; });
    };
  }, [lockScroll]);

  // El handler suele venir como función nueva en cada render; guardarlo en una ref evita
  // desmontar y volver a montar el listener cada vez que el padre se re-renderiza.
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === "Escape") onCloseRef.current?.(); }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  if (!mounted) return null;

  return createPortal(
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, zIndex,
        // Sin backdrop-filter a propósito: el fondo de la app ya lleva blur en casi cada
        // tarjeta (glassPanel), y superponerle otro desenfoque a pantalla completa obliga
        // al compositor a rehacer todas esas capas al abrir y al cerrar. Un velo sólido un
        // poco más oscuro se ve prácticamente igual y no cuesta nada.
        background: "rgba(0,0,0,0.68)",
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
