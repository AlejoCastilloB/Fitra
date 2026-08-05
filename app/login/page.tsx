"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Dumbbell, Users, ChevronLeft, Mail, Lock, Eye, EyeOff, ArrowRight } from "lucide-react";

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
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
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

  async function handleGoogle() {
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
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
            <p style={{ color: palette.inkDim, fontSize: 14.5, margin: "0 0 26px" }}>¿Cómo querés entrar hoy?</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <RoleCard icon={<Users size={20} />} title="Soy entrenador" sub="Gestiona clientes y rutinas" onClick={() => setScreen("trainer")} />
              <RoleCard icon={<Dumbbell size={20} />} title="Soy usuario" sub="Entrena y sigue tu plan" onClick={() => setScreen("user")} />
            </div>
          </>
        )}

        {screen !== "select" && (
          <>
            <button onClick={() => setScreen("select")} style={{ display: "flex", alignItems: "center", gap: 6, background: "none", border: "none", color: palette.inkDim, fontSize: 13, cursor: "pointer", padding: "4px 6px", marginBottom: 18, marginLeft: -6 }}>
              <ChevronLeft size={15} /> Volver
            </button>

            <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", color: palette.accent, background: `${palette.accent}1a`, padding: "3px 9px", borderRadius: 999 }}>
              {screen === "trainer" ? "Entrenador" : "Usuario"}
            </span>
            <h2 style={{ fontSize: 23, fontWeight: 700, margin: "8px 0 4px" }}>Bienvenido de vuelta</h2>

            <form onSubmit={handleLogin} style={{ display: "flex", flexDirection: "column", gap: 14, marginTop: 20 }}>
              <Field icon={<Mail size={16} />} type="email" placeholder="tucorreo@ejemplo.com" label="Correo" value={email} onChange={(e) => setEmail(e.target.value)} />
              <div style={{ position: "relative" }}>
                <Field icon={<Lock size={16} />} type={showPw ? "text" : "password"} placeholder="••••••••" label="Contraseña" value={password} onChange={(e) => setPassword(e.target.value)} />
                <button type="button" onClick={() => setShowPw(!showPw)} style={{ position: "absolute", right: 12, top: 34, background: "none", border: "none", cursor: "pointer", color: palette.inkDim }}>
                  {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>

              {error && <p style={{ color: "#f87171", fontSize: 13 }}>{error}</p>}

              <button type="submit" disabled={loading} style={{
                marginTop: 6, padding: "13px", borderRadius: 12, border: "none", cursor: "pointer",
                background: `linear-gradient(135deg, ${palette.accent}, ${palette.accentDeep})`,
                color: "#0A0C10", fontWeight: 700, fontSize: 14.5, display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                opacity: loading ? 0.7 : 1,
              }}>
                {loading ? "Entrando..." : <>Entrar <ArrowRight size={16} /></>}
              </button>

              <button type="button" onClick={handleGoogle} style={{
                display: "flex", alignItems: "center", justifyContent: "center", gap: 10, padding: "12px", borderRadius: 12,
                border: `1px solid ${palette.panelBorder}`, background: palette.inputBg, color: palette.ink, fontSize: 14, fontWeight: 600, cursor: "pointer",
              }}>
                Continuar con Google
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

function Field({ icon, label, ...props }: any) {
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
