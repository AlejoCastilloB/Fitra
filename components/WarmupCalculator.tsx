"use client";

import { useState } from "react";
import { palette } from "@/lib/theme";
import { computeWarmupSets } from "@/lib/warmupCalculator";
import Modal from "@/components/Modal";

export default function WarmupCalculator({
  onClose, onApply, initialTarget,
}: { onClose: () => void; onApply: (sets: { weight: number; reps: number }[]) => void; initialTarget?: number }) {
  const [target, setTarget] = useState(initialTarget ? String(initialTarget) : "");
  const sets = computeWarmupSets(+target || 0);

  return (
    <Modal title="Calculadora de calentamiento" onClose={onClose} maxWidth={340}>
      <label style={{ fontSize: 12, color: palette.inkDim, display: "block", marginBottom: 6 }}>
        ¿Con cuánto peso vas a trabajar hoy?
      </label>
      <input
        type="number" inputMode="decimal" min={0} value={target}
        onChange={(e) => setTarget(e.target.value)}
        placeholder="Ej: 80"
        style={{ width: "100%", padding: 11, borderRadius: 10, border: `1px solid ${palette.panelBorder}`, background: palette.inputBg, color: palette.ink, fontSize: 14, marginBottom: 16 }}
      />

      {sets.length > 0 && (
        <div style={{ marginBottom: 18 }}>
          <div style={{ fontSize: 11, color: palette.accent, fontWeight: 700, textTransform: "uppercase", marginBottom: 8 }}>Series sugeridas</div>
          {sets.map((s, i) => (
            <div key={i} style={{ display: "flex", justifyContent: "space-between", fontSize: 13, padding: "6px 0", borderBottom: i < sets.length - 1 ? `1px solid ${palette.panelBorder}` : "none" }}>
              <span style={{ color: palette.inkDim }}>Calentamiento {i + 1}</span>
              <span style={{ fontWeight: 600 }}>{s.weight} kg × {s.reps}</span>
            </div>
          ))}
        </div>
      )}

      <button
        onClick={() => onApply(sets)}
        disabled={sets.length === 0}
        style={{
          width: "100%", padding: 12, borderRadius: 11, border: "none",
          background: `linear-gradient(135deg, ${palette.accent}, ${palette.accentDeep})`, color: "#0A0C10",
          fontWeight: 700, fontSize: 14, cursor: "pointer", opacity: sets.length === 0 ? 0.5 : 1,
        }}
      >
        Agregar como series
      </button>
    </Modal>
  );
}
