"use client";

import Modal from "@/components/Modal";
import { palette } from "@/lib/theme";
import { Check } from "lucide-react";

const TYPES = [
  { value: "warmup", label: "Calentamiento" },
  { value: "normal", label: "Normal" },
  { value: "dropset", label: "Dropset" },
  { value: "failure", label: "Al fallo" },
];

export default function SetTypeSheet({
  current, onSelect, onClose,
}: { current: string; onSelect: (type: string) => void; onClose: () => void }) {
  return (
    <Modal title="Tipo de serie" onClose={onClose} maxWidth={300}>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {TYPES.map((t) => (
          <button
            key={t.value}
            onClick={() => { onSelect(t.value); onClose(); }}
            style={{
              display: "flex", justifyContent: "space-between", alignItems: "center",
              padding: "12px 14px", borderRadius: 11, border: `1px solid ${current === t.value ? palette.accent : palette.panelBorder}`,
              background: current === t.value ? `${palette.accent}18` : palette.inputBg,
              color: palette.ink, fontSize: 13.5, fontWeight: 600, cursor: "pointer",
            }}
          >
            {t.label}
            {current === t.value && <Check size={15} color={palette.accent} />}
          </button>
        ))}
      </div>
    </Modal>
  );
}
