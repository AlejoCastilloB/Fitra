"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Sun, Moon } from "lucide-react";
import { palette, glassPanel } from "@/lib/theme";

export default function SettingsPage() {
  const supabase = createClient();
  const [theme, setTheme] = useState<"light" | "dark">("dark");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: auth } = await supabase.auth.getUser();
      const { data: row } = await supabase.from("users").select("theme_pref").eq("id", auth.user!.id).single();
      if (row?.theme_pref) setTheme(row.theme_pref);
    })();
  }, []);

  async function updateTheme(t: "light" | "dark") {
    setTheme(t);
    setSaving(true);
    const { data: auth } = await supabase.auth.getUser();
    await supabase.from("users").update({ theme_pref: t }).eq("id", auth.user!.id);
    setSaving(false);
  }

  return (
    <div>
      <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 4 }}>Ajustes</h1>
      <p style={{ color: palette.inkDim, fontSize: 14, marginBottom: 24 }}>Preferencias de tu cuenta</p>

      <div style={{ ...glassPanel, padding: 20 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: palette.accent, marginBottom: 12, textTransform: "uppercase", letterSpacing: "0.04em" }}>
          Tema
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <ThemeBtn active={theme === "dark"} icon={<Moon size={15} />} label="Oscuro" onClick={() => updateTheme("dark")} />
          <ThemeBtn active={theme === "light"} icon={<Sun size={15} />} label="Claro" onClick={() => updateTheme("light")} />
        </div>
        {saving && <p style={{ fontSize: 11.5, color: palette.inkDim, marginTop: 10 }}>Guardando...</p>}
      </div>
    </div>
  );
}

function ThemeBtn({ active, icon, label, onClick }: { active: boolean; icon: React.ReactNode; label: string; onClick: () => void }) {
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
