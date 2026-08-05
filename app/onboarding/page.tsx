"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Dumbbell, Users, ChevronLeft, ChevronRight, Check } from "lucide-react";

const palette = {
  bg: "#0A0C10",
  panel: "rgba(255,255,255,0.055)",
  panelBorder: "rgba(255,255,255,0.09)",
  ink: "#E7EAEE",
  inkDim: "#8A93A0",
  accent: "#B9C2CE",
  accentDeep: "#5B6472",
  inputBg: "rgba(255,255,255,0.04)",
};

const SPORTS = ["Gym", "Running", "Ciclismo", "Natación", "Trail", "Triatlón", "CrossFit", "Calistenia", "En casa"];
const GOALS = [
  { id: "funcional", label: "Rendimiento funcional" },
  { id: "estetica", label: "Estética / composición corporal" },
  { id: "deportiva", label: "Mejorar en mi disciplina" },
];
const LEVELS = ["Principiante", "Intermedio", "Avanzado"];

export default function OnboardingPage() {
  const router = useRouter();
  const supabase = createClient();

  const [role, setRole] = useState<"trainer" | "client" | null>(null);
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);

  // anamnesis state
  const [goal, setGoal] = useState<string | null>(null);
  const [level, setLevel] = useState<string | null>(null);
  const [daysAvailable, setDaysAvailable] = useState(3);
  const [injuries, setInjuries] = useState("");
  const [medicalNotes, setMedicalNotes] = useState("");
  const [sports, setSports] = useState<string[]>([]);
  const [sportsInPlan, setSportsInPlan] = useState<Record<string, boolean>>({});

  function toggleSport(sport: string) {
    setSports((prev) => {
      if (prev.includes(sport)) return prev.filter((s) => s !== sport);
      if (prev.length >= 2) return prev; // máximo 2
      return [...prev, sport];
    });
  }

  async function finishClient() {
    setSaving(true);
    const { data: auth } = await supabase.auth.getUser();
    const uid = auth.user!.id;

    await supabase.from("users").insert({ id: uid, email: auth.user!.email, role: "client" });
    await supabase.from("clients").insert({
      user_id: uid,
      lifestyle: { goal, level, days_available: daysAvailable },
      injuries: { notes: injuries },
      medical_notes: medicalNotes,
    });

    if (sports.length > 0) {
      await supabase.from("client_sports").insert(
        sports.map((s) => ({ client_id: uid, sport: s, include_in_plan: !!sportsInPlan[s] }))
      );
    }

    router.push("/app");
  }

  async function finishTrainer() {
    setSaving(true);
    const { data: auth } = await supabase.auth.getUser();
    const uid = auth.user!.id;

    await supabase.from("users").insert({ id: uid, email: auth.user!.email, role: "trainer" });
    await supabase.from("trainers").insert({ user_id: uid });

    router.push("/coach");
  }

  return (
    <div style={{ minHeight: "100vh", background: palette.bg, color: palette.ink, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "system-ui, sans-serif", padding: 20 }}>
      <div style={{
        width: "100%", maxWidth: 440, background: palette.panel, border: `1px solid ${palette.panelBorder}`,
        backdropFilter: "blur(22px)", WebkitBackdropFilter: "blur(22px)", borderRadius: 20, padding: "32px 28px",
        boxShadow: "0 20px 60px -20px rgba(0,0,0,0.35)",
      }}>
        {/* paso 0: rol */}
        {role === null && (
          <>
            <h2 style={{ fontSize: 22, fontWeight: 700, margin: "0 0 6px" }}>¿Cómo entrás a FitTrack?</h2>
            <p style={{ color: palette.inkDim, fontSize: 14, margin: "0 0 22px" }}>Esto solo se define una vez.</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <RoleBtn icon={<Users size={20} />} title="Soy entrenador" onClick={finishTrainer} />
              <RoleBtn icon={<Dumbbell size={20} />} title="Soy usuario" onClick={() => setRole("client")} />
            </div>
          </>
        )}

        {/* anamnesis del cliente */}
        {role === "client" && step === 0 && (
          <Step title="¿Cuál es tu objetivo principal?" onNext={() => setStep(1)} nextDisabled={!goal}>
            {GOALS.map((g) => (
              <Pill key={g.id} active={goal === g.id} onClick={() => setGoal(g.id)}>{g.label}</Pill>
            ))}
          </Step>
        )}

        {role === "client" && step === 1 && (
          <Step title="¿Cuál es tu nivel actual?" onBack={() => setStep(0)} onNext={() => setStep(2)} nextDisabled={!level}>
            {LEVELS.map((l) => (
              <Pill key={l} active={level === l} onClick={() => setLevel(l)}>{l}</Pill>
            ))}
          </Step>
        )}

        {role === "client" && step === 2 && (
          <Step title="¿Cuántos días a la semana podés entrenar?" onBack={() => setStep(1)} onNext={() => setStep(3)}>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {[1, 2, 3, 4, 5, 6, 7].map((n) => (
                <Pill key={n} active={daysAvailable === n} onClick={() => setDaysAvailable(n)}>{n}</Pill>
              ))}
            </div>
          </Step>
        )}

        {role === "client" && step === 3 && (
          <Step title="¿Alguna lesión o afección médica que debamos conocer?" onBack={() => setStep(2)} onNext={() => setStep(4)}>
            <textarea
              value={injuries}
              onChange={(e) => setInjuries(e.target.value)}
              placeholder="Ej: molestia lumbar, tendinitis en hombro derecho..."
              style={taStyle}
            />
            <textarea
              value={medicalNotes}
              onChange={(e) => setMedicalNotes(e.target.value)}
              placeholder="Otras afecciones médicas relevantes (opcional)"
              style={{ ...taStyle, marginTop: 10 }}
            />
          </Step>
        )}

        {role === "client" && step === 4 && (
          <Step
            title="¿Practicás alguna disciplina que quieras mejorar? (máx. 2)"
            onBack={() => setStep(3)}
            onNext={finishClient}
            nextLabel={saving ? "Guardando..." : "Terminar"}
            nextDisabled={saving}
          >
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: sports.length ? 16 : 0 }}>
              {SPORTS.map((s) => (
                <Pill key={s} active={sports.includes(s)} onClick={() => toggleSport(s)}>{s}</Pill>
              ))}
            </div>
            {sports.map((s) => (
              <div key={s} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 12px", background: palette.inputBg, borderRadius: 10, marginBottom: 8 }}>
                <span style={{ fontSize: 13.5 }}>{s}</span>
                <button
                  onClick={() => setSportsInPlan((p) => ({ ...p, [s]: !p[s] }))}
                  style={{
                    fontSize: 12, padding: "6px 10px", borderRadius: 8, border: `1px solid ${palette.panelBorder}`,
                    background: sportsInPlan[s] ? palette.accent : "transparent",
                    color: sportsInPlan[s] ? "#0A0C10" : palette.inkDim, cursor: "pointer", fontWeight: 600,
                  }}
                >
                  {sportsInPlan[s] ? "En el plan ✓" : "Hablar con coach"}
                </button>
              </div>
            ))}
          </Step>
        )}
      </div>
    </div>
  );
}

const taStyle: React.CSSProperties = {
  width: "100%", minHeight: 70, padding: 12, borderRadius: 11, border: `1px solid ${palette.panelBorder}`,
  background: palette.inputBg, color: palette.ink, fontSize: 14, fontFamily: "inherit", resize: "vertical",
};

function RoleBtn({ icon, title, onClick }: { icon: React.ReactNode; title: string; onClick: () => void }) {
  return (
    <button onClick={onClick} style={{ display: "flex", alignItems: "center", gap: 14, padding: 16, borderRadius: 14, cursor: "pointer", background: palette.inputBg, border: `1px solid ${palette.panelBorder}`, color: palette.ink, width: "100%" }}>
      <div style={{ width: 42, height: 42, borderRadius: 11, background: `${palette.accent}22`, display: "flex", alignItems: "center", justifyContent: "center", color: palette.accent }}>{icon}</div>
      <span style={{ fontWeight: 600, fontSize: 15 }}>{title}</span>
    </button>
  );
}

function Pill({ active, children, onClick }: { active: boolean; children: React.ReactNode; onClick: () => void }) {
  return (
    <button onClick={onClick} style={{
      padding: "9px 16px", borderRadius: 999, border: `1px solid ${active ? palette.accent : palette.panelBorder}`,
      background: active ? `${palette.accent}22` : palette.inputBg, color: active ? palette.accent : palette.ink,
      fontSize: 13.5, fontWeight: 600, cursor: "pointer",
    }}>
      {active && <Check size={13} style={{ marginRight: 5, verticalAlign: -2 }} />}
      {children}
    </button>
  );
}

function Step({ title, children, onBack, onNext, nextDisabled, nextLabel }: {
  title: string; children: React.ReactNode; onBack?: () => void; onNext: () => void; nextDisabled?: boolean; nextLabel?: string;
}) {
  return (
    <div>
      {onBack && (
        <button onClick={onBack} style={{ display: "flex", alignItems: "center", gap: 6, background: "none", border: "none", color: palette.inkDim, fontSize: 13, cursor: "pointer", marginBottom: 14, marginLeft: -6 }}>
          <ChevronLeft size={15} /> Atrás
        </button>
      )}
      <h2 style={{ fontSize: 19, fontWeight: 700, margin: "0 0 18px", lineHeight: 1.3 }}>{title}</h2>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 22 }}>{children}</div>
      <button onClick={onNext} disabled={nextDisabled} style={{
        width: "100%", padding: 13, borderRadius: 12, border: "none", cursor: nextDisabled ? "default" : "pointer",
        background: `linear-gradient(135deg, ${palette.accent}, ${palette.accentDeep})`, color: "#0A0C10",
        fontWeight: 700, fontSize: 14.5, display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
        opacity: nextDisabled ? 0.5 : 1,
      }}>
        {nextLabel || "Continuar"} <ChevronRight size={16} />
      </button>
    </div>
  );
}
