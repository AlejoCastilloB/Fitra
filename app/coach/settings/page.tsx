"use client";

import { useEffect, useState } from "react";
import { Sun, Moon, Phone } from "lucide-react";
import { usePalette, useTheme, type Palette } from "@/lib/theme";
import { createClient } from "@/lib/supabase/client";
import SettingsGroup from "@/components/SettingsGroup";
import ListRow from "@/components/ListRow";
import Modal from "@/components/Modal";

export default function SettingsPage() {
  const palette = usePalette();
  const { theme, setTheme } = useTheme();
  const supabase = createClient();

  const [uid, setUid] = useState("");
  const [whatsappNumber, setWhatsappNumber] = useState("");
  const [showWhatsappEdit, setShowWhatsappEdit] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: auth } = await supabase.auth.getUser();
      const id = auth.user!.id;
      setUid(id);

      const { data: trainerRow } = await supabase.from("trainers").select("whatsapp_number").eq("user_id", id).single();
      setWhatsappNumber(trainerRow?.whatsapp_number || "");
    })();
  }, []);

  async function saveWhatsapp(value: string) {
    setWhatsappNumber(value);
    await supabase.from("trainers").update({ whatsapp_number: value || null }).eq("user_id", uid);
    setShowWhatsappEdit(false);
  }

  return (
    <div>
      <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 4 }}>Ajustes</h1>
      <p style={{ color: palette.inkDim, fontSize: 14, marginBottom: 24 }}>Preferencias de tu cuenta</p>

      <div className="ft-fade-in-up" style={{ ...palette.glassPanel, padding: 20, marginBottom: 16 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: palette.accent, marginBottom: 12, textTransform: "uppercase", letterSpacing: "0.04em" }}>
          Tema
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <ThemeBtn active={theme === "dark"} icon={<Moon size={15} />} label="Oscuro" onClick={() => setTheme("dark")} />
          <ThemeBtn active={theme === "light"} icon={<Sun size={15} />} label="Claro" onClick={() => setTheme("light")} />
        </div>
      </div>

      <SettingsGroup title="Contacto">
        <ListRow
          label="WhatsApp"
          sublabel={whatsappNumber || "Sin configurar — tus clientes no verán el botón de contactarte"}
          showChevron
          onClick={() => setShowWhatsappEdit(true)}
        />
      </SettingsGroup>

      {showWhatsappEdit && (
        <Modal title="Tu número de WhatsApp" onClose={() => setShowWhatsappEdit(false)} maxWidth={340}>
          <WhatsappEditor initial={whatsappNumber} onSave={saveWhatsapp} />
        </Modal>
      )}
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

function WhatsappEditor({ initial, onSave }: { initial: string; onSave: (v: string) => void }) {
  const palette = usePalette();
  const [val, setVal] = useState(initial);
  return (
    <div>
      <p style={{ fontSize: 12, color: palette.inkDim, marginBottom: 10, lineHeight: 1.5 }}>
        Con el código de país, sin espacios ni signo "+" (ej: 573001234567). Tus clientes vinculados van a ver un botón para escribirte directo a este número.
      </p>
      <label style={{ fontSize: 12, color: palette.inkDim, display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
        <Phone size={13} /> Número
      </label>
      <input
        value={val} onChange={(e) => setVal(e.target.value.replace(/[^\d]/g, ""))} placeholder="573001234567"
        style={{ width: "100%", padding: 11, borderRadius: 10, border: `1px solid ${palette.panelBorder}`, background: palette.inputBg, color: palette.ink, fontSize: 14, marginBottom: 14 }}
      />
      <button onClick={() => onSave(val)} style={{ width: "100%", padding: 12, borderRadius: 11, border: "none", background: `linear-gradient(135deg, ${palette.accent}, ${palette.accentDeep})`, color: palette.bg, fontWeight: 700, fontSize: 14, cursor: "pointer" }}>
        Guardar
      </button>
    </div>
  );
}
