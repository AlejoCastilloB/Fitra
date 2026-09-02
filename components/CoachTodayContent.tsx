"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { usePalette, type Palette } from "@/lib/theme";
import { localDateKey, toLocalDateKey } from "@/lib/localDate";
import { BellRing, Check, Clock } from "lucide-react";
import Link from "next/link";

type ClientRow = { user_id: string; status: string; email: string | undefined };
type ReminderRow = { id: string; note: string; remind_at: string; clientName: string | null };

export default function CoachTodayContent({ clients, activeCount, total, reminders }: {
  clients: ClientRow[]; activeCount: number; total: number; reminders: ReminderRow[];
}) {
  const palette = usePalette();
  const router = useRouter();
  const supabase = createClient();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [hidden, setHidden] = useState<string[]>([]);

  // Los recordatorios del entrenador no van por push: se avisan acá, al entrar. Vence
  // según SU reloj, no el del servidor.
  const today = localDateKey();
  const visible = reminders.filter((r) => !hidden.includes(r.id));
  const dueReminders = useMemo(
    () => visible.filter((r) => (toLocalDateKey(r.remind_at) ?? "") <= today),
    [visible, today],
  );
  const upcomingReminders = useMemo(
    () => visible.filter((r) => (toLocalDateKey(r.remind_at) ?? "") > today).slice(0, 5),
    [visible, today],
  );

  async function markDone(id: string) {
    setBusyId(id);
    setHidden((prev) => [...prev, id]);
    await supabase.from("trainer_reminders").update({ done: true }).eq("id", id);
    setBusyId(null);
    router.refresh();
  }

  async function snooze(id: string) {
    setBusyId(id);
    setHidden((prev) => [...prev, id]);
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    await supabase.from("trainer_reminders").update({ remind_at: localDateKey(tomorrow) }).eq("id", id);
    setBusyId(null);
    router.refresh();
  }

  return (
    <div>
      <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 4 }}>Hoy</h1>
      <p style={{ color: palette.inkDim, fontSize: 14, marginBottom: 24 }}>Estado general de tus clientes</p>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 12, marginBottom: 28 }}>
        <StatCard label="Clientes activos" value={activeCount} />
        <StatCard label="Total de clientes" value={total} />
        <StatCard label="Adherencia semanal" value="—" hint="próximamente" />
        <StatCard label="Alertas" value="—" hint="próximamente" />
      </div>

      {dueReminders.length > 0 && (
        <div className="ft-fade-in-up" style={{
          ...palette.glassPanel, padding: 16, marginBottom: 20,
          border: `1px solid ${palette.accent}55`, background: `${palette.accent}12`,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 12, color: palette.accent, fontWeight: 700, fontSize: 12.5, textTransform: "uppercase", letterSpacing: "0.04em" }}>
            <BellRing size={14} /> Para hoy
          </div>

          {dueReminders.map((r) => (
            <div key={r.id} style={{
              display: "flex", alignItems: "flex-start", gap: 10, padding: "10px 0",
              borderTop: `1px solid ${palette.panelBorder}`,
            }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13.5, fontWeight: 600, lineHeight: 1.4 }}>{r.note}</div>
                <div style={{ fontSize: 11, color: palette.inkDim, marginTop: 3 }}>
                  {r.clientName ? `${r.clientName} · ` : ""}{formatDay(r.remind_at)}
                </div>
              </div>
              <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                <button
                  onClick={() => snooze(r.id)} disabled={busyId === r.id} title="Recordármelo mañana"
                  style={smallAction(palette, false)}
                >
                  <Clock size={13} />
                </button>
                <button
                  onClick={() => markDone(r.id)} disabled={busyId === r.id} title="Marcar como hecho"
                  style={smallAction(palette, true)}
                >
                  <Check size={13} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {upcomingReminders.length > 0 && (
        <Section title="Próximos recordatorios">
          {upcomingReminders.map((r) => (
            <div key={r.id} style={{ ...palette.glassPanel, padding: "13px 16px", marginBottom: 8 }}>
              <div style={{ fontSize: 13.5, fontWeight: 500 }}>{r.note}</div>
              <div style={{ fontSize: 11, color: palette.inkDim, marginTop: 2 }}>
                {r.clientName ? `${r.clientName} · ` : ""}{formatDay(r.remind_at)}
              </div>
            </div>
          ))}
          <Link href="/coach/settings" style={{ fontSize: 12, color: palette.accent, fontWeight: 600, textDecoration: "none" }}>
            Gestionar recordatorios →
          </Link>
        </Section>
      )}

      <Section title="Necesitan atención">
        <EmptyState text="Todavía no hay datos de adherencia para mostrar alertas." />
      </Section>

      <Section title="Todos tus clientes">
        {clients.length === 0 ? (
          <EmptyState text="Todavía no tienes clientes asignados. Genera un link de invitación para sumar el primero." />
        ) : (
          clients.map((c) => (
            <div key={c.user_id} style={{
              display: "flex", justifyContent: "space-between", alignItems: "center",
              padding: "14px 18px", borderRadius: 12, border: `1px solid ${palette.panelBorder}`,
              background: palette.panel, marginBottom: 10,
            }}>
              <span>{c.email}</span>
              <span style={{ fontSize: 12, color: palette.inkDim }}>{c.status}</span>
            </div>
          ))
        )}
      </Section>
    </div>
  );
}

function StatCard({ label, value, hint }: { label: string; value: string | number; hint?: string }) {
  const palette = usePalette();
  return (
    <div style={{ padding: 16, borderRadius: 14, border: `1px solid ${palette.panelBorder}`, background: palette.panel }}>
      <div style={{ fontSize: 22, fontWeight: 700 }}>{value}</div>
      <div style={{ fontSize: 12, color: palette.inkDim, marginTop: 2 }}>{label}</div>
      {hint && <div style={{ fontSize: 10.5, color: palette.accentDeep, marginTop: 2 }}>{hint}</div>}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  const palette = usePalette();
  return (
    <div style={{ marginBottom: 28 }}>
      <h2 style={{ fontSize: 14, fontWeight: 700, color: palette.accent, marginBottom: 10, textTransform: "uppercase", letterSpacing: "0.04em" }}>{title}</h2>
      {children}
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  const palette = usePalette();
  return (
    <div style={{ padding: 24, borderRadius: 14, border: `1px solid ${palette.panelBorder}`, background: palette.panel, color: palette.inkDim, fontSize: 13.5, textAlign: "center" }}>
      {text}
    </div>
  );
}

function formatDay(iso: string): string {
  const key = toLocalDateKey(iso);
  const today = localDateKey();
  if (key === today) return "Hoy";
  if (key && key < today) return "Atrasado";
  return new Date(iso).toLocaleDateString("es-CO", { day: "numeric", month: "short" });
}

function smallAction(palette: Palette, primary: boolean): React.CSSProperties {
  return {
    width: 30, height: 30, borderRadius: 9, cursor: "pointer",
    display: "flex", alignItems: "center", justifyContent: "center",
    border: `1px solid ${primary ? palette.accent : palette.panelBorder}`,
    background: primary ? `${palette.accent}22` : "transparent",
    color: primary ? palette.accent : palette.inkDim,
  };
}
