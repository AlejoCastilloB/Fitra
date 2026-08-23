"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Dumbbell, Users, ChevronLeft, Mail, Lock, Eye, EyeOff, ArrowRight, MailCheck } from "lucide-react";

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

export default function LoginPage() {
  const [screen, setScreen] = useState<"select" | "trainer" | "user">("select");
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [signupSuccess, setSignupSuccess] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { data, error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (signInError) {
      setError("Correo o contraseña incorrectos.");
      setLoading(false);
      return;
    }

    const { data: userRow } = await supabase
      .from("users")
      .select("role")
      .eq("id", data.user.id)
      .single();

    router.push(userRow?.role === "trainer" ? "/coach" : "/app");
  }

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (password.length < 6) {
      setError("La contraseña debe tener al menos 6 caracteres.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Las contraseñas no coinciden.");
      return;
    }

    setLoading(true);
    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    });

    if (signUpError) {
      setError(signUpError.message.toLowerCase().includes("already registered") || signUpError.message.toLowerCase().includes("already been registered")
        ? "Ese correo ya tiene una cuenta. Inicia sesión en vez de crear una nueva."
        : "No pudimos crear la cuenta, intenta de nuevo.");
      setLoading(false);
      return;
    }

    if (data.session) {
      router.push("/onboarding");
      return;
    }

    setSignupSuccess(true);
    setLoading(false);
  }

  return (
    <div style={{ minHeight: "100vh", background: palette.bg, color: palette.ink, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "system-ui, sans-serif", padding: 20 }}>
      <div style={{
        width: "100%", maxWidth: 400, background: palette.panel, border: `1px solid ${palette.panelBorder}`,
        backdropFilter: "blur(22px)", WebkitBackdropFilter: "blur(22px)", borderRadius: 20, padding: "32px 28px",
        boxShadow: "0 20px 60px -20px rgba(0,0,0,0.35)",
      }}>
        {screen === "select" && (
          <>
            <h2 style={{ fontSize: 24, fontWeight: 700, margin: "0 0 6px" }}>Entrar a FitTrack</h2>
            <p style={{ color: palette.inkDim, fontSize: 14.5, margin: "0 0 26px" }}>¿Cómo quieres entrar hoy?</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <RoleCard icon={<Users size={20} />} title="Soy entrenador" sub="Gestiona clientes y rutinas" onClick={() => setScreen("trainer")} />
              <RoleCard icon={<Dumbbell size={20} />} title="Soy usuario" sub="Entrena y sigue tu plan" onClick={() => setScreen("user")} />
            </div>
          </>
        )}

        {screen !== "select" && signupSuccess && (
          <div style={{ textAlign: "center" }}>
            <div style={{
              width: 52, height: 52, borderRadius: "50%", background: `${palette.accent}22`,
              display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px", color: palette.accent,
            }}>
              <MailCheck size={24} />
            </div>
            <h2 style={{ fontSize: 19, fontWeight: 700, marginBottom: 8 }}>Revisa tu correo</h2>
            <p style={{ fontSize: 13.5, color: palette.inkDim, lineHeight: 1.5 }}>
              Te enviamos un link a <strong style={{ color: palette.ink }}>{email}</strong> para confirmar tu cuenta. Una vez lo confirmes, ya puedes iniciar sesión.
            </p>
          </div>
        )}

        {screen !== "select" && !signupSuccess && (
          <>
            <button onClick={() => setScreen("select")} style={{ display: "flex", alignItems: "center", gap: 6, background: "none", border: "none", color: palette.inkDim, fontSize: 13, cursor: "pointer", padding: "4px 6px", marginBottom: 18, marginLeft: -6 }}>
              <ChevronLeft size={15} /> Volver
            </button>

            <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", color: palette.accent, background: `${palette.accent}1a`, padding: "3px 9px", borderRadius: 999 }}>
              {screen === "trainer" ? "Entrenador" : "Usuario"}
            </span>
            <h2 style={{ fontSize: 23, fontWeight: 700, margin: "8px 0 4px" }}>
              {mode === "login" ? "Bienvenido de vuelta" : "Creemos tu cuenta"}
            </h2>

            <form onSubmit={mode === "login" ? handleLogin : handleSignup} style={{ display: "flex", flexDirection: "column", gap: 14, marginTop: 20 }}>
              <Field
                icon={<Mail size={16} />}
                type="email"
                placeholder="tucorreo@ejemplo.com"
                label="Correo"
                value={email}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)}
              />
              <div style={{ position: "relative" }}>
                <Field
                  icon={<Lock size={16} />}
                  type={showPw ? "text" : "password"}
                  placeholder="••••••••"
                  label="Contraseña"
                  value={password}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)}
                />
                <button type="button" onClick={() => setShowPw(!showPw)} style={{ position: "absolute", right: 12, top: 34, background: "none", border: "none", cursor: "pointer", color: palette.inkDim }}>
                  {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>

              {mode === "signup" && (
                <Field
                  icon={<Lock size={16} />}
                  type={showPw ? "text" : "password"}
                  placeholder="••••••••"
                  label="Confirmar contraseña"
                  value={confirmPassword}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setConfirmPassword(e.target.value)}
                />
              )}

              {error && <p style={{ color: "#f87171", fontSize: 13 }}>{error}</p>}

              <button type="submit" disabled={loading} style={{
                marginTop: 6, padding: "13px", borderRadius: 12, border: "none", cursor: "pointer",
                background: `linear-gradient(135deg, ${palette.accent}, ${palette.accentDeep})`,
                color: "#0A0C10", fontWeight: 700, fontSize: 14.5, display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                opacity: loading ? 0.7 : 1,
              }}>
                {mode === "login"
                  ? (loading ? "Entrando..." : <>Entrar <ArrowRight size={16} /></>)
                  : (loading ? "Creando cuenta..." : <>Crear cuenta <ArrowRight size={16} /></>)}
              </button>

              <button
                type="button"
                onClick={() => { setMode((m) => (m === "login" ? "signup" : "login")); setError(null); }}
                style={{ background: "none", border: "none", color: palette.accent, fontSize: 12.5, cursor: "pointer", marginTop: 2, textAlign: "center" }}
              >
                {mode === "login" ? "¿No tienes cuenta? Crear una" : "¿Ya tienes cuenta? Inicia sesión"}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}

function RoleCard({ icon, title, sub, onClick }: { icon: React.ReactNode; title: string; sub: string; onClick: () => void }) {
  return (
    <button onClick={onClick} style={{ display: "flex", alignItems: "center", gap: 14, textAlign: "left", padding: "16px 16px", borderRadius: 14, cursor: "pointer", background: palette.inputBg, border: `1px solid ${palette.panelBorder}`, color: palette.ink, width: "100%" }}>
      <div style={{ width: 42, height: 42, borderRadius: 11, background: `${palette.accent}22`, display: "flex", alignItems: "center", justifyContent: "center", color: palette.accent }}>{icon}</div>
      <div style={{ flex: 1 }}>
        <div style={{ fontWeight: 600, fontSize: 15 }}>{title}</div>
        <div style={{ fontSize: 12.5, color: palette.inkDim }}>{sub}</div>
      </div>
    </button>
  );
}

function Field({
  icon,
  label,
  ...props
}: { icon: React.ReactNode; label: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 12.5, color: palette.inkDim }}>
      {label}
      <div style={{ position: "relative" }}>
        <span style={{ position: "absolute", left: 13, top: "50%", transform: "translateY(-50%)", color: palette.inkDim }}>{icon}</span>
        <input {...props} style={{ width: "100%", padding: "11px 14px 11px 38px", borderRadius: 11, border: `1px solid ${palette.panelBorder}`, background: palette.inputBg, color: palette.ink, fontSize: 14.5 }} />
      </div>
    </label>
  );
}
