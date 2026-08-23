"use client";

import { Sun, Moon } from "lucide-react";
import { usePalette, useTheme } from "@/lib/theme";

export default function SettingsPage() {
  const palette = usePalette();
  const { theme, setTheme } = useTheme();

  return (
    <div>
      <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 4 }}>Ajustes</h1>
      <p style={{ color: palette.inkDim, fontSize: 14, marginBottom: 24 }}>Preferencias de tu cuenta</p>

      <div style={{ ...palette.glassPanel, padding: 20 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: palette.accent, marginBottom: 12, textTransform: "uppercase", letterSpacing: "0.04em" }}>
          Tema
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <ThemeBtn active={theme === "dark"} icon={<Moon size={15} />} label="Oscuro" onClick={() => setTheme("dark")} />
          <ThemeBtn active={theme === "light"} icon={<Sun size={15} />} label="Claro" onClick={() => setTheme("light")} />
        </div>
      </div>
    </div>
  );
}

function ThemeBtn({ active, icon, label, onClick }: { active: boolean; icon: React.ReactNode; label: string; onClick: () => void }) {
  const palette = usePalette();
  return (
    <button onClick={onClick} style={{
      display: "flex", alignItems: "center", gap: 8, padding: "10px 16px", borderRadius: 10,
      border: `1px solid ${active ? palette.accent : palette.panelBorder}`,
      background: active ? `${palette.accent}22` : palette.inputBg,
      color: active ? palette.accent : palette.inkDim, cursor: "pointer", fontSize: 13.5, fontWeight: 600,
    }}>
      {icon} {label}
    </button>
  );
}
