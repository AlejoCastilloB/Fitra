"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Mail, Lock, Eye, EyeOff, ArrowRight } from "lucide-react";

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

export default function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    document.body.style.background = palette.bg;
  }, []);

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

  return (
    <div style={{ minHeight: "100vh", background: palette.bg, color: palette.ink, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "system-ui, sans-serif", padding: 20 }}>
      <div style={{
        width: "100%", maxWidth: 400, background: palette.panel, border: `1px solid ${palette.panelBorder}`,
        backdropFilter: "blur(22px)", WebkitBackdropFilter: "blur(22px)", borderRadius: 20, padding: "32px 28px",
        boxShadow: "0 20px 60px -20px rgba(0,0,0,0.35)",
      }}>
        <h2 style={{ fontSize: 24, fontWeight: 700, margin: "0 0 6px" }}>Bienvenido de vuelta</h2>
        <p style={{ color: palette.inkDim, fontSize: 14.5, margin: "0 0 26px" }}>Entra a tu cuenta de FitTrack</p>

        <form onSubmit={handleLogin} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
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

          {error && <p style={{ color: "#f87171", fontSize: 13 }}>{error}</p>}

          <button type="submit" disabled={loading} style={{
            marginTop: 6, padding: "13px", borderRadius: 12, border: "none", cursor: "pointer",
            background: `linear-gradient(135deg, ${palette.accent}, ${palette.accentDeep})`,
            color: "#0A0C10", fontWeight: 700, fontSize: 14.5, display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
            opacity: loading ? 0.7 : 1,
          }}>
            {loading ? "Entrando..." : <>Entrar <ArrowRight size={16} /></>}
          </button>

          <Link
            href="/onboarding"
            style={{ background: "none", border: "none", color: palette.accent, fontSize: 12.5, cursor: "pointer", marginTop: 2, textAlign: "center", textDecoration: "none" }}
          >
            ¿No tienes cuenta? Crear una
          </Link>
        </form>
      </div>
    </div>
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
