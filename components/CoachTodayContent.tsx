"use client";

import { usePalette } from "@/lib/theme";
import Link from "next/link";

type ClientRow = { user_id: string; status: string; email: string | undefined };
type ReminderRow = { id: string; note: string; remind_at: string; clientName: string | null };

export default function CoachTodayContent({ clients, activeCount, total, reminders }: {
  clients: ClientRow[]; activeCount: number; total: number; reminders: ReminderRow[];
}) {
  const palette = usePalette();

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

      {reminders.length > 0 && (
        <Section title="Recordatorios">
          {reminders.map((r) => (
            <div key={r.id} style={{ ...palette.glassPanel, padding: "13px 16px", marginBottom: 8 }}>
              <div style={{ fontSize: 13.5, fontWeight: 500 }}>{r.note}</div>
              <div style={{ fontSize: 11, color: palette.inkDim, marginTop: 2 }}>
                {r.clientName ? `${r.clientName} · ` : ""}{new Date(r.remind_at).toLocaleDateString("es-CO", { day: "numeric", month: "short" })}
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
