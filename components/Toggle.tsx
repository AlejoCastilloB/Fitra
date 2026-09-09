"use client";

import { usePalette } from "@/lib/theme";

/** El interruptor de la app. Vivía dentro de la pantalla de ajustes; ahora lo comparten
 *  esa pantalla y el panel del coach, para que se vean y se sientan igual. */
export default function Toggle({
  checked, onChange, disabled = false, label,
}: { checked: boolean; onChange: () => void; disabled?: boolean; label?: string }) {
  const palette = usePalette();
  return (
    <button
      onClick={disabled ? undefined : onChange}
      disabled={disabled}
      role="switch"
      aria-checked={checked}
      aria-label={label}
      className="ft-touch"
      style={{
        width: 42, height: 25, borderRadius: 999, border: "none", cursor: disabled ? "default" : "pointer",
        position: "relative", flexShrink: 0, opacity: disabled ? 0.5 : 1,
        background: checked ? palette.accent : palette.inputBg, transition: "background .2s",
      }}
    >
      <div style={{
        width: 20, height: 20, borderRadius: "50%", background: checked ? palette.bg : palette.inkDim,
        position: "absolute", top: 2.5, left: checked ? 20 : 3, transition: "left .2s",
      }} />
    </button>
  );
}
