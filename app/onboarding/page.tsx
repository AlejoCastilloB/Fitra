"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Check, Mail, Lock, Eye, EyeOff, MailCheck } from "lucide-react";
import { palette } from "@/components/onboarding/onboardingPalette";
import AnamnesisStep from "@/components/onboarding/AnamnesisStep";
import MotivationalFact from "@/components/onboarding/MotivationalFact";
import SportSelector, { SportDetail } from "@/components/onboarding/SportSelector";
import NotificationPermissionSlide from "@/components/onboarding/NotificationPermissionSlide";
import AddToHomeScreenSlide from "@/components/onboarding/AddToHomeScreenSlide";
import { GOALS, SPORT_GOAL_ID, goalLabel } from "@/lib/goals";
import { computeNutritionGoals, Sex, CommitmentLevel, COMMITMENT_OPTIONS } from "@/lib/computeNutritionGoals";

const LEVELS = ["Principiante", "Intermedio", "Avanzado"];
const LEVEL_EMOJI: Record<string, string> = { Principiante: "🌱", Intermedio: "⚡", Avanzado: "🔥" };
const LEVEL_DESCRIPTIONS: Record<string, string> = {
  Principiante: "Menos de 6 meses entrenando, o recién estás empezando.",
  Intermedio: "Entre 6 meses y 2 años de experiencia entrenando.",
  Avanzado: "Más de 2-3 años entrenando de forma constante.",
};
const EQUIPMENT_OPTIONS = ["Horno", "Microondas", "Estufa", "Air fryer", "Licuadora", "Plancha/Parrilla", "Olla arrocera", "Sartén", "Batidora"];
const EQUIPMENT_EMOJI: Record<string, string> = {
  Horno: "🔥", Microondas: "⚡", Estufa: "🍳", "Air fryer": "🍟", Licuadora: "🥤",
  "Plancha/Parrilla": "🥩", "Olla arrocera": "🍚", Sartén: "🫕", Batidora: "🥣",
};

const PENDING_INVITE_KEY = "fittrack_pending_invite";
const PENDING_ONBOARDING_KEY = "fittrack_pending_onboarding";
const STEP_COUNT = 14;
const FACT_1 ="Las personas que entrenan siguiendo un plan estructurado tienen 2 a 3 veces más probabilidades de mantener el hábito después de 6 meses, comparado con quienes entrenan sin rutina.";
const FACT_2 = "Ponerte una meta concreta (no \"quiero mejorar\", sino un número y una fecha) multiplica por casi 10 tus probabilidades de lograrla.";

type ClientAnswers = {
  displayName: string; goal: string | null; secondaryGoals: string[]; level: string | null; daysAvailable: number;
  weightKg: number | null; heightCm: number | null; age: number | null; sex: Sex | null; commitment: CommitmentLevel;
  injuries: string; medicalNotes: string; sports: string[]; otherSportText: string;
  sportDetails: Record<string, SportDetail>; dietaryRestrictions: string; kitchenEquipment: string[];
  effectiveInvite: string | null;
};

function buildAiContext({
  goal, secondaryGoals, level, daysAvailable, weightKg, heightCm, age, commitment, sportsDetails, injuries, medicalNotes, dietaryRestrictions, kitchenEquipment,
}: {
  goal: string | null; secondaryGoals: string[]; level: string | null; daysAvailable: number;
  weightKg: number | null; heightCm: number | null; age: number | null; commitment: CommitmentLevel;
  sportsDetails: { sport: string; level: string; experience: string; includeInPlan: boolean }[];
  injuries: string; medicalNotes: string; dietaryRestrictions: string; kitchenEquipment: string[];
}) {
  const secondaryLabels = secondaryGoals.map((id) => goalLabel(id));
  const lines: string[] = [];
  lines.push(`Objetivo principal: ${goalLabel(goal)}.`);
  if (secondaryLabels.length > 0) lines.push(`Objetivos secundarios: ${secondaryLabels.join(", ")}.`);
  lines.push(`Nivel de experiencia en gimnasio: ${level ?? "sin especificar"}.`);
  lines.push(`Días disponibles para entrenar por semana: ${daysAvailable}.`);
  if (weightKg && heightCm && age) lines.push(`Peso: ${weightKg}kg, altura: ${heightCm}cm, edad: ${age} años.`);
  lines.push(`Nivel de compromiso con el cambio: ${commitment}.`);
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

  // El cliente de Supabase del navegador solo puede construirse en el navegador. Creado
  // durante el render del servidor reventaba el prerender de esta página en `next build`
  // cuando las variables NEXT_PUBLIC_SUPABASE_* no están definidas — que es justo lo que
  // pasa en los deploys de preview. Todas las llamadas de abajo ocurren en handlers o
  // efectos, así que se crea la primera vez que de verdad se necesita.
  const supabaseRef = useRef<ReturnType<typeof createClient> | null>(null);
  const getSupabase = () => (supabaseRef.current ??= createClient());
  const searchParams = useSearchParams();
  const urlInvite = searchParams.get("invite");

  const [effectiveInvite, setEffectiveInvite] = useState<string | null>(urlInvite);
  const [authChecked, setAuthChecked] = useState(false);
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);

  const [displayName, setDisplayName] = useState("");
  const [goal, setGoal] = useState<string | null>(null);
  const [secondaryGoals, setSecondaryGoals] = useState<string[]>([]);
  const [level, setLevel] = useState<string | null>(null);
  const [daysAvailable, setDaysAvailable] = useState(3);
  const [weightKg, setWeightKg] = useState<number | null>(null);
  const [heightCm, setHeightCm] = useState<number | null>(null);
  const [age, setAge] = useState<number | null>(null);
  const [sex, setSex] = useState<Sex | null>(null);
  const [commitment, setCommitment] = useState<CommitmentLevel>("moderado");
  const [injuries, setInjuries] = useState("");
  const [medicalNotes, setMedicalNotes] = useState("");
  const [sports, setSports] = useState<string[]>([]);
  const [otherSportText, setOtherSportText] = useState("");
  const [sportDetails, setSportDetails] = useState<Record<string, SportDetail>>({});
  const [dietaryRestrictions, setDietaryRestrictions] = useState("");
  const [kitchenEquipment, setKitchenEquipment] = useState<string[]>([]);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [creating, setCreating] = useState(false);
  const [signupError, setSignupError] = useState<string | null>(null);
  const [awaitingConfirmation, setAwaitingConfirmation] = useState(false);

  function toggleSecondaryGoal(id: string) {
    setSecondaryGoals((prev) => (prev.includes(id) ? [] : [id]));
  }

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

  async function saveClientData(overrides?: ClientAnswers): Promise<boolean> {
    const d: ClientAnswers = overrides ?? {
      displayName, goal, secondaryGoals, level, daysAvailable, weightKg, heightCm, age, sex, commitment,
      injuries, medicalNotes, sports, otherSportText, sportDetails, dietaryRestrictions, kitchenEquipment, effectiveInvite,
    };
    setSaving(true);
    const { data: auth } = await getSupabase().auth.getUser();
    const uid = auth.user!.id;

    let trainerId: string | null = null;
    if (d.effectiveInvite) {
      const { data: invite } = await getSupabase()
        .from("invites")
        .select("id, trainer_id, used_by")
        .eq("code", d.effectiveInvite)
        .single();

      if (invite && !invite.used_by) {
        trainerId = invite.trainer_id;
        await getSupabase().from("invites").update({ used_by: uid }).eq("id", invite.id);
      }
      localStorage.removeItem(PENDING_INVITE_KEY);
    }

    if (!trainerId) {
      // Se resuelve en el servidor: el RLS de "users" solo deja leer la fila propia, así
      // que buscarlo por correo desde el navegador siempre volvía vacío y el cliente
      // quedaba sin entrenador, invisible en el panel.
      try {
        const res = await fetch("/api/onboarding/default-trainer");
        if (res.ok) trainerId = (await res.json()).trainerId ?? null;
      } catch {
        // sin entrenador por defecto igual se completa el registro; se puede vincular después
      }
    }

    const sportsDetails = d.sports.map((s) => ({
      sport: s === "Otro" ? (d.otherSportText.trim() || "Otro") : s,
      ...(d.sportDetails[s] || { level: "", experience: "", includeInPlan: true }),
    }));

    const aiContext = buildAiContext({
      goal: d.goal, secondaryGoals: d.secondaryGoals, level: d.level, daysAvailable: d.daysAvailable,
      weightKg: d.weightKg, heightCm: d.heightCm, age: d.age, commitment: d.commitment, sportsDetails,
      injuries: d.injuries, medicalNotes: d.medicalNotes, dietaryRestrictions: d.dietaryRestrictions, kitchenEquipment: d.kitchenEquipment,
    });

    const nutritionGoals = (d.weightKg && d.heightCm && d.age && d.sex)
      ? computeNutritionGoals({
          weightKg: d.weightKg, heightCm: d.heightCm, age: d.age, sex: d.sex,
          daysAvailable: d.daysAvailable, goal: d.goal, commitment: d.commitment,
        })
      : null;

    const { error: usersError } = await getSupabase().from("users").upsert({ id: uid, email: auth.user!.email, role: "client", display_name: d.displayName.trim(), theme_pref: "light" });
    if (usersError) { setSaving(false); return false; }

    const { error: clientsError } = await getSupabase().from("clients").insert({
      user_id: uid,
      trainer_id: trainerId,
      lifestyle: { goal: d.goal, secondary_goals: d.secondaryGoals, level: d.level, days_available: d.daysAvailable },
      injuries: { notes: d.injuries },
      medical_notes: d.medicalNotes,
      dietary_restrictions: d.dietaryRestrictions,
      kitchen_equipment: d.kitchenEquipment,
      ai_context: aiContext,
      current_weight: d.weightKg,
      height_cm: d.heightCm,
      age: d.age,
      sex: d.sex,
      commitment: d.commitment,
      daily_kcal_goal: nutritionGoals?.kcal ?? null,
      daily_protein_goal: nutritionGoals?.protein ?? null,
      daily_carbs_goal: nutritionGoals?.carbs ?? null,
      daily_fat_goal: nutritionGoals?.fat ?? null,
    });
    if (clientsError) { setSaving(false); return false; }

    if (sportsDetails.length > 0) {
      await getSupabase().from("client_sports").insert(
        sportsDetails.map((sd) => ({
          client_id: uid, sport: sd.sport, level: sd.level, experience: sd.experience, include_in_plan: sd.includeInPlan,
        }))
      );
    }

    setSaving(false);
    return true;
  }

  useEffect(() => {
    document.body.style.background = palette.bg;
  }, []);

  useEffect(() => {
    (async () => {
      let invite = urlInvite;
      if (!invite) invite = localStorage.getItem(PENDING_INVITE_KEY);
      if (invite) setEffectiveInvite(invite);

      const { data: auth } = await getSupabase().auth.getUser();
      if (auth.user) {
        const { data: existingUserRow } = await getSupabase().from("users").select("role").eq("id", auth.user.id).single();
        if (existingUserRow) {
          router.replace(existingUserRow.role === "trainer" ? "/coach" : "/app");
          return;
        }

        const pendingRaw = localStorage.getItem(PENDING_ONBOARDING_KEY);
        if (pendingRaw) {
          try {
            const pending = JSON.parse(pendingRaw);
            const ok = await saveClientData(pending.answers as ClientAnswers);
            if (ok) {
              localStorage.removeItem(PENDING_ONBOARDING_KEY);
              router.push("/app");
              return;
            }
          } catch {}
        }
      }

      setAuthChecked(true);
    })();
  }, []);

  async function handleCreateAccount() {
    setSignupError(null);
    if (password.length < 6) { setSignupError("La contraseña debe tener al menos 6 caracteres."); return; }
    if (password !== confirmPassword) { setSignupError("Las contraseñas no coinciden."); return; }

    setCreating(true);
    const redirectTo = effectiveInvite
      ? `${window.location.origin}/auth/callback?invite=${encodeURIComponent(effectiveInvite)}`
      : `${window.location.origin}/auth/callback`;
    const { data, error: signUpError } = await getSupabase().auth.signUp({
      email, password, options: { emailRedirectTo: redirectTo },
    });

    if (signUpError) {
      setSignupError(
        signUpError.message.toLowerCase().includes("already registered") || signUpError.message.toLowerCase().includes("already been registered")
          ? "Ese correo ya tiene una cuenta. Inicia sesión en vez de crear una nueva."
          : "No pudimos crear la cuenta, intenta de nuevo."
      );
      setCreating(false);
      return;
    }

    if (data.session) {
      const ok = await saveClientData();
      if (!ok) {
        setSignupError("Creamos tu cuenta pero no pudimos guardar tu perfil. Intenta de nuevo en un momento.");
        setCreating(false);
        return;
      }
      setStep(12);
      setCreating(false);
      return;
    }

    localStorage.setItem(PENDING_ONBOARDING_KEY, JSON.stringify({
      answers: { displayName, goal, secondaryGoals, level, daysAvailable, weightKg, heightCm, age, sex, commitment, injuries, medicalNotes, sports, otherSportText, sportDetails, dietaryRestrictions, kitchenEquipment, effectiveInvite },
    }));
    setAwaitingConfirmation(true);
    setCreating(false);
  }

  const wantsSports = goal === SPORT_GOAL_ID || secondaryGoals.includes(SPORT_GOAL_ID);
  const wantsCommitment = goal !== null && goal !== "salud";
  const progress = (step + 1) / STEP_COUNT;
  const showAccountStep = step === 11;
  const stepKey = showAccountStep ? (awaitingConfirmation ? "confirm" : "account") : `step-${step}`;

  if (!authChecked) return null;

  return (
    <div style={{ minHeight: "100vh", background: palette.bg, color: palette.ink, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "system-ui, sans-serif", padding: 20 }}>
      <div style={{
        width: "100%", maxWidth: 440, background: palette.panel, border: `1px solid ${palette.panelBorder}`, borderRadius: 20, padding: "32px 28px",
        boxShadow: palette.glassShadow,
      }}>
        <div style={{ height: 4, borderRadius: 999, background: palette.inputBg, marginBottom: 24, overflow: "hidden" }}>
          <div style={{ height: "100%", width: `${progress * 100}%`, background: palette.accent, transition: "width .3s" }} />
        </div>

        <div key={stepKey} className="ft-step-in">
        {step === 0 && (
          <AnamnesisStep title="Cuéntanos sobre ti" onNext={() => setStep(1)} nextDisabled={!displayName.trim() || !goal}>
            <input
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="¿Cómo te llamas?"
              style={{ width: "100%", padding: 11, borderRadius: 10, border: `1px solid ${palette.panelBorder}`, background: palette.inputBg, color: palette.ink, fontSize: 14, marginBottom: 16 }}
            />
            <div style={{ fontSize: 12, color: palette.inkDim, marginBottom: 8 }}>¿Cuál es tu objetivo principal?</div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 18 }}>
              {GOALS.map((g) => (
                <Pill key={g.id} active={goal === g.id} onClick={() => { setGoal(g.id); setSecondaryGoals((prev) => prev.filter((id) => id !== g.id)); }}>{g.emoji} {g.label}</Pill>
              ))}
            </div>
            <div style={{ fontSize: 12, color: palette.inkDim, marginBottom: 8 }}>¿Algún objetivo secundario? (opcional)</div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {GOALS.filter((g) => g.id !== goal).map((g) => (
                <Pill key={g.id} active={secondaryGoals.includes(g.id)} onClick={() => toggleSecondaryGoal(g.id)}>{g.emoji} {g.label}</Pill>
              ))}
            </div>
          </AnamnesisStep>
        )}

        {step === 1 && (
          <AnamnesisStep title="¿Cuál es tu nivel de experiencia en gimnasio?" onBack={() => setStep(0)} onNext={() => setStep(2)} nextDisabled={!level}>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {LEVELS.map((l) => (
                <Pill key={l} active={level === l} onClick={() => setLevel(l)}>{LEVEL_EMOJI[l]} {l}</Pill>
              ))}
            </div>
            {level && (
              <p style={{ fontSize: 12, color: palette.inkDim, marginTop: 12, lineHeight: 1.5 }}>{LEVEL_DESCRIPTIONS[level]}</p>
            )}
          </AnamnesisStep>
        )}

        {step === 2 && (
          <AnamnesisStep
            title="Cuéntanos un poco más de ti"
            subtitle="Con esto armamos un plan de calorías y macros hecho a tu medida, no un número genérico."
            onBack={() => setStep(1)}
            onNext={() => setStep(wantsCommitment ? 3 : 4)}
            nextDisabled={!weightKg || !heightCm || !age || !sex}
          >
            <div style={{ display: "flex", gap: 10, marginBottom: 12 }}>
              <NumberField label="Peso (kg)" value={weightKg} onChange={setWeightKg} />
              <NumberField label="Altura (cm)" value={heightCm} onChange={setHeightCm} />
              <NumberField label="Edad" value={age} onChange={setAge} />
            </div>
            <div style={{ fontSize: 12, color: palette.inkDim, marginBottom: 8 }}>Sexo biológico</div>
            <p style={{ fontSize: 11, color: palette.inkDim, marginBottom: 10, lineHeight: 1.4 }}>Lo necesitamos solo para calcular tu gasto calórico con precisión.</p>
            <div style={{ display: "flex", gap: 8 }}>
              <Pill active={sex === "male"} onClick={() => setSex("male")}>Hombre</Pill>
              <Pill active={sex === "female"} onClick={() => setSex("female")}>Mujer</Pill>
            </div>
          </AnamnesisStep>
        )}

        {step === 3 && wantsCommitment && (
          <AnamnesisStep title="¿Qué tan comprometido quieres ser con el cambio?" onBack={() => setStep(2)} onNext={() => setStep(4)}>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {COMMITMENT_OPTIONS.map((c) => (
                <button key={c.id} onClick={() => setCommitment(c.id)} style={{
                  textAlign: "left", padding: "12px 14px", borderRadius: 12, cursor: "pointer",
                  border: `1px solid ${commitment === c.id ? palette.accent : palette.panelBorder}`,
                  background: commitment === c.id ? `${palette.accent}18` : palette.inputBg,
                }}>
                  <div style={{ fontSize: 13.5, fontWeight: 700, marginBottom: 3, display: "flex", alignItems: "center", gap: 6 }}>
                    {commitment === c.id && <Check size={13} color={palette.accent} />} {c.label}
                  </div>
                  <div style={{ fontSize: 11.5, color: palette.inkDim, lineHeight: 1.4 }}>{c.text}</div>
                </button>
              ))}
            </div>
            <p style={{ fontSize: 11, color: palette.inkDim, marginTop: 12, lineHeight: 1.4 }}>
              Fitra siempre va a priorizar recomendaciones que puedas sostener en el tiempo, para evitar el efecto rebote.
            </p>
          </AnamnesisStep>
        )}

        {step === 4 && (
          <AnamnesisStep title="¿Cuántos días a la semana puedes entrenar?" onBack={() => setStep(wantsCommitment ? 3 : 2)} onNext={() => setStep(5)}>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {[1, 2, 3, 4, 5, 6].map((n) => (
                <Pill key={n} active={daysAvailable === n} onClick={() => setDaysAvailable(n)}>{n}</Pill>
              ))}
            </div>
          </AnamnesisStep>
        )}

        {step === 5 && (
          <MotivationalFact text={FACT_1} onNext={() => setStep(wantsSports ? 6 : 7)} />
        )}

        {step === 6 && wantsSports && (
          <AnamnesisStep title="¿Practicas o te interesa algún deporte específico?" subtitle="Elige hasta 3." onBack={() => setStep(5)} onNext={() => setStep(7)}>
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

        {step === 7 && (
          <MotivationalFact text={FACT_2} onNext={() => setStep(8)} />
        )}

        {step === 8 && (
          <AnamnesisStep title="¿Alguna lesión o afección médica que debamos conocer?" onBack={() => setStep(7)} onNext={() => setStep(9)}>
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

        {step === 9 && (
          <AnamnesisStep title="Restricciones alimentarias y cocina" onBack={() => setStep(8)} onNext={() => setStep(10)}>
            <textarea
              value={dietaryRestrictions}
              onChange={(e) => setDietaryRestrictions(e.target.value)}
              placeholder="Ej: sin lactosa, vegetariano, alergia al maní..."
              style={taStyle}
            />
            <div style={{ fontSize: 12, color: palette.inkDim, margin: "14px 0 8px" }}>Utensilios que tienes disponibles</div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {EQUIPMENT_OPTIONS.map((item) => (
                <Pill key={item} active={kitchenEquipment.includes(item)} onClick={() => toggleEquipment(item)}>{EQUIPMENT_EMOJI[item]} {item}</Pill>
              ))}
            </div>
            <p style={{ fontSize: 11.5, color: palette.inkDim, marginTop: 12, lineHeight: 1.5 }}>
              Con esto podemos sugerirte recetas y planificar comidas que realmente puedas preparar en tu cocina.
            </p>
          </AnamnesisStep>
        )}

        {step === 10 && (
          <NotificationPermissionSlide onNext={() => setStep(11)} />
        )}

        {showAccountStep && !awaitingConfirmation && (
          <AnamnesisStep
            title="Crea tu cuenta"
            subtitle="Último paso — con esto guardamos todo lo que nos contaste."
            onBack={() => setStep(10)}
            onNext={handleCreateAccount}
            nextDisabled={creating || !email.trim() || !password}
            nextLabel={creating ? "Creando cuenta..." : "Crear cuenta"}
          >
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <label style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 12.5, color: palette.inkDim }}>
                Correo
                <div style={{ position: "relative" }}>
                  <span style={{ position: "absolute", left: 13, top: "50%", transform: "translateY(-50%)", color: palette.inkDim }}><Mail size={16} /></span>
                  <input
                    type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="tucorreo@ejemplo.com"
                    style={{ width: "100%", padding: "11px 14px 11px 38px", borderRadius: 11, border: `1px solid ${palette.panelBorder}`, background: palette.inputBg, color: palette.ink, fontSize: 14.5 }}
                  />
                </div>
              </label>
              <label style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 12.5, color: palette.inkDim, position: "relative" }}>
                Contraseña
                <div style={{ position: "relative" }}>
                  <span style={{ position: "absolute", left: 13, top: "50%", transform: "translateY(-50%)", color: palette.inkDim }}><Lock size={16} /></span>
                  <input
                    type={showPw ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••"
                    style={{ width: "100%", padding: "11px 38px 11px 38px", borderRadius: 11, border: `1px solid ${palette.panelBorder}`, background: palette.inputBg, color: palette.ink, fontSize: 14.5 }}
                  />
                  <button type="button" onClick={() => setShowPw(!showPw)} style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: palette.inkDim }}>
                    {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </label>
              <label style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 12.5, color: palette.inkDim }}>
                Confirmar contraseña
                <div style={{ position: "relative" }}>
                  <span style={{ position: "absolute", left: 13, top: "50%", transform: "translateY(-50%)", color: palette.inkDim }}><Lock size={16} /></span>
                  <input
                    type={showPw ? "text" : "password"} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="••••••••"
                    style={{ width: "100%", padding: "11px 14px 11px 38px", borderRadius: 11, border: `1px solid ${palette.panelBorder}`, background: palette.inputBg, color: palette.ink, fontSize: 14.5 }}
                  />
                </div>
              </label>
              {signupError && <p style={{ color: "#f87171", fontSize: 12.5 }}>{signupError}</p>}
              <p style={{ fontSize: 11, color: palette.inkDim, lineHeight: 1.5 }}>
                Te vamos a mandar un correo de confirmación, pero no hace falta que lo confirmes para empezar a usar FitTrack ya mismo.
              </p>
            </div>
          </AnamnesisStep>
        )}

        {showAccountStep && awaitingConfirmation && (
          <div style={{ textAlign: "center" }}>
            <div style={{
              width: 52, height: 52, borderRadius: "50%", background: `${palette.accent}22`,
              display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px", color: palette.accent,
            }}>
              <MailCheck size={24} />
            </div>
            <h2 style={{ fontSize: 19, fontWeight: 700, marginBottom: 8 }}>Revisa tu correo</h2>
            <p style={{ fontSize: 13.5, color: palette.inkDim, lineHeight: 1.5 }}>
              Te enviamos un link a <strong style={{ color: palette.ink }}>{email}</strong>. Apenas lo abras, quedas dentro de FitTrack con todo lo que nos contaste ya guardado.
            </p>
          </div>
        )}

        {step === 12 && (
          <AddToHomeScreenSlide onNext={() => setStep(13)} />
        )}

        {step === 13 && (
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
              Ya armamos tu perfil. Fitra va a usar todo esto para darte mejores recomendaciones desde el primer día.
            </p>
            <button onClick={() => router.push("/app")} disabled={saving} style={{
              width: "100%", padding: 13, borderRadius: 12, border: "none", cursor: "pointer",
              background: `linear-gradient(135deg, ${palette.accent}, ${palette.accentDeep})`, color: palette.bg,
              fontWeight: 700, fontSize: 14.5, opacity: saving ? 0.7 : 1,
            }}>
              {saving ? "Guardando..." : "Empezar a entrenar"}
            </button>
          </div>
        )}
        </div>
      </div>
    </div>
  );
}

const taStyle: React.CSSProperties = {
  width: "100%", minHeight: 70, padding: 12, borderRadius: 11, border: `1px solid ${palette.panelBorder}`,
  background: palette.inputBg, color: palette.ink, fontSize: 14, fontFamily: "inherit", resize: "vertical",
};

function NumberField({ label, value, onChange }: { label: string; value: number | null; onChange: (v: number | null) => void }) {
  return (
    <label style={{ flex: 1, display: "flex", flexDirection: "column", gap: 6, fontSize: 11, color: palette.inkDim }}>
      {label}
      <input
        type="number" inputMode="decimal" min={0} value={value ?? ""}
        onChange={(e) => onChange(e.target.value ? Math.max(0, +e.target.value) : null)}
        onKeyDown={(e) => { if (e.key === "-" || e.key === "+" || e.key === "e") e.preventDefault(); }}
        style={{ width: "100%", padding: 10, borderRadius: 10, border: `1px solid ${palette.panelBorder}`, background: palette.inputBg, color: palette.ink, fontSize: 14, textAlign: "center" }}
      />
    </label>
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
