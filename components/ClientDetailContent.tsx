"use client";

import Link from "next/link";
import { usePalette, type Palette } from "@/lib/theme";
import { goalLabel } from "@/lib/goals";
import { ChevronLeft, Sparkles, ClipboardList, Dumbbell } from "lucide-react";
import TrainerNotesEditor from "@/components/TrainerNotesEditor";
import CopyButton from "@/components/CopyButton";

type SportRow = { sport: string; level: string | null; experience: string | null; include_in_plan: boolean };

export default function ClientDetailContent({
  displayName, email, status, lifestyle, injuries, medicalNotes, dietaryRestrictions, kitchenEquipment,
  aiContext, trainerNotes, clientId, sports,
}: {
  displayName: string | null; email: string | null; status: string;
  lifestyle: { goal?: string; secondary_goals?: string[]; level?: string; days_available?: number };
  injuries: { notes?: string };
  medicalNotes: string | null; dietaryRestrictions: string | null; kitchenEquipment: string[];
  aiContext: string | null; trainerNotes: string; clientId: string; sports: SportRow[];
}) {
  const palette = usePalette();
  const secondaryGoals = lifestyle.secondary_goals ?? [];

  return (
    <div style={{ maxWidth: 640 }}>
      <Link href="/coach/clients" style={{ display: "inline-flex", alignItems: "center", gap: 6, color: palette.inkDim, textDecoration: "none", fontSize: 13.5, marginBottom: 18 }}>
        <ChevronLeft size={16} /> Clientes
      </Link>

      <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 26 }}>
        <div style={{
          width: 48, height: 48, borderRadius: "50%", background: `${palette.accent}22`,
          display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, fontWeight: 700, color: palette.accent, flexShrink: 0,
        }}>
          {(displayName || email || "?")[0]?.toUpperCase()}
        </div>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 19, fontWeight: 700 }}>{displayName || email}</div>
          <div style={{ fontSize: 13, color: palette.inkDim }}>{email} · {status}</div>
        </div>
      </div>

      <Section title="Anamnesis completa" icon={<ClipboardList size={15} />} palette={palette}>
        <Field label="Objetivo principal" value={goalLabel(lifestyle.goal)} palette={palette} />
        {secondaryGoals.length > 0 && <Field label="Objetivos secundarios" value={secondaryGoals.map((g) => goalLabel(g)).join(", ")} palette={palette} />}
        <Field label="Nivel" value={lifestyle.level ?? "sin especificar"} palette={palette} />
        <Field label="Días disponibles por semana" value={lifestyle.days_available != null ? String(lifestyle.days_available) : "sin especificar"} palette={palette} />
        <Field label="Lesiones / molestias" value={injuries.notes || "Ninguna reportada"} palette={palette} />
        <Field label="Notas médicas" value={medicalNotes || "Ninguna"} palette={palette} />
        <Field label="Restricciones alimentarias" value={dietaryRestrictions || "Ninguna"} palette={palette} />
        <Field label="Utensilios de cocina" value={kitchenEquipment.length > 0 ? kitchenEquipment.join(", ") : "Ninguno registrado"} palette={palette} />

        {sports.length > 0 && (
          <div style={{ marginTop: 14 }}>
            <div style={{ fontSize: 11.5, fontWeight: 700, color: palette.inkDim, textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 8 }}>Deportes</div>
            {sports.map((s, i) => (
              <div key={i} style={{ padding: "10px 0", borderTop: i > 0 ? `1px solid ${palette.panelBorder}` : "none", fontSize: 13.5 }}>
                <strong>{s.sport}</strong> — {s.level || "nivel sin especificar"}, {s.experience || "tiempo sin especificar"}
                {" · "}{s.include_in_plan ? "quiere incluirlo en su plan" : "lo deja en consideración aparte"}
              </div>
            ))}
          </div>
        )}
      </Section>

      <Section title="Contexto para IA" icon={<Sparkles size={15} />} palette={palette}>
        <p style={{ fontSize: 13.5, lineHeight: 1.6, color: palette.inkDim, marginBottom: 14 }}>
          {aiContext || "Todavía no hay contexto generado para este cliente."}
        </p>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          {aiContext && <CopyButton text={aiContext} label="Copiar contexto" />}
          <Link href="/coach/routines/new" style={{ textDecoration: "none" }}>
            <span style={{
              ...palette.glassPanel, display: "inline-flex", alignItems: "center", gap: 7, padding: "9px 16px",
              borderRadius: 11, fontSize: 13, fontWeight: 600, color: palette.ink, cursor: "pointer",
            }}>
              <Dumbbell size={14} /> Generar rutina con IA
            </span>
          </Link>
        </div>
      </Section>

      <Section title="Notas del entrenador" icon={<ClipboardList size={15} />} palette={palette}>
        <p style={{ fontSize: 12.5, color: palette.inkDim, marginBottom: 12 }}>
          Solo tú las ves — cosas a tener en cuenta al planificar su entrenamiento.
        </p>
        <TrainerNotesEditor clientId={clientId} initialNotes={trainerNotes} />
      </Section>
    </div>
  );
}

function Section({ title, icon, children, palette }: { title: string; icon: React.ReactNode; children: React.ReactNode; palette: Palette }) {
  return (
    <div style={{ ...palette.cleanGroup, padding: 18, marginBottom: 20 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, fontWeight: 700, color: palette.accent, marginBottom: 14, textTransform: "uppercase", letterSpacing: "0.04em" }}>
        {icon} {title}
      </div>
      {children}
    </div>
  );
}

function Field({ label, value, palette }: { label: string; value: string; palette: Palette }) {
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ fontSize: 11.5, color: palette.inkDim, marginBottom: 2 }}>{label}</div>
      <div style={{ fontSize: 13.5 }}>{value}</div>
    </div>
  );
}
