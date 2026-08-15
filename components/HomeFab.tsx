"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { palette } from "@/lib/theme";
import { useCurrentUser } from "@/lib/useCurrentUser";
import { Plus, Dumbbell, Camera, Sparkles, Phone } from "lucide-react";

const WHATSAPP_NUMBER = "573000000000"; // reemplaza por el número real de soporte de Alejo

export default function HomeFab() {
  const supabase = createClient();
  const uid = useCurrentUser();
  const [open, setOpen] = useState(false);
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

  const items = [
    { icon: <Dumbbell size={17} />, label: "Empezar entrenamiento", href: todaysRoutineId ? `/app/workout/${todaysRoutineId}` : "/app/progress", external: false },
    { icon: <Camera size={17} />, label: "Registrar comida", href: "/app/progress?tab=nutrition", external: false },
    { icon: <Sparkles size={17} />, label: "Preguntarle a la IA de Alejo", href: "/app/nutrition/recipes", external: false },
    { icon: <Phone size={17} />, label: "Hablar con Alejo", href: `https://wa.me/${WHATSAPP_NUMBER}`, external: true },
  ];

  return (
    <>
      <style>{`
        @keyframes ftFabItemIn { from { opacity: 0; transform: translateY(8px) scale(0.9); } to { opacity: 1; transform: none; } }
        .ft-fab-item { animation: ftFabItemIn .22s cubic-bezier(.16,.8,.24,1) both; }
      `}</style>

      {open && (
        <div
          onClick={() => setOpen(false)}
          style={{ position: "fixed", inset: 0, zIndex: 60, background: "rgba(0,0,0,0.35)", backdropFilter: "blur(2px)", WebkitBackdropFilter: "blur(2px)" }}
        />
      )}

      <div style={{ position: "fixed", right: 20, bottom: 100, zIndex: 70, display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 10 }}>
        {open && items.map((item, i) => (
          <Link
            key={item.label}
            href={item.href}
            target={item.external ? "_blank" : undefined}
            rel={item.external ? "noopener noreferrer" : undefined}
            onClick={() => setOpen(false)}
            className="ft-fab-item"
            style={{
              display: "flex", alignItems: "center", gap: 10, padding: "11px 16px 11px 14px", borderRadius: 999,
              background: palette.panel, border: `1px solid ${palette.panelBorder}`,
              backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)",
              color: palette.ink, textDecoration: "none", fontSize: 13, fontWeight: 600,
              boxShadow: "0 8px 24px -8px rgba(0,0,0,0.4)",
              animationDelay: `${i * 0.04}s`,
              whiteSpace: "nowrap",
            }}
          >
            <span style={{ color: palette.accent, display: "flex" }}>{item.icon}</span>
            {item.label}
          </Link>
        ))}

        <button
          onClick={() => setOpen((o) => !o)}
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
