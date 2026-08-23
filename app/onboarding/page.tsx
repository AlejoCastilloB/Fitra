"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Dumbbell, Users, Check } from "lucide-react";
import { palette } from "@/components/onboarding/onboardingPalette";
import AnamnesisStep from "@/components/onboarding/AnamnesisStep";
import MotivationalFact from "@/components/onboarding/MotivationalFact";
import SportSelector, { SportDetail } from "@/components/onboarding/SportSelector";
import NotificationPermissionSlide from "@/components/onboarding/NotificationPermissionSlide";
import AddToHomeScreenSlide from "@/components/onboarding/AddToHomeScreenSlide";

const GOALS = [
  { id: "fuerza", label: "Fuerza" },
  { id: "perdida_grasa", label: "Pérdida de grasa" },
  { id: "masa_muscular", label: "Ganancia de masa muscular" },
  { id: "rendimiento", label: "Rendimiento deportivo" },
  { id: "salud", label: "Salud general / Fitness en general" },
  { id: "todo", label: "Un poco de todo" },
];
const LEVELS = ["Principiante", "Intermedio", "Avanzado"];
const LEVEL_DESCRIPTIONS: Record<string, string> = {
  Principiante: "Menos de 6 meses entrenando, o recién estás empezando.",
  Intermedio: "Entre 6 meses y 2 años de experiencia entrenando.",
  Avanzado: "Más de 2-3 años entrenando de forma constante.",
};
const EQUIPMENT_OPTIONS = ["Horno", "Microondas", "Estufa", "Air fryer", "Licuadora", "Plancha/Parrilla", "Olla arrocera", "Sartén", "Batidora"];

const STEP_COUNT = 11;
const FACT_1 = "Las personas que entrenan siguiendo un plan estructurado tienen 2 a 3 veces más probabilidades de mantener el hábito después de 6 meses, comparado con quienes entrenan sin rutina.";
const FACT_2 = "Ponerte una meta concreta (no \"quiero mejorar\", sino un número y una fecha) multiplica por casi 10 tus probabilidades de lograrla.";

function buildAiContext({
  goal, level, daysAvailable, sportsDetails, injuries, medicalNotes, dietaryRestrictions, kitchenEquipment,
}: {
  goal: string | null; level: string | null; daysAvailable: number;
  sportsDetails: { sport: string; level: string; experience: string; includeInPlan: boolean }[];
  injuries: string; medicalNotes: string; dietaryRestrictions: string; kitchenEquipment: string[];
}) {
  const goalLabel = GOALS.find((g) => g.id === goal)?.label ?? goal ?? "sin especificar";
  const lines: string[] = [];
  lines.push(`Objetivo principal: ${goalLabel}.`);
  lines.push(`Nivel de experiencia en gimnasio: ${level ?? "sin especificar"}.`);
  lines.push(`Días disponibles para entrenar por semana: ${daysAvailable}.`);
  sportsDetails.forEach(({ sport, level: l, experience, includeInPlan }) => {
    lines.push(`Practica ${sport} (nivel ${l || "no especificado"}, ${experience || "tiempo no especificado"}) — ${includeInPlan ? "quiere incluirlo en su plan de FitTrack" : "prefiere dejarlo en consideración aparte con su coach"}.`);
  });
  if (injuries.trim()) lines.push(`Lesiones o molestias reportadas: ${injuries.trim()}.`);
  if (medicalNotes.trim()) lines.push(`Notas médicas: ${medicalNotes.trim()}.`);
  if (dietaryRestrictions.trim()) lines.push(`Restricciones alimentarias: ${dietaryRestrictions.trim()}.`);
  if (kitchenEquipment.length > 0) lines.push(`Utensilios de cocina disponibles: ${kitchenEquipment.join(", ")}.`);
  return lines.join(" ");
}

export default function OnboardingPage() {
  return (
    <Suspense fallback={null}>
      <OnboardingForm />
    </Suspense>
  );
}

function OnboardingForm() {
  const router = useRouter();
  const supabase = createClient();
  const searchParams = useSearchParams();
  const inviteCode = searchParams.get("invite");

  const [role, setRole] = useState<"trainer" | "client" | null>(null);
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);

  const [displayName, setDisplayName] = useState("");
  const [goal, setGoal] = useState<string | null>(null);
  const [level, setLevel] = useState<string | null>(null);
  const [daysAvailable, setDaysAvailable] = useState(3);
  const [injuries, setInjuries] = useState("");
  const [medicalNotes, setMedicalNotes] = useState("");
  const [sports, setSports] = useState<string[]>([]);
  const [otherSportText, setOtherSportText] = useState("");
  const [sportDetails, setSportDetails] = useState<Record<string, SportDetail>>({});
  const [dietaryRestrictions, setDietaryRestrictions] = useState("");
  const [kitchenEquipment, setKitchenEquipment] = useState<string[]>([]);

  function toggleSport(sport: string) {
    setSports((prev) => {
      if (prev.includes(sport)) return prev.filter((s) => s !== sport);
      if (prev.length >= 3) return prev;
      return [...prev, sport];
    });
  }

  function updateSportDetail(sport: string, patch: Partial<SportDetail>) {
    setSportDetails((prev) => {
      const current = prev[sport] ?? { level: "", experience: "", includeInPlan: true };
      return { ...prev, [sport]: { ...current, ...patch } };
    });
  }

  function toggleEquipment(item: string) {
    setKitchenEquipment((prev) => prev.includes(item) ? prev.filter((e) => e !== item) : [...prev, item]);
  }

  async function saveClientData() {
    setSaving(true);
    const { data: auth } = await supabase.auth.getUser();
    const uid = auth.user!.id;

    let trainerId: string | null = null;
    if (inviteCode) {
      const { data: invite } = await supabase
        .from("invites")
        .select("id, trainer_id, used_by")
        .eq("code", inviteCode)
        .single();

      if (invite && !invite.used_by) {
        trainerId = invite.trainer_id;
        await supabase.from("invites").update({ used_by: uid }).eq("id", invite.id);
      }
    }

    const sportsDetails = sports.map((s) => ({
      sport: s === "Otro" ? (otherSportText.trim() || "Otro") : s,
      ...(sportDetails[s] || { level: "", experience: "", includeInPlan: true }),
    }));

    const aiContext = buildAiContext({ goal, level, daysAvailable, sportsDetails, injuries, medicalNotes, dietaryRestrictions, kitchenEquipment });

    await supabase.from("users").insert({ id: uid, email: auth.user!.email, role: "client", display_name: displayName.trim(), theme_pref: "light" });
    await supabase.from("clients").insert({
      user_id: uid,
      trainer_id: trainerId,
      lifestyle: { goal, level, days_available: daysAvailable },
      injuries: { notes: injuries },
      medical_notes: medicalNotes,
      dietary_restrictions: dietaryRestrictions,
      kitchen_equipment: kitchenEquipment,
      ai_context: aiContext,
    });

    if (sportsDetails.length > 0) {
      await supabase.from("client_sports").insert(
        sportsDetails.map((sd) => ({
          client_id: uid, sport: sd.sport, level: sd.level, experience: sd.experience, include_in_plan: sd.includeInPlan,
        }))
      );
    }

    setSaving(false);
  }

  async function finishTrainer() {
    setSaving(true);
    const { data: auth } = await supabase.auth.getUser();
    const uid = auth.user!.id;

    await supabase.from("users").insert({ id: uid, email: auth.user!.email, role: "trainer", theme_pref: "light" });
    await supabase.from("trainers").insert({ user_id: uid });

    router.push("/coach");
  }

  const progress = role === "client" ? (step + 1) / STEP_COUNT : 0;

  return (
    <div style={{ minHeight: "100vh", background: palette.bg, color: palette.ink, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "system-ui, sans-serif", padding: 20 }}>
      <div style={{
        width: "100%", maxWidth: 440, background: palette.panel, border: `1px solid ${palette.panelBorder}`,
        backdropFilter: "blur(22px)", WebkitBackdropFilter: "blur(22px)", borderRadius: 20, padding: "32px 28px",
        boxShadow: "0 20px 60px -20px rgba(0,0,0,0.35)",
      }}>
        {role === "client" && (
          <div style={{ height: 4, borderRadius: 999, background: palette.inputBg, marginBottom: 24, overflow: "hidden" }}>
            <div style={{ height: "100%", width: `${progress * 100}%`, background: palette.accent, transition: "width .3s" }} />
          </div>
        )}

        {role === null && (
          <>
            <h2 style={{ fontSize: 22, fontWeight: 700, margin: "0 0 6px" }}>¿Cómo entras a FitTrack?</h2>
            <p style={{ color: palette.inkDim, fontSize: 14, margin: "0 0 22px" }}>Esto solo se define una vez.</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <RoleBtn icon={<Users size={20} />} title="Soy entrenador" onClick={finishTrainer} />
              <RoleBtn icon={<Dumbbell size={20} />} title="Soy usuario" onClick={() => setRole("client")} />
            </div>
          </>
        )}

        {role === "client" && step === 0 && (
          <AnamnesisStep title="Cuéntanos sobre ti" onNext={() => setStep(1)} nextDisabled={!displayName.trim() || !goal}>
            <input
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="¿Cómo te llamas?"
              style={{ width: "100%", padding: 11, borderRadius: 10, border: `1px solid ${palette.panelBorder}`, background: palette.inputBg, color: palette.ink, fontSize: 14, marginBottom: 16 }}
            />
            <div style={{ fontSize: 12, color: palette.inkDim, marginBottom: 8 }}>¿Cuál es tu objetivo principal?</div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {GOALS.map((g) => (
                <Pill key={g.id} active={goal === g.id} onClick={() => setGoal(g.id)}>{g.label}</Pill>
              ))}
            </div>
          </AnamnesisStep>
        )}

        {role === "client" && step === 1 && (
          <AnamnesisStep title="¿Cuál es tu nivel de experiencia en gimnasio?" onBack={() => setStep(0)} onNext={() => setStep(2)} nextDisabled={!level}>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {LEVELS.map((l) => (
                <Pill key={l} active={level === l} onClick={() => setLevel(l)}>{l}</Pill>
              ))}
            </div>
            {level && (
              <p style={{ fontSize: 12, color: palette.inkDim, marginTop: 12, lineHeight: 1.5 }}>{LEVEL_DESCRIPTIONS[level]}</p>
            )}
          </AnamnesisStep>
        )}

        {role === "client" && step === 2 && (
          <AnamnesisStep title="¿Cuántos días a la semana puedes entrenar?" onBack={() => setStep(1)} onNext={() => setStep(3)}>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {[1, 2, 3, 4, 5, 6].map((n) => (
                <Pill key={n} active={daysAvailable === n} onClick={() => setDaysAvailable(n)}>{n}</Pill>
              ))}
            </div>
          </AnamnesisStep>
        )}

        {role === "client" && step === 3 && (
          <MotivationalFact text={FACT_1} onNext={() => setStep(4)} />
        )}

        {role === "client" && step === 4 && (
          <AnamnesisStep title="¿Practicas o te interesa algún deporte específico?" subtitle="Elige hasta 3." onBack={() => setStep(3)} onNext={() => setStep(5)}>
            <SportSelector
              selected={sports}
              onToggle={toggleSport}
              otherText={otherSportText}
              onOtherTextChange={setOtherSportText}
              details={sportDetails}
              onUpdateDetail={updateSportDetail}
            />
          </AnamnesisStep>
        )}

        {role === "client" && step === 5 && (
          <MotivationalFact text={FACT_2} onNext={() => setStep(6)} />
        )}

        {role === "client" && step === 6 && (
          <AnamnesisStep title="¿Alguna lesión o afección médica que debamos conocer?" onBack={() => setStep(5)} onNext={() => setStep(7)}>
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
            <p style={{ fontSize: 11.5, color: palette.inkDim, marginTop: 10, lineHeight: 1.5 }}>
              Esto nos ayuda a armar un perfil más personalizado y evitar ejercicios que puedan afectarte.
            </p>
          </AnamnesisStep>
        )}

        {role === "client" && step === 7 && (
          <AnamnesisStep title="Restricciones alimentarias y cocina" onBack={() => setStep(6)} onNext={() => setStep(8)}>
            <textarea
              value={dietaryRestrictions}
              onChange={(e) => setDietaryRestrictions(e.target.value)}
              placeholder="Ej: sin lactosa, vegetariano, alergia al maní..."
              style={taStyle}
            />
            <div style={{ fontSize: 12, color: palette.inkDim, margin: "14px 0 8px" }}>Utensilios que tienes disponibles</div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {EQUIPMENT_OPTIONS.map((item) => (
                <Pill key={item} active={kitchenEquipment.includes(item)} onClick={() => toggleEquipment(item)}>{item}</Pill>
              ))}
            </div>
            <p style={{ fontSize: 11.5, color: palette.inkDim, marginTop: 12, lineHeight: 1.5 }}>
              Con esto podemos sugerirte recetas y planificar comidas que realmente puedas preparar en tu cocina.
            </p>
          </AnamnesisStep>
        )}

        {role === "client" && step === 8 && (
          <NotificationPermissionSlide onNext={() => setStep(9)} />
        )}

        {role === "client" && step === 9 && (
          <AddToHomeScreenSlide onNext={async () => { await saveClientData(); setStep(10); }} />
        )}

        {role === "client" && step === 10 && (
          <div style={{ textAlign: "center" }}>
            <div style={{
              width: 56, height: 56, borderRadius: "50%", background: `${palette.accent}22`,
              display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 18px", color: palette.accent,
            }}>
              <Check size={26} />
            </div>
            <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 10 }}>
              {displayName ? `¡Listo, ${displayName.trim()}!` : "¡Todo listo!"}
            </h2>
            <p style={{ fontSize: 13.5, color: palette.inkDim, lineHeight: 1.6, marginBottom: 26 }}>
              Ya armamos tu perfil. La IA de Alejo va a usar todo esto para darte mejores recomendaciones desde el primer día.
            </p>
            <button onClick={() => router.push("/app")} disabled={saving} style={{
              width: "100%", padding: 13, borderRadius: 12, border: "none", cursor: "pointer",
              background: `linear-gradient(135deg, ${palette.accent}, ${palette.accentDeep})`, color: "#0A0C10",
              fontWeight: 700, fontSize: 14.5, opacity: saving ? 0.7 : 1,
            }}>
              {saving ? "Guardando..." : "Empezar a entrenar"}
            </button>
          </div>
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
