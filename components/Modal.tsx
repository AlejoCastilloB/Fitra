"use client";

import { X } from "lucide-react";
import { usePalette } from "@/lib/theme";

export default function Modal({
  title, onClose, children, maxWidth = 440,
}: { title: string; onClose: () => void; children: React.ReactNode; maxWidth?: number }) {
  const palette = usePalette();
  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)",
        display: "flex", alignItems: "center", justifyContent: "center",
        zIndex: 200, padding: 20, backdropFilter: "blur(4px)", WebkitBackdropFilter: "blur(4px)",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="ft-modal-pop"
        style={{ ...palette.glassPanel, width: "100%", maxWidth, padding: 22, maxHeight: "80vh", overflowY: "auto" }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <h2 style={{ fontSize: 16, fontWeight: 700 }}>{title}</h2>
          <button onClick={onClose} style={{ background: "none", border: "none", color: palette.inkDim, cursor: "pointer" }}>
            <X size={18} />
          </button>
        </div>
        {children}
        <style>{`
          @keyframes ftModalPop { from { opacity: 0; transform: scale(0.94) translateY(8px); } to { opacity: 1; transform: none; } }
          .ft-modal-pop { animation: ftModalPop .25s cubic-bezier(.16,.8,.24,1) both; }
        `}</style>
      </div>
    </div>
  );
}
