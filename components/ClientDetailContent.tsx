"use client";

import { useState } from "react";
import Link from "next/link";
import { usePalette, type Palette } from "@/lib/theme";
import { goalLabel } from "@/lib/goals";
import { describeCycle, type MenstrualCycleAnswers } from "@/lib/menstrualCycle";
import { ChevronLeft, Sparkles, ClipboardList, Dumbbell, ChevronRight, Clock, Weight, Utensils } from "lucide-react";
import { formatDurationLabel } from "@/lib/formatDuration";
import type { CoachWorkoutRow } from "@/lib/coachClientWorkouts";
import TrainerNotesEditor from "@/components/TrainerNotesEditor";
import CopyButton from "@/components/CopyButton";
import Toggle from "@/components/Toggle";

type SportRow = { sport: string; level: string | null; experience: string | null; include_in_plan: boolean };

type TrainingPanel = {
  totalWorkouts: number; totalSeconds: number; totalVolume: number;
  averageSeconds: number; lastWorkoutAt: string | null; recent: CoachWorkoutRow[];
};

export default function ClientDetailContent({
  displayName, email, status, createdAt, lifestyle, injuries, medicalNotes, dietaryRestrictions, kitchenEquipment,
  aiContext, trainerNotes, clientId, sports, training, nutritionEnabled = true,
}: {
  displayName: string | null; email: string | null; status: string; createdAt: string | null;
  lifestyle: { goal?: string; secondary_goals?: string[]; level?: string; days_available?: number; menstrual_cycle?: MenstrualCycleAnswers };
  injuries: { notes?: string };
  medicalNotes: string | null; dietaryRestrictions: string | null; kitchenEquipment: string[];
  aiContext: string | null; trainerNotes: string; clientId: string; sports: SportRow[];
  training: TrainingPanel | null;
  nutritionEnabled?: boolean;
}) {
  const palette = usePalette();
  const secondaryGoals = lifestyle.secondary_goals ?? [];
  // Solo aparece si la clienta contestó algo; son preguntas opcionales.
  const cycleText = describeCycle(lifestyle.menstrual_cycle);
  const memberSince = createdAt ? new Date(createdAt).toLocaleDateString("es-CO", { month: "long", year: "numeric" }) : null;

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
          {memberSince && <div style={{ fontSize: 12, color: palette.inkDim, marginTop: 2 }}>Cliente desde {memberSince}</div>}
        </div>
      </div>

      <NutritionSwitch clientId={clientId} initial={nutritionEnabled} palette={palette} />

      <Section title="Su plan de entrenamiento" icon={<Dumbbell size={15} />} palette={palette}>
        <p style={{ fontSize: 12.5, color: palette.inkDim, lineHeight: 1.6, marginBottom: 12 }}>
          Sus programas y los días que los componen, con la descripción que lee antes de entrenar.
          Ahí explicas el propósito de cada día y por qué el plan tiene los días que tiene.
        </p>
        <Link href={`/coach/clients/${clientId}/routines`} style={{ textDecoration: "none" }}>
          <span style={{
            display: "inline-flex", alignItems: "center", gap: 7, padding: "9px 16px", borderRadius: 11,
            border: `1px solid ${palette.accent}55`, background: `${palette.accent}18`, color: palette.accent,
            fontSize: 13, fontWeight: 700, cursor: "pointer",
          }}>
            <ClipboardList size={14} /> Ver y editar su plan
          </span>
        </Link>
      </Section>

      {training && (
        <Section title="Entrenamientos" icon={<Dumbbell size={15} />} palette={palette}>
          {training.totalWorkouts === 0 ? (
            <p style={{ fontSize: 13.5, color: palette.inkDim, lineHeight: 1.6 }}>
              Todavía no ha registrado ningún entrenamiento.
            </p>
          ) : (
            <>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(96px, 1fr))", gap: 10, marginBottom: 16 }}>
                <Metric label="Sesiones" value={String(training.totalWorkouts)} palette={palette} />
                <Metric label="Tiempo total" value={formatDurationLabel(training.totalSeconds)} palette={palette} />
                <Metric label="Promedio" value={formatDurationLabel(training.averageSeconds)} palette={palette} />
                <Metric label="Volumen" value={`${Math.round(training.totalVolume).toLocaleString("es-CO")} kg`} palette={palette} />
              </div>

              {training.recent.map((w) => (
                <Link
                  key={w.id}
                  href={`/coach/clients/${clientId}/workouts/${w.id}`}
                  style={{
                    display: "flex", alignItems: "center", gap: 10, textDecoration: "none", color: palette.ink,
                    padding: "11px 0", borderTop: `1px solid ${palette.panelBorder}`,
                  }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13.5, fontWeight: 600, marginBottom: 2 }}>{w.routineName}</div>
                    <div style={{ display: "flex", gap: 12, flexWrap: "wrap", fontSize: 11.5, color: palette.inkDim }}>
                      <span>{new Date(w.date).toLocaleDateString("es-CO", { day: "numeric", month: "short" })}</span>
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                        <Clock size={11} /> {formatDurationLabel(w.durationSec)}
                      </span>
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                        <Weight size={11} /> {Math.round(w.totalVolume).toLocaleString("es-CO")} kg
                      </span>
                    </div>
                  </div>
                  <ChevronRight size={16} color={palette.inkDim} style={{ flexShrink: 0 }} />
                </Link>
              ))}

              <Link
                href={`/coach/clients/${clientId}/workouts`}
                style={{ display: "inline-block", marginTop: 14, fontSize: 12.5, color: palette.accent, fontWeight: 600, textDecoration: "none" }}
              >
                Ver todos sus entrenamientos →
              </Link>
            </>
          )}
        </Section>
      )}

      <Section title="Anamnesis completa" icon={<ClipboardList size={15} />} palette={palette}>
        <Field label="Objetivo principal" value={goalLabel(lifestyle.goal)} palette={palette} />
        {secondaryGoals.length > 0 && <Field label="Objetivos secundarios" value={secondaryGoals.map((g) => goalLabel(g)).join(", ")} palette={palette} />}
        <Field label="Nivel" value={lifestyle.level ?? "sin especificar"} palette={palette} />
        <Field label="Días disponibles por semana" value={lifestyle.days_available != null ? String(lifestyle.days_available) : "sin especificar"} palette={palette} />
        <Field label="Lesiones / molestias" value={injuries.notes || "Ninguna reportada"} palette={palette} />
        <Field label="Notas médicas" value={medicalNotes || "Ninguna"} palette={palette} />
        <Field label="Restricciones alimentarias" value={dietaryRestrictions || "Ninguna"} palette={palette} />
        <Field label="Utensilios de cocina" value={kitchenEquipment.length > 0 ? kitchenEquipment.join(", ") : "Ninguno registrado"} palette={palette} />
        {cycleText && <Field label="Ciclo menstrual" value={cycleText} palette={palette} />}

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

function Metric({ label, value, palette }: { label: string; value: string; palette: Palette }) {
  return (
    <div style={{ padding: "10px 12px", borderRadius: 11, border: `1px solid ${palette.panelBorder}`, background: palette.panel }}>
      <div style={{ fontSize: 14.5, fontWeight: 700 }}>{value}</div>
      <div style={{ fontSize: 10.5, color: palette.inkDim, marginTop: 2 }}>{label}</div>
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

/**
 * Encender o apagar la nutrición de este cliente.
 *
 * Mucha gente usa FitTrack solo para entrenar. Apagado, a esta persona le desaparecen la
 * pestaña de comidas, las calorías del inicio, Fitra y —sobre todo— los recordatorios de
 * comida, que si no le suenan cuatro veces al día sin tener dónde registrar nada.
 *
 * Lo que ya haya registrado no se borra: si se vuelve a encender, sigue ahí.
 */
function NutritionSwitch({
  clientId, initial, palette,
}: { clientId: string; initial: boolean; palette: Palette }) {
  const [enabled, setEnabled] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function toggle() {
    const next = !enabled;
    setEnabled(next);
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/coach/client-nutrition", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientId, enabled: next }),
      });
      // Si el guardado falla, el interruptor vuelve a donde estaba: mostrarlo cambiado
      // haría creer al entrenador que su cliente dejó de recibir avisos cuando no es así.
      if (!res.ok) {
        const cuerpo = await res.json().catch(() => ({}));
        setEnabled(!next);
        setError(cuerpo?.error ? `No se pudo guardar: ${cuerpo.error}` : "No se pudo guardar el cambio.");
      }
    } catch {
      setEnabled(!next);
      setError("No se pudo guardar. Revisa tu conexión.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Section title="Nutrición" icon={<Utensils size={15} />} palette={palette}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 14 }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 13.5, fontWeight: 600, marginBottom: 3 }}>
            {enabled ? "Encendida" : "Apagada"}
          </div>
          <p style={{ fontSize: 12, color: palette.inkDim, lineHeight: 1.55 }}>
            {enabled
              ? "Ve el registro de comidas, las calorías, Fitra y recibe los recordatorios."
              : "Solo ve la parte de entrenamiento. No recibe recordatorios de comida. Lo que ya registró se conserva."}
          </p>
        </div>
        <Toggle checked={enabled} onChange={toggle} disabled={saving} label="Nutrición para este cliente" />
      </div>
      {error && <p style={{ fontSize: 12, color: "#f87171", marginTop: 10 }}>{error}</p>}
    </Section>
  );
}
