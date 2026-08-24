import Link from "next/link";
import { Dumbbell, Camera, ChefHat, MessagesSquare, Bell, TrendingUp, Check, ArrowRight, Sparkles } from "lucide-react";
import AppTour from "@/components/landing/AppTour";

const palette = {
  bg: "#0A0C10",
  panel: "rgba(255,255,255,0.055)",
  panelBorder: "rgba(255,255,255,0.09)",
  ink: "#E7EAEE",
  inkDim: "#8A93A0",
  accent: "#B9C2CE",
  accentDeep: "#5B6472",
};

const FEATURES = [
  { icon: Dumbbell, title: "Rutinas a tu medida" },
  { icon: Camera, title: "Comidas con una foto" },
  { icon: ChefHat, title: "Recetas al instante" },
  { icon: MessagesSquare, title: "Tu coach, siempre cerca" },
  { icon: Bell, title: "Avisos justo a tiempo" },
  { icon: TrendingUp, title: "Progreso medido" },
];

const STEPS = [
  { title: "Crea tu cuenta", text: "Regístrate en segundos con tu correo." },
  { title: "Cuéntanos de ti", text: "Objetivo, nivel, deportes y preferencias, para armar tu perfil." },
  { title: "Empieza a entrenar", text: "Tu plan, tu nutrición y tu coach, listos desde el primer día." },
];

export default function Home() {
  return (
    <main style={{
      background: palette.bg, color: palette.ink, position: "relative", fontFamily: "system-ui, sans-serif",
    }}>
      <style>{`
        @keyframes ftLandingIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: none; } }
        .ft-landing-in { animation: ftLandingIn .5s cubic-bezier(.16,.8,.24,1) both; }
      `}</style>

      <div style={{
        position: "fixed", top: "-15%", left: "-10%", width: 520, height: 520, borderRadius: "50%",
        filter: "blur(130px)", opacity: 0.2, background: `radial-gradient(circle, ${palette.accent}, transparent 70%)`,
        pointerEvents: "none",
      }} />
      <div style={{
        position: "fixed", bottom: "-18%", right: "-12%", width: 480, height: 480, borderRadius: "50%",
        filter: "blur(140px)", opacity: 0.14, background: `radial-gradient(circle, ${palette.accentDeep}, transparent 70%)`,
        pointerEvents: "none",
      }} />

      {/* nav */}
      <div style={{ position: "relative", zIndex: 1, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "20px 20px", maxWidth: 560, margin: "0 auto" }}>
        <span style={{ fontSize: 16, fontWeight: 800, letterSpacing: "-0.01em" }}>FitTrack</span>
        <Link href="/login" style={{ fontSize: 13, fontWeight: 600, color: palette.inkDim, textDecoration: "none" }}>Iniciar sesión</Link>
      </div>

      {/* hero */}
      <div className="ft-landing-in" style={{ position: "relative", zIndex: 1, textAlign: "center", padding: "24px 20px 40px", maxWidth: 480, margin: "0 auto" }}>
        <span style={{
          display: "inline-flex", alignItems: "center", gap: 6, fontSize: 11, fontWeight: 700, letterSpacing: "0.04em", textTransform: "uppercase",
          color: palette.accent, background: `${palette.accent}18`, padding: "5px 12px", borderRadius: 999, marginBottom: 18,
        }}>
          <Sparkles size={11} /> Con Fitra
        </span>
        <h1 style={{ fontSize: 30, fontWeight: 800, lineHeight: 1.2, margin: "0 0 14px" }}>
          Entrena, come mejor y avanza con tu coach
        </h1>
        <p style={{ color: palette.inkDim, fontSize: 15, lineHeight: 1.55, marginBottom: 26 }}>
          Rutinas, nutrición, seguimiento de tu coach y tu progreso real — todo en una sola app, pensada para que la uses todos los días.
        </p>
        <Link href="/login" style={{
          display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8, padding: "14px 28px", borderRadius: 13, textDecoration: "none",
          background: `linear-gradient(135deg, ${palette.accent}, ${palette.accentDeep})`, color: palette.bg,
          fontWeight: 700, fontSize: 15,
        }}>
          Comenzar gratis <ArrowRight size={16} />
        </Link>
      </div>

      {/* tour interactivo */}
      <div className="ft-landing-in" style={{ position: "relative", zIndex: 1, padding: "8px 20px 48px", maxWidth: 560, margin: "0 auto", animationDelay: ".08s" }}>
        <p style={{ fontSize: 11.5, fontWeight: 700, color: palette.accent, textTransform: "uppercase", letterSpacing: "0.06em", textAlign: "center", marginBottom: 20 }}>
          Así se ve por dentro
        </p>
        <AppTour />
      </div>

      {/* features */}
      <div style={{ position: "relative", zIndex: 1, padding: "0 20px 48px", maxWidth: 560, margin: "0 auto" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 10 }}>
          {FEATURES.map((f, i) => (
            <div key={i} className="ft-landing-in" style={{
              display: "flex", alignItems: "center", gap: 10, padding: "12px 14px", borderRadius: 14,
              background: palette.panel, border: `1px solid ${palette.panelBorder}`,
              backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)",
              animationDelay: `${0.1 + i * 0.03}s`,
            }}>
              <div style={{
                width: 32, height: 32, borderRadius: 9, background: `${palette.accent}22`,
                display: "flex", alignItems: "center", justifyContent: "center", color: palette.accent, flexShrink: 0,
              }}>
                <f.icon size={15} />
              </div>
              <div style={{ fontSize: 12.5, fontWeight: 700, lineHeight: 1.3 }}>{f.title}</div>
            </div>
          ))}
        </div>
      </div>

      {/* cómo funciona */}
      <div style={{ position: "relative", zIndex: 1, padding: "8px 20px 48px", maxWidth: 480, margin: "0 auto" }}>
        <p style={{ fontSize: 11.5, fontWeight: 700, color: palette.accent, textTransform: "uppercase", letterSpacing: "0.06em", textAlign: "center", marginBottom: 22 }}>
          Cómo funciona
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
          {STEPS.map((s, i) => (
            <div key={i} style={{ display: "flex", gap: 16 }}>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", flexShrink: 0 }}>
                <div style={{
                  width: 30, height: 30, borderRadius: "50%", background: `${palette.accent}22`, color: palette.accent,
                  display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 700, flexShrink: 0,
                  border: `1px solid ${palette.accent}55`,
                }}>
                  {i + 1}
                </div>
                {i < STEPS.length - 1 && <div style={{ width: 1, flex: 1, minHeight: 30, background: palette.panelBorder, margin: "4px 0" }} />}
              </div>
              <div style={{ paddingBottom: i < STEPS.length - 1 ? 22 : 0 }}>
                <div style={{ fontSize: 14.5, fontWeight: 700, marginBottom: 3 }}>{s.title}</div>
                <div style={{ fontSize: 12.5, color: palette.inkDim, lineHeight: 1.5 }}>{s.text}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* cta final */}
      <div style={{ position: "relative", zIndex: 1, padding: "0 20px 40px", maxWidth: 460, margin: "0 auto" }}>
        <div style={{
          borderRadius: 20, padding: "30px 24px", textAlign: "center",
          background: `radial-gradient(circle at 50% 0%, ${palette.accentDeep}44, ${palette.panel} 65%)`,
          border: `1px solid ${palette.panelBorder}`,
        }}>
          <div style={{
            width: 46, height: 46, borderRadius: "50%", background: `${palette.accent}22`,
            display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 14px", color: palette.accent,
          }}>
            <Check size={20} />
          </div>
          <h2 style={{ fontSize: 19, fontWeight: 800, marginBottom: 8 }}>Empieza cuando quieras</h2>
          <p style={{ fontSize: 13, color: palette.inkDim, lineHeight: 1.5, marginBottom: 20 }}>
            Crea tu cuenta gratis y arma tu perfil en un par de minutos.
          </p>
          <Link href="/login" style={{
            display: "block", textAlign: "center", padding: 13, borderRadius: 12, textDecoration: "none",
            background: `linear-gradient(135deg, ${palette.accent}, ${palette.accentDeep})`, color: palette.bg,
            fontWeight: 700, fontSize: 14.5,
          }}>
            Comenzar
          </Link>
        </div>
      </div>

      <div style={{ position: "relative", zIndex: 1, textAlign: "center", padding: "0 20px 30px", fontSize: 11, color: palette.inkDim }}>
        FitTrack · Fitra
      </div>
    </main>
  );
}
