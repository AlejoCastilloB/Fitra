"use client";

import { useEffect, useState } from "react";
import { Sun, Moon, Phone, Bell, Plus, Trash2, Check } from "lucide-react";
import { usePalette, useTheme, type Palette } from "@/lib/theme";
import { createClient } from "@/lib/supabase/client";
import SettingsGroup from "@/components/SettingsGroup";
import ListRow from "@/components/ListRow";
import Modal from "@/components/Modal";

type ClientOption = { user_id: string; name: string };
type Reminder = { id: string; note: string; remind_at: string; done: boolean; client_id: string | null };

export default function SettingsPage() {
  const palette = usePalette();
  const { theme, setTheme } = useTheme();
  const supabase = createClient();

  const [uid, setUid] = useState("");
  const [whatsappNumber, setWhatsappNumber] = useState("");
  const [showWhatsappEdit, setShowWhatsappEdit] = useState(false);

  const [clients, setClients] = useState<ClientOption[]>([]);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [showAddReminder, setShowAddReminder] = useState(false);

  async function load() {
    const { data: auth } = await supabase.auth.getUser();
    const id = auth.user!.id;
    setUid(id);

    const [{ data: trainerRow }, clientsRes, { data: reminderRows }] = await Promise.all([
      supabase.from("trainers").select("whatsapp_number").eq("user_id", id).single(),
      fetch("/api/coach/client-names").then((r) => r.json()),
      supabase.from("trainer_reminders").select("id, note, remind_at, done, client_id").eq("trainer_id", id).order("remind_at", { ascending: true }),
    ]);

    setWhatsappNumber(trainerRow?.whatsapp_number || "");
    setClients((clientsRes.clients ?? []).map((c: any) => ({ user_id: c.user_id, name: c.display_name || c.email || "Cliente" })));
    setReminders(reminderRows ?? []);
  }

  useEffect(() => { load(); }, []);

  async function saveWhatsapp(value: string) {
    setWhatsappNumber(value);
    await supabase.from("trainers").update({ whatsapp_number: value || null }).eq("user_id", uid);
    setShowWhatsappEdit(false);
  }

  async function toggleDone(reminder: Reminder) {
    setReminders((prev) => prev.map((r) => (r.id === reminder.id ? { ...r, done: !r.done } : r)));
    await supabase.from("trainer_reminders").update({ done: !reminder.done }).eq("id", reminder.id);
  }

  async function deleteReminder(id: string) {
    setReminders((prev) => prev.filter((r) => r.id !== id));
    await supabase.from("trainer_reminders").delete().eq("id", id);
  }

  function clientName(clientId: string | null) {
    if (!clientId) return null;
    return clients.find((c) => c.user_id === clientId)?.name ?? null;
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

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
        <div style={palette.groupTitle}>Recordatorios de seguimiento</div>
        <button onClick={() => setShowAddReminder(true)} style={{
          display: "flex", alignItems: "center", gap: 4, padding: "5px 10px", borderRadius: 8, border: "none",
          background: `${palette.accent}18`, color: palette.accent, fontWeight: 600, fontSize: 12, cursor: "pointer", marginBottom: 10,
        }}>
          <Plus size={13} /> Nuevo
        </button>
      </div>

      {reminders.length === 0 ? (
        <div style={{ ...palette.glassPanel, padding: 18, color: palette.inkDim, fontSize: 13, textAlign: "center", marginBottom: 8 }}>
          No tienes recordatorios pendientes. Crea uno para acordarte de revisar o progresar la rutina de un cliente.
        </div>
      ) : (
        reminders.map((r) => (
          <div key={r.id} style={{
            ...palette.glassPanel, padding: "13px 16px", display: "flex", alignItems: "center", gap: 10, marginBottom: 8,
            opacity: r.done ? 0.55 : 1,
          }}>
            <button onClick={() => toggleDone(r)} style={{
              width: 22, height: 22, borderRadius: "50%", flexShrink: 0, cursor: "pointer",
              border: `1.5px solid ${r.done ? palette.accent : palette.panelBorder}`,
              background: r.done ? palette.accent : "transparent",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              {r.done && <Check size={13} color={palette.bg} />}
            </button>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13.5, fontWeight: 500, textDecoration: r.done ? "line-through" : "none" }}>{r.note}</div>
              <div style={{ fontSize: 11, color: palette.inkDim, marginTop: 2 }}>
                {clientName(r.client_id) ? `${clientName(r.client_id)} · ` : ""}{new Date(r.remind_at).toLocaleDateString("es-CO", { day: "numeric", month: "short" })}
              </div>
            </div>
            <button onClick={() => deleteReminder(r.id)} style={{ background: "none", border: "none", color: palette.inkDim, cursor: "pointer", flexShrink: 0 }}>
              <Trash2 size={15} />
            </button>
          </div>
        ))
      )}

      {showWhatsappEdit && (
        <Modal title="Tu número de WhatsApp" onClose={() => setShowWhatsappEdit(false)} maxWidth={340}>
          <WhatsappEditor initial={whatsappNumber} onSave={saveWhatsapp} />
        </Modal>
      )}

      {showAddReminder && (
        <Modal title="Nuevo recordatorio" onClose={() => setShowAddReminder(false)} maxWidth={360}>
          <AddReminderForm
            trainerId={uid}
            clients={clients}
            onSaved={() => { setShowAddReminder(false); load(); }}
          />
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

function inDays(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function AddReminderForm({ trainerId, clients, onSaved }: { trainerId: string; clients: ClientOption[]; onSaved: () => void }) {
  const palette = usePalette();
  const supabase = createClient();
  const [note, setNote] = useState("");
  const [clientId, setClientId] = useState("");
  const [remindAt, setRemindAt] = useState(() => inDays(1));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function save() {
    if (!note.trim()) return;
    setSaving(true);
    setError("");
    const { error: err } = await supabase.from("trainer_reminders").insert({
      trainer_id: trainerId, client_id: clientId || null, note: note.trim(), remind_at: remindAt, done: false,
    });
    setSaving(false);
    // Antes el fallo se ignoraba y el modal se cerraba como si hubiera guardado.
    if (err) { setError(`No pudimos guardar el recordatorio: ${err.message}`); return; }
    onSaved();
  }

  return (
    <div>
      <label style={{ fontSize: 12, color: palette.inkDim, display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
        <Bell size={13} /> Nota
      </label>
      <textarea
        value={note} onChange={(e) => setNote(e.target.value)} placeholder="Ej: revisar y progresar la rutina de fuerza"
        style={{ width: "100%", minHeight: 60, padding: 11, borderRadius: 10, border: `1px solid ${palette.panelBorder}`, background: palette.inputBg, color: palette.ink, fontSize: 13.5, fontFamily: "inherit", resize: "vertical", marginBottom: 12 }}
      />

      <label style={{ fontSize: 12, color: palette.inkDim, display: "block", marginBottom: 8 }}>Cliente (opcional)</label>
      <select
        value={clientId} onChange={(e) => setClientId(e.target.value)}
        style={{ width: "100%", padding: 11, borderRadius: 10, border: `1px solid ${palette.panelBorder}`, background: palette.inputBg, color: palette.ink, fontSize: 13.5, marginBottom: 12 }}
      >
        <option value="">General</option>
        {clients.map((c) => <option key={c.user_id} value={c.user_id}>{c.name}</option>)}
      </select>

      <label style={{ fontSize: 12, color: palette.inkDim, display: "block", marginBottom: 8 }}>Cuándo</label>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 10 }}>
        {[["Mañana", 1], ["En 3 días", 3], ["En 6 días", 6], ["En 1 semana", 7], ["En 2 semanas", 14]].map(([label, days]) => {
          const value = inDays(days as number);
          const active = remindAt === value;
          return (
            <button
              key={label as string} type="button" onClick={() => setRemindAt(value)}
              style={{
                padding: "7px 12px", borderRadius: 999, cursor: "pointer", fontSize: 12, fontWeight: 600,
                border: `1px solid ${active ? palette.accent : palette.panelBorder}`,
                background: active ? `${palette.accent}18` : palette.inputBg,
                color: active ? palette.accent : palette.inkDim,
              }}
            >
              {label as string}
            </button>
          );
        })}
      </div>
      <input
        type="date" value={remindAt} onChange={(e) => setRemindAt(e.target.value)}
        style={{ width: "100%", padding: 11, borderRadius: 10, border: `1px solid ${palette.panelBorder}`, background: palette.inputBg, color: palette.ink, fontSize: 13.5, marginBottom: 16 }}
      />

      {error && <p style={{ color: "#f87171", fontSize: 12, marginBottom: 12 }}>{error}</p>}

      <button onClick={save} disabled={saving || !note.trim()} style={{
        width: "100%", padding: 12, borderRadius: 11, border: "none",
        background: `linear-gradient(135deg, ${palette.accent}, ${palette.accentDeep})`, color: palette.bg,
        fontWeight: 700, fontSize: 14, cursor: "pointer", opacity: saving || !note.trim() ? 0.5 : 1,
      }}>
        {saving ? "Guardando..." : "Guardar recordatorio"}
      </button>
    </div>
  );
}
