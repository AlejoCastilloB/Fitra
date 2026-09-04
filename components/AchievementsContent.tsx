"use client";

import { useState } from "react";
import { usePalette } from "@/lib/theme";
import { ACHIEVEMENTS, CATEGORY_LABELS, type Achievement, type AchievementCategory } from "@/lib/achievements";
import Overlay from "@/components/Overlay";
import Link from "next/link";
import { ChevronLeft, Lock, Check } from "lucide-react";

export default function AchievementsContent({ unlockedKeys }: { unlockedKeys: string[] }) {
  const palette = usePalette();
  const unlockedSet = new Set(unlockedKeys);
  const [selected, setSelected] = useState<Achievement | null>(null);

  // Agrupadas por categoría, respetando el orden en que están declaradas.
  const groups: [AchievementCategory, Achievement[]][] = [];
  for (const a of ACHIEVEMENTS) {
    const last = groups[groups.length - 1];
    if (last && last[0] === a.category) last[1].push(a);
    else groups.push([a.category, [a]]);
  }

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
        <Link href="/app/profile" style={{ color: palette.inkDim, display: "flex" }}><ChevronLeft size={20} /></Link>
        <h1 style={{ fontSize: 20, fontWeight: 700 }}>Insignias</h1>
      </div>
      <p style={{ fontSize: 13, color: palette.inkDim, marginBottom: 22 }}>
        {unlockedSet.size} de {ACHIEVEMENTS.length} desbloqueadas · toca una para ver de qué se trata
      </p>

      {groups.map(([category, items]) => (
        <div key={category} style={{ marginBottom: 26 }}>
          <div style={{ ...palette.groupTitle, marginBottom: 12 }}>
            {CATEGORY_LABELS[category]} · {items.filter((a) => unlockedSet.has(a.key)).length}/{items.length}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14 }}>
            {items.map((a) => {
              const unlocked = unlockedSet.has(a.key);
              return (
                <button
                  key={a.key}
                  onClick={() => setSelected(a)}
                  style={{
                    textAlign: "center", background: "none", border: "none", padding: 0, cursor: "pointer",
                    color: palette.ink, opacity: unlocked ? 1 : 0.38, transition: "opacity .3s ease",
                  }}
                >
                  <div style={{
                    width: 60, height: 60, borderRadius: 18, margin: "0 auto 6px",
                    background: unlocked ? `linear-gradient(135deg, ${palette.accent}, ${palette.accentDeep})` : palette.inputBg,
                    display: "flex", alignItems: "center", justifyContent: "center", fontSize: 26,
                    transition: "background .3s ease",
                  }}>
                    {a.emoji}
                  </div>
                  <div style={{ fontSize: 10, fontWeight: 600, lineHeight: 1.3 }}>{a.title}</div>
                </button>
              );
            })}
          </div>
        </div>
      ))}

      {selected && (
        <AchievementDetail
          achievement={selected}
          unlocked={unlockedSet.has(selected.key)}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  );
}

function AchievementDetail({
  achievement, unlocked, onClose,
}: { achievement: Achievement; unlocked: boolean; onClose: () => void }) {
  const palette = usePalette();

  return (
    <Overlay onClose={onClose}>
      <div onClick={(e) => e.stopPropagation()} style={{ ...palette.modalPanel, padding: 26, width: "100%", maxWidth: 330, textAlign: "center" }}>
        <div style={{
          width: 86, height: 86, borderRadius: 26, margin: "0 auto 16px",
          background: unlocked ? `linear-gradient(135deg, ${palette.accent}, ${palette.accentDeep})` : palette.inputBg,
          display: "flex", alignItems: "center", justifyContent: "center", fontSize: 40,
          opacity: unlocked ? 1 : 0.5,
        }}>
          {achievement.emoji}
        </div>

        <h3 style={{ fontSize: 17, fontWeight: 700, marginBottom: 6 }}>{achievement.title}</h3>

        <div style={{
          display: "inline-flex", alignItems: "center", gap: 5, marginBottom: 14,
          padding: "4px 10px", borderRadius: 999, fontSize: 10.5, fontWeight: 700,
          color: unlocked ? "#4ADE80" : palette.inkDim,
          background: unlocked ? "rgba(74,222,128,0.14)" : palette.inputBg,
        }}>
          {unlocked ? <><Check size={11} /> Desbloqueada</> : <><Lock size={11} /> Bloqueada</>}
        </div>

        <p style={{ fontSize: 13, color: palette.inkDim, lineHeight: 1.6, marginBottom: 20 }}>
          {unlocked
            ? `La ganaste por ${lowerFirst(achievement.description)}.`
            : `Desbloquearás esta insignia cuando ${toSubjunctive(achievement.description)}.`}
        </p>

        <button onClick={onClose} style={{
          width: "100%", padding: 12, borderRadius: 12, border: "none", cursor: "pointer",
          background: `linear-gradient(135deg, ${palette.accent}, ${palette.accentDeep})`,
          color: palette.bg, fontWeight: 700, fontSize: 13.5,
        }}>
          Entendido
        </button>
      </div>
    </Overlay>
  );
}

function lowerFirst(text: string) {
  return text.charAt(0).toLowerCase() + text.slice(1);
}

/** Las descripciones están en infinitivo ("Completar 10 entrenamientos"), que ya encaja en
 *  "La ganaste por completar 10 entrenamientos". Para "Desbloquearás esta insignia
 *  cuando…" hace falta el subjuntivo. Son diez verbos contados, así que una tabla basta. */
const VERB_MAP: Record<string, string> = {
  Completar: "completes",
  Lograr: "logres",
  Acumular: "acumules",
  Registrar: "registres",
  Entrenar: "entrenes",
  Encadenar: "encadenes",
  Hacer: "hagas",
  Subir: "subas",
  Crear: "crees",
  Confirmar: "confirmes",
};

function toSubjunctive(description: string) {
  const [first, ...rest] = description.split(" ");
  const mapped = VERB_MAP[first];
  return mapped ? [mapped, ...rest].join(" ") : lowerFirst(description);
}
