"use client";

import { useEffect, useState } from "react";
import { Lightbulb, X } from "lucide-react";
import { usePalette } from "@/lib/theme";

const SEEN_PREFIX = "fittrack_hint_seen_";
const SEEN_EVENT = "fittrack-hint-seen";

export function hasSeenHint(id: string): boolean {
  if (typeof window === "undefined") return true;
  return !!localStorage.getItem(SEEN_PREFIX + id);
}

export function markHintSeen(id: string) {
  localStorage.setItem(SEEN_PREFIX + id, "1");
  window.dispatchEvent(new CustomEvent(SEEN_EVENT, { detail: { id } }));
}

export default function FirstTimeHint({ id, text, floating = false }: { id: string; text: string; floating?: boolean }) {
  const palette = usePalette();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!hasSeenHint(id)) setVisible(true);

    function onSeen(e: Event) {
      if ((e as CustomEvent).detail?.id === id) setVisible(false);
    }
    window.addEventListener(SEEN_EVENT, onSeen);
    return () => window.removeEventListener(SEEN_EVENT, onSeen);
  }, [id]);

  function dismiss() {
    markHintSeen(id);
  }

  if (!visible) return null;

  return (
    <div className="ft-fade-in-up" style={{
      display: "flex", alignItems: "flex-start", gap: 8, padding: "10px 12px", borderRadius: 12,
      border: `1px solid ${palette.accent}33`,
      ...(floating
        ? {
            position: "fixed", right: 20, bottom: 88, zIndex: 65, maxWidth: 210,
            background: palette.bg, boxShadow: "0 10px 30px -8px rgba(0,0,0,0.5)",
          }
        : { background: `${palette.accent}14`, marginBottom: 10 }),
    }}>
      <Lightbulb size={14} color={palette.accent} style={{ flexShrink: 0, marginTop: 1 }} />
      <p style={{ flex: 1, fontSize: 12, color: palette.ink, lineHeight: 1.4 }}>{text}</p>
      <button onClick={dismiss} aria-label="Cerrar aviso" style={{ background: "none", border: "none", cursor: "pointer", color: palette.inkDim, flexShrink: 0, display: "flex" }}>
        <X size={14} />
      </button>
    </div>
  );
}
