"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { usePalette } from "@/lib/theme";
import Modal from "@/components/Modal";
import SettingsGroup from "@/components/SettingsGroup";
import ListRow from "@/components/ListRow";

export default function WorkoutSettingsSheet({
  onClose, defaultRest, keepAwake, trackRpe, onUpdated,
}: {
  onClose: () => void;
  defaultRest: number;
  keepAwake: boolean;
  trackRpe: boolean;
  onUpdated: (v: { defaultRest?: number; keepAwake?: boolean; trackRpe?: boolean }) => void;
}) {
  const palette = usePalette();
  const supabase = createClient();
  const [editingRest, setEditingRest] = useState(false);
  const [restVal, setRestVal] = useState(String(defaultRest));

  async function saveRest() {
    const val = +restVal || 90;
    await supabase.auth.getUser().then(({ data }) => supabase.from("users").update({ default_rest_seconds: val }).eq("id", data.user!.id));
    onUpdated({ defaultRest: val });
    setEditingRest(false);
  }

  async function toggleAwake() {
    const next = !keepAwake;
    await supabase.auth.getUser().then(({ data }) => supabase.from("users").update({ keep_screen_awake: next }).eq("id", data.user!.id));
    onUpdated({ keepAwake: next });
  }

  async function toggleRpe() {
    const next = !trackRpe;
    await supabase.auth.getUser().then(({ data }) => supabase.from("users").update({ track_rpe: next }).eq("id", data.user!.id));
    onUpdated({ trackRpe: next });
  }

  return (
    <Modal title="Ajustes de entrenamiento" onClose={onClose} maxWidth={360}>
      <SettingsGroup>
        <ListRow
          label="Descanso predeterminado"
          sublabel="Se usa al agregar un ejercicio nuevo"
          right={editingRest ? (
            <input
              type="number" autoFocus defaultValue={defaultRest} onBlur={(e) => { setRestVal(e.target.value); saveRest(); }}
              style={{ width: 50, padding: "3px 6px", borderRadius: 6, border: `1px solid ${palette.panelBorder}`, background: palette.inputBg, color: palette.ink, fontSize: 12 }}
            />
          ) : (
            <span style={{ color: palette.inkDim, fontSize: 12.5 }}>{defaultRest}s</span>
          )}
          onClick={() => !editingRest && setEditingRest(true)}
        />
        <ListRow
          label="Mantener pantalla encendida"
          sublabel="Evita que el celular se bloquee durante el entreno"
          right={<Toggle checked={keepAwake} onChange={toggleAwake} />}
        />
        <ListRow
          label="Seguimiento de RPE"
          sublabel="Registra el esfuerzo percibido en cada serie"
          right={<Toggle checked={trackRpe} onChange={toggleRpe} />}
        />
      </SettingsGroup>
    </Modal>
  );
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: () => void }) {
  const palette = usePalette();
  return (
    <button onClick={onChange} style={{
      width: 42, height: 25, borderRadius: 999, border: "none", cursor: "pointer", position: "relative",
      background: checked ? palette.accent : palette.inputBg, transition: "background .2s",
    }}>
      <div style={{
        width: 20, height: 20, borderRadius: "50%", background: checked ? palette.bg : palette.inkDim,
        position: "absolute", top: 2.5, left: checked ? 20 : 3, transition: "left .2s",
      }} />
    </button>
  );
}
