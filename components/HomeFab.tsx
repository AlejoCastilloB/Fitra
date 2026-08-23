"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { usePalette } from "@/lib/theme";
import { useCurrentUser } from "@/lib/useCurrentUser";
import { Plus, Dumbbell, Camera, Sparkles, Phone } from "lucide-react";

const WHATSAPP_NUMBER = "573000000000"; // reemplaza por el número real de soporte de Alejo
const ANIM_MS = 260;

export default function HomeFab() {
  const palette = usePalette();
  const supabase = createClient();
  const uid = useCurrentUser();
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [closing, setClosing] = useState(false);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [todaysRoutineId, setTodaysRoutineId] = useState<string | null>(null);

  useEffect(() => {
    if (!uid) return;
    (async () => {
      const { data: clientRow } = await supabase.from("clients").select("trainer_id").eq("user_id", uid).single();
      const { data: routines } = await supabase
        .from("routines")
        .select("id, days_of_week")
        .or(`source.eq.platform,client_id.eq.${uid}${clientRow?.trainer_id ? `,and(trainer_id.eq.${clientRow.trainer_id},client_id.is.null)` : ""}`);

      const todayDow = new Date().getDay();
      const todays = (routines ?? []).find((r) => r.days_of_week?.includes(todayDow));
      setTodaysRoutineId(todays?.id ?? null);
    })();
  }, [uid]);

  useEffect(() => () => { if (closeTimer.current) clearTimeout(closeTimer.current); }, []);

  function openMenu() {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    setClosing(false);
    setMounted(true);
    requestAnimationFrame(() => requestAnimationFrame(() => setOpen(true)));
  }

  function closeMenu() {
    setOpen(false);
    setClosing(true);
    if (closeTimer.current) clearTimeout(closeTimer.current);
    closeTimer.current = setTimeout(() => { setMounted(false); setClosing(false); }, ANIM_MS);
  }

  const items = [
    { icon: <Dumbbell size={17} />, label: "Empezar entrenamiento", href: todaysRoutineId ? `/app/workout/${todaysRoutineId}` : "/app/progress", external: false },
    { icon: <Camera size={17} />, label: "Registrar comida", href: "/app/progress?tab=nutrition", external: false },
    { icon: <Sparkles size={17} />, label: "Preguntarle a la IA de Alejo", href: "/app/nutrition/recipes", external: false },
    { icon: <Phone size={17} />, label: "Hablar con Alejo", href: `https://wa.me/${WHATSAPP_NUMBER}`, external: true },
  ];

  return (
    <>
      {mounted && (
        <div
          onClick={closeMenu}
          style={{
            position: "fixed", inset: 0, zIndex: 60,
            background: "rgba(0,0,0,0.35)",
            opacity: open ? 1 : 0, transition: `opacity ${ANIM_MS}ms ease`,
            pointerEvents: open ? "auto" : "none",
          }}
        />
      )}

      <div style={{ position: "fixed", right: 20, bottom: 100, zIndex: 70, display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 10 }}>
        {mounted && items.map((item, i) => (
          <Link
            key={item.label}
            href={item.href}
            target={item.external ? "_blank" : undefined}
            rel={item.external ? "noopener noreferrer" : undefined}
            onClick={closeMenu}
            style={{
              display: "flex", alignItems: "center", gap: 10, padding: "11px 16px 11px 14px", borderRadius: 999,
              background: palette.bg, border: `1px solid ${palette.panelBorder}`,
              color: palette.ink, textDecoration: "none", fontSize: 13, fontWeight: 600,
              boxShadow: "0 8px 24px -8px rgba(0,0,0,0.4)",
              whiteSpace: "nowrap",
              opacity: open ? 1 : 0,
              transform: open ? "translate(0, 0)" : closing ? "translateX(26px)" : "translateY(14px)",
              transition: `opacity ${ANIM_MS}ms cubic-bezier(.16,.8,.24,1), transform ${ANIM_MS}ms cubic-bezier(.16,.8,.24,1)`,
              transitionDelay: open ? `${i * 0.04}s` : "0s",
              pointerEvents: open ? "auto" : "none",
            }}
          >
            <span style={{ color: palette.accent, display: "flex" }}>{item.icon}</span>
            {item.label}
          </Link>
        ))}

        <button
          onClick={() => (open ? closeMenu() : openMenu())}
          aria-label={open ? "Cerrar menú" : "Abrir menú de acciones"}
          style={{
            width: 56, height: 56, borderRadius: "50%", background: "#0A0C10", border: `1px solid rgba(255,255,255,0.12)`,
            display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer",
            boxShadow: "0 10px 30px -6px rgba(0,0,0,0.6)",
            transform: open ? "rotate(45deg)" : "none", transition: "transform .25s cubic-bezier(.16,.8,.24,1)",
          }}
        >
          <Plus size={24} color="#fff" />
        </button>
      </div>
    </>
  );
}
