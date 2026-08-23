import Link from "next/link";
import { Dumbbell, Utensils, MessagesSquare } from "lucide-react";

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
  { icon: Dumbbell, title: "Rutinas a tu medida", text: "Entrena con planes armados para ti o generados por la IA de Alejo." },
  { icon: Utensils, title: "Nutrición sin vueltas", text: "Registra tus comidas con una foto y lleva el control de tus macros." },
  { icon: MessagesSquare, title: "Tu coach, siempre cerca", text: "Seguimiento real de tu entrenador, todo en un solo lugar." },
];

export default function Home() {
  return (
    <main style={{
      minHeight: "100vh", background: palette.bg, color: palette.ink, position: "relative", overflow: "hidden",
      display: "flex", flexDirection: "column", fontFamily: "system-ui, sans-serif",
    }}>
      <style>{`
        @keyframes ftLandingIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: none; } }
        .ft-landing-in { animation: ftLandingIn .5s cubic-bezier(.16,.8,.24,1) both; }
      `}</style>

      <div style={{
        position: "fixed", top: "-15%", left: "-10%", width: 520, height: 520, borderRadius: "50%",
        filter: "blur(130px)", opacity: 0.22, background: `radial-gradient(circle, ${palette.accent}, transparent 70%)`,
        pointerEvents: "none",
      }} />
      <div style={{
        position: "fixed", bottom: "-18%", right: "-12%", width: 480, height: 480, borderRadius: "50%",
        filter: "blur(140px)", opacity: 0.16, background: `radial-gradient(circle, ${palette.accentDeep}, transparent 70%)`,
        pointerEvents: "none",
      }} />

      <div style={{ position: "relative", zIndex: 1, flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "40px 20px", maxWidth: 460, margin: "0 auto", width: "100%" }}>
        <div className="ft-landing-in" style={{ textAlign: "center", marginBottom: 40 }}>
          <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: "-0.01em", marginBottom: 10 }}>FitTrack</div>
          <h1 style={{ fontSize: 27, fontWeight: 800, lineHeight: 1.25, margin: "0 0 12px" }}>
            Entrena, come mejor y avanza con tu coach
          </h1>
          <p style={{ color: palette.inkDim, fontSize: 14.5, lineHeight: 1.5 }}>
            Todo tu progreso — entrenamientos, nutrición y seguimiento — en una sola app.
          </p>
        </div>

        <div className="ft-landing-in" style={{ display: "flex", flexDirection: "column", gap: 14, width: "100%", marginBottom: 40, animationDelay: ".08s" }}>
          {FEATURES.map((f, i) => (
            <div key={i} style={{
              display: "flex", alignItems: "center", gap: 14, padding: "14px 16px", borderRadius: 16,
              background: palette.panel, border: `1px solid ${palette.panelBorder}`,
              backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)",
            }}>
              <div style={{
                width: 40, height: 40, borderRadius: 11, background: `${palette.accent}22`,
                display: "flex", alignItems: "center", justifyContent: "center", color: palette.accent, flexShrink: 0,
              }}>
                <f.icon size={18} />
              </div>
              <div>
                <div style={{ fontSize: 13.5, fontWeight: 700 }}>{f.title}</div>
                <div style={{ fontSize: 12, color: palette.inkDim, marginTop: 1, lineHeight: 1.4 }}>{f.text}</div>
              </div>
            </div>
          ))}
        </div>

        <div className="ft-landing-in" style={{ display: "flex", flexDirection: "column", gap: 10, width: "100%", animationDelay: ".14s" }}>
          <Link href="/login" style={{
            display: "block", textAlign: "center", padding: 14, borderRadius: 13, textDecoration: "none",
            background: `linear-gradient(135deg, ${palette.accent}, ${palette.accentDeep})`, color: palette.bg,
            fontWeight: 700, fontSize: 15,
          }}>
            Comenzar
          </Link>
          <p style={{ textAlign: "center", fontSize: 12, color: palette.inkDim }}>
            Crea tu cuenta o inicia sesión en el siguiente paso.
          </p>
        </div>
      </div>
    </main>
  );
}
