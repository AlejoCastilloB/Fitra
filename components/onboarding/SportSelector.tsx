"use client";

import { Check } from "lucide-react";
import { palette } from "./onboardingPalette";

export const SPORTS_LIST = [
  "Fútbol", "Baloncesto", "Running/Atletismo", "Ciclismo", "Natación", "Tenis", "Voleibol",
  "Boxeo/Artes marciales", "Crossfit", "Hyrox", "Patinaje", "Escalada", "Béisbol", "Rugby", "Golf", "Yoga/Pilates",
];

export const SPORT_LEVELS = ["Principiante/Amateur", "Intermedio", "Avanzado/Semiprofesional", "Profesional/Élite"];
export const SPORT_EXPERIENCE = ["Recién quiero empezar", "Menos de 1 año", "1 a 3 años", "3 a 5 años", "Más de 5 años"];

export type SportDetail = { level: string; experience: string; includeInPlan: boolean };

export default function SportSelector({
  selected, onToggle, otherText, onOtherTextChange, details, onUpdateDetail,
}: {
  selected: string[];
  onToggle: (sport: string) => void;
  otherText: string;
  onOtherTextChange: (v: string) => void;
  details: Record<string, SportDetail>;
  onUpdateDetail: (sport: string, patch: Partial<SportDetail>) => void;
}) {
  const hasOther = selected.includes("Otro");

  return (
    <div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: hasOther ? 10 : 20 }}>
        {SPORTS_LIST.map((s) => (
          <SportPill key={s} active={selected.includes(s)} onClick={() => onToggle(s)}>{s}</SportPill>
        ))}
        <SportPill active={hasOther} onClick={() => onToggle("Otro")}>Otro</SportPill>
      </div>

      {hasOther && (
        <input
          value={otherText}
          onChange={(e) => onOtherTextChange(e.target.value)}
          placeholder="¿Cuál?"
          style={{ width: "100%", padding: 11, borderRadius: 10, border: `1px solid ${palette.panelBorder}`, background: palette.inputBg, color: palette.ink, fontSize: 14, marginBottom: 20 }}
        />
      )}

      {selected.map((s) => {
        const label = s === "Otro" ? (otherText || "Otro deporte") : s;
        const d = details[s] || { level: "", experience: "", includeInPlan: true };
        return (
          <div key={s} style={{ padding: 14, borderRadius: 12, background: palette.inputBg, border: `1px solid ${palette.panelBorder}`, marginBottom: 12 }}>
            <div style={{ fontSize: 13.5, fontWeight: 700, marginBottom: 10 }}>{label}</div>

            <div style={{ fontSize: 11, color: palette.inkDim, textTransform: "uppercase", fontWeight: 700, marginBottom: 6 }}>Nivel</div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 12 }}>
              {SPORT_LEVELS.map((l) => (
                <MiniPill key={l} active={d.level === l} onClick={() => onUpdateDetail(s, { level: l })}>{l}</MiniPill>
              ))}
            </div>

            <div style={{ fontSize: 11, color: palette.inkDim, textTransform: "uppercase", fontWeight: 700, marginBottom: 6 }}>Hace cuánto lo practica</div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 12 }}>
              {SPORT_EXPERIENCE.map((e) => (
                <MiniPill key={e} active={d.experience === e} onClick={() => onUpdateDetail(s, { experience: e })}>{e}</MiniPill>
              ))}
            </div>

            <div style={{ fontSize: 11, color: palette.inkDim, textTransform: "uppercase", fontWeight: 700, marginBottom: 6 }}>¿Lo incluimos en tu plan?</div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              <MiniPill active={d.includeInPlan} onClick={() => onUpdateDetail(s, { includeInPlan: true })}>Incluir en mi plan</MiniPill>
              <MiniPill active={!d.includeInPlan} onClick={() => onUpdateDetail(s, { includeInPlan: false })}>Dejarlo en consideración</MiniPill>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function SportPill({ active, children, onClick }: { active: boolean; children: React.ReactNode; onClick: () => void }) {
  return (
    <button onClick={onClick} style={{
      padding: "9px 14px", borderRadius: 999, border: `1px solid ${active ? palette.accent : palette.panelBorder}`,
      background: active ? `${palette.accent}22` : palette.inputBg, color: active ? palette.accent : palette.ink,
      fontSize: 13, fontWeight: 600, cursor: "pointer",
    }}>
      {active && <Check size={12} style={{ marginRight: 5, verticalAlign: -1 }} />}
      {children}
    </button>
  );
}

function MiniPill({ active, children, onClick }: { active: boolean; children: React.ReactNode; onClick: () => void }) {
  return (
    <button onClick={onClick} style={{
      padding: "6px 11px", borderRadius: 999, border: `1px solid ${active ? palette.accent : palette.panelBorder}`,
      background: active ? palette.accent : "transparent", color: active ? "#0A0C10" : palette.inkDim,
      fontSize: 11.5, fontWeight: 600, cursor: "pointer",
    }}>
      {children}
    </button>
  );
}
