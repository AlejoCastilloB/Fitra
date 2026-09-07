"use client";

import { useState } from "react";
import { usePalette } from "@/lib/theme";
import Button from "@/components/Button";
import { Save } from "lucide-react";

export default function TrainerNotesEditor({ clientId, initialNotes }: { clientId: string; initialNotes: string }) {
  const palette = usePalette();
  const [notes, setNotes] = useState(initialNotes);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Por la ruta de servidor, no directo a Supabase: el RLS de `clients` no deja al
   * entrenador escribir en la fila de otra persona, así que la escritura se rechazaba —y
   * como el error no se miraba, el botón decía "Guardado" y las notas se perdían.
   */
  async function save() {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/coach/client-plan", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientId, trainerNotes: notes }),
      });
      const body = await res.json().catch(() => null);
      if (!res.ok) throw new Error(body?.error || `error ${res.status}`);
      setSaved(true);
      setTimeout(() => setSaved(false), 1800);
    } catch (e: any) {
      setError(`No pudimos guardar las notas: ${e.message}`);
    } finally {
      setSaving(false);
    }
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
      {error && <p style={{ fontSize: 11.5, color: "#f87171", marginBottom: 10 }}>{error}</p>}

      <Button variant="secondary" size="sm" onClick={save} loading={saving} loadingLabel="Guardando..." icon={<Save size={14} />}>
        {saved ? "Guardado" : "Guardar notas"}
      </Button>
    </div>
  );
}
