"use client";

import { useState } from "react";
import { usePalette } from "@/lib/theme";
import { createClient } from "@/lib/supabase/client";
import { Save } from "lucide-react";

export default function TrainerNotesEditor({ clientId, initialNotes }: { clientId: string; initialNotes: string }) {
  const palette = usePalette();
  const supabase = createClient();
  const [notes, setNotes] = useState(initialNotes);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  async function save() {
    setSaving(true);
    await supabase.from("clients").update({ trainer_notes: notes }).eq("user_id", clientId);
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 1800);
  }

  return (
    <div>
      <textarea
        value={notes}
        onChange={(e) => { setNotes(e.target.value); setSaved(false); }}
        placeholder="Ej: prefiere entrenar en la mañana, cuidado con el hombro derecho aunque no lo mencionó..."
        style={{
          width: "100%", minHeight: 90, padding: 12, borderRadius: 11, border: `1px solid ${palette.panelBorder}`,
          background: palette.inputBg, color: palette.ink, fontSize: 13.5, fontFamily: "inherit", resize: "vertical", marginBottom: 10,
        }}
      />
      <button onClick={save} disabled={saving} style={{
        ...palette.glassPanel, padding: "9px 16px", borderRadius: 11, cursor: "pointer", border: "none",
        display: "flex", alignItems: "center", gap: 7, fontSize: 13, fontWeight: 600, color: palette.ink, opacity: saving ? 0.6 : 1,
      }}>
        <Save size={14} /> {saving ? "Guardando..." : saved ? "Guardado" : "Guardar notas"}
      </button>
    </div>
  );
}
