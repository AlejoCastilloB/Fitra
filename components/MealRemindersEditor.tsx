"use client";

import { useState } from "react";
import { usePalette } from "@/lib/theme";
import Modal from "@/components/Modal";
import {
  MealSlot, MIN_GAP_MINUTES, tooClosePairs, sortedEnabled, timeToMinutes, serializeMealSlots,
} from "@/lib/mealReminders";
import { AlertTriangle, Clock } from "lucide-react";

export default function MealRemindersEditor({
  initial, onClose, onSave,
}: {
  initial: MealSlot[];
  onClose: () => void;
  onSave: (slots: MealSlot[]) => Promise<void> | void;
}) {
  const palette = usePalette();
  const [slots, setSlots] = useState<MealSlot[]>(initial);
  const [saving, setSaving] = useState(false);

  const warnings = tooClosePairs(slots);
  const activeCount = sortedEnabled(slots).length;

  function update(key: string, patch: Partial<MealSlot>) {
    setSlots((prev) => prev.map((s) => (s.key === key ? { ...s, ...patch } : s)));
  }

  async function save() {
    setSaving(true);
    await onSave(slots);
    setSaving(false);
    onClose();
  }

  return (
    <Modal title="Recordatorios de comida" onClose={onClose} maxWidth={400}>
      <p style={{ fontSize: 12.5, color: palette.inkDim, lineHeight: 1.5, marginBottom: 16 }}>
        Elige a qué hora quieres que te avisemos de cada comida y apaga las que no uses.
        Si ya registraste algo a esa hora, no te llega nada — y si no, te lo recordamos una
        vez más a la hora siguiente. Nunca más de dos avisos por comida.
      </p>

      <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 16 }}>
        {slots.map((s) => {
          const inWarning = warnings.some((w) => w.a.key === s.key || w.b.key === s.key);
          return (
            <div key={s.key} style={{
              display: "flex", alignItems: "center", gap: 12, padding: "10px 12px", borderRadius: 12,
              background: palette.inputBg,
              border: `1px solid ${inWarning ? "#E9A23B" : palette.panelBorder}`,
              opacity: s.enabled ? 1 : 0.5,
            }}>
              <button
                onClick={() => update(s.key, { enabled: !s.enabled })}
                aria-label={`${s.enabled ? "Apagar" : "Encender"} el aviso de ${s.label}`}
                style={{
                  width: 40, height: 24, borderRadius: 999, border: "none", cursor: "pointer", flexShrink: 0,
                  background: s.enabled ? palette.accent : palette.panelBorder,
                  display: "flex", alignItems: "center", padding: 3,
                  justifyContent: s.enabled ? "flex-end" : "flex-start",
                  transition: "background .2s",
                }}
              >
                <span style={{ width: 18, height: 18, borderRadius: "50%", background: palette.bg, display: "block" }} />
              </button>

              <span style={{ flex: 1, fontSize: 13.5, fontWeight: 600 }}>{s.label}</span>

              <input
                type="time"
                value={s.time}
                disabled={!s.enabled}
                onChange={(e) => { if (timeToMinutes(e.target.value) !== null) update(s.key, { time: e.target.value }); }}
                style={{
                  padding: "6px 8px", borderRadius: 9, fontSize: 13,
                  border: `1px solid ${palette.panelBorder}`, background: palette.bg, color: palette.ink,
                }}
              />
            </div>
          );
        })}
      </div>

      {warnings.length > 0 && (
        <div style={{
          display: "flex", gap: 10, padding: "12px 14px", borderRadius: 12, marginBottom: 16,
          background: "rgba(233,162,59,0.12)", border: "1px solid rgba(233,162,59,0.4)",
        }}>
          <AlertTriangle size={16} color="#E9A23B" style={{ flexShrink: 0, marginTop: 1 }} />
          <div style={{ fontSize: 12, lineHeight: 1.5 }}>
            <strong style={{ display: "block", marginBottom: 3 }}>
              Deja al menos {MIN_GAP_MINUTES / 60} hora entre comidas
            </strong>
            <span style={{ color: palette.inkDim }}>
              {warnings.map((w) => `${w.a.label} y ${w.b.label} están a ${w.minutes} min`).join("; ")}.
              {" "}Comer tan seguido cuesta más de sostener y no te deja notar el hambre real entre una y otra.
              Puedes guardarlo igual si tu coach te indicó otra pauta.
            </span>
          </div>
        </div>
      )}

      {activeCount === 0 && (
        <p style={{ fontSize: 12, color: palette.inkDim, marginBottom: 16, display: "flex", alignItems: "center", gap: 6 }}>
          <Clock size={13} /> Con todas apagadas no recibirás recordatorios de comida.
        </p>
      )}

      <button onClick={save} disabled={saving} style={{
        width: "100%", padding: 12, borderRadius: 11, border: "none", cursor: "pointer",
        background: `linear-gradient(135deg, ${palette.accent}, ${palette.accentDeep})`,
        color: palette.bg, fontWeight: 700, fontSize: 14, opacity: saving ? 0.6 : 1,
      }}>
        {saving ? "Guardando..." : "Guardar"}
      </button>
    </Modal>
  );
}

/** Resumen de una línea para la fila de ajustes. */
export function mealRemindersSummary(slots: MealSlot[]): string {
  const active = sortedEnabled(slots);
  if (active.length === 0) return "Desactivados";
  return `${active.length} al día · ${active.map((s) => s.time).join(", ")}`;
}

export { serializeMealSlots };
