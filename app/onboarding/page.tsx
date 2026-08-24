"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Dumbbell, Users, Check, Mail, Lock, Eye, EyeOff, MailCheck } from "lucide-react";
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

const PENDING_INVITE_KEY = "fittrack_pending_invite";
const PENDING_ONBOARDING_KEY = "fittrack_pending_onboarding";
const STEP_COUNT = 12;
const FACT_1 = "Las personas que entrenan siguiendo un plan estructurado tienen 2 a 3 veces más probabilidades de mantener el hábito después de 6 meses, comparado con quienes entrenan sin rutina.";
const FACT_2 = "Ponerte una meta concreta (no \"quiero mejorar\", sino un número y una fecha) multiplica por casi 10 tus probabilidades de lograrla.";

type ClientAnswers = {
  displayName: string; goal: string | null; level: string | null; daysAvailable: number;
  injuries: string; medicalNotes: string; sports: string[]; otherSportText: string;
  sportDetails: Record<string, SportDetail>; dietaryRestrictions: string; kitchenEquipment: string[];
  effectiveInvite: string | null;
};

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
  const urlInvite = searchParams.get("invite");

  const [effectiveInvite, setEffectiveInvite] = useState<string | null>(urlInvite);
  const [authChecked, setAuthChecked] = useState(false);
  const [role, setRole] = useState<"trainer" | "client" | null>(urlInvite ? "client" : null);
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

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [creating, setCreating] = useState(false);
  const [signupError, setSignupError] = useState<string | null>(null);
  const [awaitingConfirmation, setAwaitingConfirmation] = useState(false);

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

  async function saveClientData(overrides?: ClientAnswers) {
    const d: ClientAnswers = overrides ?? {
      displayName, goal, level, daysAvailable, injuries, medicalNotes, sports, otherSportText,
      sportDetails, dietaryRestrictions, kitchenEquipment, effectiveInvite,
    };
    setSaving(true);
    const { data: auth } = await supabase.auth.getUser();
    const uid = auth.user!.id;

    let trainerId: string | null = null;
    if (d.effectiveInvite) {
      const { data: invite } = await supabase
        .from("invites")
        .select("id, trainer_id, used_by")
        .eq("code", d.effectiveInvite)
        .single();

      if (invite && !invite.used_by) {
        trainerId = invite.trainer_id;
        await supabase.from("invites").update({ used_by: uid }).eq("id", invite.id);
      }
      localStorage.removeItem(PENDING_INVITE_KEY);
    }

    const sportsDetails = d.sports.map((s) => ({
      sport: s === "Otro" ? (d.otherSportText.trim() || "Otro") : s,
      ...(d.sportDetails[s] || { level: "", experience: "", includeInPlan: true }),
    }));

    const aiContext = buildAiContext({
      goal: d.goal, level: d.level, daysAvailable: d.daysAvailable, sportsDetails,
      injuries: d.injuries, medicalNotes: d.medicalNotes, dietaryRestrictions: d.dietaryRestrictions, kitchenEquipment: d.kitchenEquipment,
    });

    await supabase.from("users").insert({ id: uid, email: auth.user!.email, role: "client", display_name: d.displayName.trim(), theme_pref: "light" });
    await supabase.from("clients").insert({
      user_id: uid,
      trainer_id: trainerId,
      lifestyle: { goal: d.goal, level: d.level, days_available: d.daysAvailable },
      injuries: { notes: d.injuries },
      medical_notes: d.medicalNotes,
      dietary_restrictions: d.dietaryRestrictions,
      kitchen_equipment: d.kitchenEquipment,
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

  useEffect(() => {
    (async () => {
      let invite = urlInvite;
      if (!invite) invite = localStorage.getItem(PENDING_INVITE_KEY);
      if (invite) {
        setEffectiveInvite(invite);
        setRole((r) => r ?? "client");
      }

      const { data: auth } = await supabase.auth.getUser();
      if (auth.user) {
        const { data: existingUserRow } = await supabase.from("users").select("role").eq("id", auth.user.id).single();
        if (existingUserRow) {
          router.replace(existingUserRow.role === "trainer" ? "/coach" : "/app");
          return;
        }

        const pendingRaw = localStorage.getItem(PENDING_ONBOARDING_KEY);
        if (pendingRaw) {
          try {
            const pending = JSON.parse(pendingRaw);
            if (pending.role === "trainer") {
              await finishTrainer();
            } else {
              await saveClientData(pending.answers as ClientAnswers);
              router.push("/app");
            }
            localStorage.removeItem(PENDING_ONBOARDING_KEY);
            return;
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
    const { data, error: signUpError } = await supabase.auth.signUp({
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
      if (role === "trainer") await finishTrainer();
      else { await saveClientData(); setStep(10); }
      setCreating(false);
      return;
    }

    localStorage.setItem(PENDING_ONBOARDING_KEY, JSON.stringify({
      role,
      answers: { displayName, goal, level, daysAvailable, injuries, medicalNotes, sports, otherSportText, sportDetails, dietaryRestrictions, kitchenEquipment, effectiveInvite },
    }));
    setAwaitingConfirmation(true);
    setCreating(false);
  }

  const progress = role === "client" ? (step + 1) / STEP_COUNT : 0;
  const showAccountStep = role === "trainer" || (role === "client" && step === 9);
  const stepKey = role === null ? "role" : showAccountStep ? (awaitingConfirmation ? "confirm" : "account") : `${role}-${step}`;

  if (!authChecked) return null;

  return (
    <div style={{ minHeight: "100vh", background: palette.bg, color: palette.ink, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "system-ui, sans-serif", padding: 20 }}>
      <div style={{
        width: "100%", maxWidth: 440, background: palette.panel, border: `1px solid ${palette.panelBorder}`,
        backdropFilter: "blur(32px) saturate(180%)", WebkitBackdropFilter: "blur(32px) saturate(180%)", borderRadius: 20, padding: "32px 28px",
        boxShadow: palette.glassShadow,
      }}>
        {role === "client" && (
          <div style={{ height: 4, borderRadius: 999, background: palette.inputBg, marginBottom: 24, overflow: "hidden" }}>
            <div style={{ height: "100%", width: `${progress * 100}%`, background: palette.accent, transition: "width .3s" }} />
          </div>
        )}

        <div key={stepKey} className="ft-step-in">
        {role === null && (
          <>
            <h2 style={{ fontSize: 22, fontWeight: 700, margin: "0 0 6px" }}>¿Cómo entras a FitTrack?</h2>
            <p style={{ color: palette.inkDim, fontSize: 14, margin: "0 0 22px" }}>Esto solo se define una vez.</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <RoleBtn icon={<Users size={20} />} title="Soy entrenador" onClick={() => setRole("trainer")} />
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

        {showAccountStep && !awaitingConfirmation && (
          <AnamnesisStep
            title="Crea tu cuenta"
            subtitle="Último paso — con esto guardamos todo lo que nos contaste."
            onBack={role === "client" ? () => setStep(8) : () => setRole(null)}
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

        {role === "client" && step === 10 && (
          <AddToHomeScreenSlide onNext={() => setStep(11)} />
        )}

        {role === "client" && step === 11 && (
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
              background: `linear-gradient(135deg, ${palette.accent}, ${palette.accentDeep})`, color: "#0A0C10",
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
