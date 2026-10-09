"use client";

import { useEffect } from "react";
import Link from "next/link";
import {
  Dumbbell, Camera, MessagesSquare, Bell, TrendingUp, ArrowRight,
  FileInput, Repeat, Check, Smartphone,
} from "lucide-react";
import { SCREENS, PhoneFrame } from "@/components/landing/PhoneMockups";

/**
 * La portada.
 *
 * Fondo blanco y la misma tinta que el tema claro de la app: lo primero que ve alguien
 * tiene que parecerse a lo que se va a encontrar dentro.
 *
 * El orden es el de cualquier landing que convierte: qué es, para quién, cómo se ve por
 * dentro, qué más trae, cómo se empieza. Lo que antes estaba escondido detrás de un
 * acordeón ahora se lee de corrido — un texto que hay que tocar para leer no lo lee
 * nadie —, y cada bloque grande va con su pantalla al lado en vez de un carrusel, que
 * obligaba a deslizar para enterarse de lo que hace la app.
 */

const palette = {
  bg: "#FFFFFF",
  soft: "#F4F5F7",
  panel: "rgba(15,18,24,0.035)",
  panelBorder: "rgba(15,18,24,0.10)",
  ink: "#181B21",
  inkDim: "#6B7280",
  accent: "#3D4451",
  accentDeep: "#181B21",
};

/** Lo que de verdad podemos prometer. Nada de valoraciones ni descargas inventadas. */
const PROMESAS = ["Gratis para empezar", "Sin anuncios", "En español", "Se instala como app"];

const EXTRAS = [
  { icon: FileInput, title: "Importa la rutina que ya tienes", text: "Pega el texto o sube la captura que te pasó tu entrenador. Se leen los días, los ejercicios, las series y los descansos, y quedan listos para revisar." },
  { icon: Repeat, title: "Superseries y dropsets de verdad", text: "No son una nota al margen: la app entiende series de calentamiento, al fallo, dropsets y ejercicios encadenados, y te los marca mientras entrenas." },
  { icon: Bell, title: "Avisos justo a tiempo", text: "El aviso de fin de descanso te llega aunque tengas el teléfono bloqueado, y los recordatorios de comida a la hora que tú elijas." },
  { icon: Dumbbell, title: "Biblioteca con más de 1.300 ejercicios", text: "Con su animación, el músculo que trabaja y el equipo que necesita. Y si te falta alguno, lo creas tú en diez segundos." },
  { icon: Camera, title: "Comparte tu entreno", text: "Al terminar, la app te arma una imagen con tu resumen, tu racha o tus récords, lista para tu historia." },
  { icon: TrendingUp, title: "Tu historial completo", text: "Cada entreno queda guardado con sus pesos y sus reps, para que sepas con cuánto fuiste la última vez sin tener que acordarte." },
];

const PASOS = [
  { title: "Crea tu cuenta", text: "Con tu correo, en menos de un minuto." },
  { title: "Cuéntanos de ti", text: "Tu objetivo, tu nivel y los días que puedes entrenar." },
  { title: "Empieza a entrenar", text: "Tu plan y tu nutrición, listos desde el primer día." },
];

export default function LandingContent() {
  useEffect(() => {
    document.body.style.background = palette.bg;
  }, []);

  return (
    <main style={{ background: palette.bg, color: palette.ink, fontFamily: "system-ui, sans-serif" }}>
      <style>{`
        @keyframes ftLandingIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: none; } }
        .ft-landing-in { animation: ftLandingIn .5s cubic-bezier(.16,.8,.24,1) both; }
        .ft-wrap { max-width: 1040px; margin: 0 auto; padding-left: 20px; padding-right: 20px; }
        .ft-narrow { max-width: 620px; margin: 0 auto; }
        /* Cada bloque: la pantalla encima en el teléfono, al lado en pantallas anchas. */
        .ft-block { display: flex; flex-direction: column; align-items: center; gap: 26px; }
        .ft-block-text { max-width: 440px; text-align: center; }
        .ft-grid { display: grid; grid-template-columns: 1fr; gap: 12px; }
        @media (min-width: 760px) {
          .ft-block { flex-direction: row; justify-content: center; gap: 64px; align-items: center; }
          .ft-block.ft-rev { flex-direction: row-reverse; }
          .ft-block-text { text-align: left; }
          .ft-grid { grid-template-columns: 1fr 1fr; gap: 14px; }
        }
      `}</style>

      {/* nav */}
      <div className="ft-wrap" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "18px 20px" }}>
        <span style={{ fontSize: 17, fontWeight: 800, letterSpacing: "-0.02em" }}>Fitra</span>
        <Link href="/login" style={{
          fontSize: 13, fontWeight: 700, color: palette.ink, textDecoration: "none",
          padding: "8px 14px", borderRadius: 10, border: `1px solid ${palette.panelBorder}`,
        }}>
          Iniciar sesión
        </Link>
      </div>

      {/* hero */}
      <section className="ft-wrap ft-landing-in" style={{ textAlign: "center", padding: "36px 20px 0" }}>
        <p style={{
          fontSize: 12, fontWeight: 800, color: palette.accent, textTransform: "uppercase",
          letterSpacing: "0.12em", marginBottom: 16,
        }}>
          Entrena · Come mejor · Avanza
        </p>
        <h1 style={{ fontSize: "clamp(31px, 7.6vw, 40px)", lineHeight: 1.12, fontWeight: 800, letterSpacing: "-0.03em", margin: "0 auto 16px", maxWidth: 620 }}>
          Tu entrenamiento y tu nutrición, en una sola app
        </h1>
        <p style={{ color: palette.inkDim, fontSize: 16, lineHeight: 1.55, margin: "0 auto 26px", maxWidth: 480 }}>
          Registra tus series, mide tu progreso real y lleva tus comidas con una foto.
          Si entrenas con coach, él ve tu avance desde el primer día.
        </p>
        <Link href="/login" style={{
          display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8,
          padding: "15px 30px", borderRadius: 13, textDecoration: "none",
          background: palette.accentDeep, color: "#fff", fontWeight: 700, fontSize: 15.5,
        }}>
          Comenzar gratis <ArrowRight size={17} />
        </Link>

        {/* Lo que Hevy pone aquí son sus estrellas y sus millones de usuarios. Nosotros
            todavía no los tenemos, y una cifra inventada se nota: va lo que sí es cierto. */}
        <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: 8, margin: "24px 0 0" }}>
          {PROMESAS.map((p) => (
            <span key={p} style={{
              display: "inline-flex", alignItems: "center", gap: 6, padding: "7px 13px", borderRadius: 999,
              background: palette.soft, fontSize: 12.5, fontWeight: 600, color: palette.inkDim,
            }}>
              <Check size={13} color={palette.accent} /> {p}
            </span>
          ))}
        </div>
      </section>

      {/* bloques con pantalla */}
      <section className="ft-wrap" style={{ padding: "56px 20px 0" }}>
        {SCREENS.map(({ id, Screen, tab, title, text }, i) => (
          <div
            key={id}
            className={`ft-block ft-landing-in${i % 2 === 1 ? " ft-rev" : ""}`}
            style={{ paddingBottom: 44, animationDelay: `${0.05 + i * 0.03}s` }}
          >
            <PhoneFrame tab={tab} scale={0.86}><Screen /></PhoneFrame>
            <div className="ft-block-text">
              <h2 style={{ fontSize: 25, fontWeight: 800, letterSpacing: "-0.02em", lineHeight: 1.2, margin: "0 0 10px" }}>{title}</h2>
              <p style={{ fontSize: 15, color: palette.inkDim, lineHeight: 1.6, margin: 0 }}>{text}</p>
            </div>
          </div>
        ))}
      </section>

      {/* coach: lo que no tiene ninguna app de registro */}
      <section className="ft-wrap" style={{ padding: "0 20px 64px" }}>
        <div className="ft-narrow" style={{
          borderRadius: 24, padding: "32px 26px", textAlign: "center",
          background: palette.soft, border: `1px solid ${palette.panelBorder}`,
        }}>
          <div style={{
            width: 46, height: 46, borderRadius: 14, background: "#fff", border: `1px solid ${palette.panelBorder}`,
            display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px", color: palette.accent,
          }}>
            <MessagesSquare size={20} />
          </div>
          <h2 style={{ fontSize: 23, fontWeight: 800, letterSpacing: "-0.02em", margin: "0 0 10px" }}>
            Y si entrenas con coach, él entrena contigo
          </h2>
          <p style={{ fontSize: 15, color: palette.inkDim, lineHeight: 1.6, margin: "0 auto", maxWidth: 440 }}>
            Tu entrenador te arma las rutinas desde su panel, ve cada entreno que terminas
            con los pesos que levantaste, y hablan por el chat de la app. Nada de capturas
            por WhatsApp ni hojas de cálculo que nadie actualiza.
          </p>
        </div>
      </section>

      {/* lo demás que trae */}
      <section className="ft-wrap" style={{ padding: "0 20px 56px" }}>
        <h2 style={{ fontSize: 25, fontWeight: 800, letterSpacing: "-0.02em", textAlign: "center", margin: "0 0 26px" }}>
          Todo lo demás que trae
        </h2>
        <div className="ft-grid">
          {EXTRAS.map((f, i) => (
            <div key={f.title} className="ft-landing-in" style={{
              padding: "18px 18px", borderRadius: 18, background: palette.bg,
              border: `1px solid ${palette.panelBorder}`, animationDelay: `${0.05 + i * 0.03}s`,
            }}>
              <div style={{
                width: 34, height: 34, borderRadius: 11, background: palette.soft,
                display: "flex", alignItems: "center", justifyContent: "center", color: palette.accent, marginBottom: 12,
              }}>
                <f.icon size={16} />
              </div>
              <div style={{ fontSize: 15, fontWeight: 700, lineHeight: 1.3, marginBottom: 6 }}>{f.title}</div>
              <p style={{ fontSize: 13.5, color: palette.inkDim, lineHeight: 1.55, margin: 0 }}>{f.text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* cómo funciona */}
      <section className="ft-wrap" style={{ padding: "0 20px 56px" }}>
        <div className="ft-narrow">
          <h2 style={{ fontSize: 25, fontWeight: 800, letterSpacing: "-0.02em", textAlign: "center", margin: "0 0 26px" }}>
            Cómo se empieza
          </h2>
          {PASOS.map((s, i) => (
            <div key={s.title} style={{ display: "flex", gap: 16 }}>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", flexShrink: 0 }}>
                <div style={{
                  width: 32, height: 32, borderRadius: "50%", background: palette.accentDeep, color: "#fff",
                  display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 700,
                }}>
                  {i + 1}
                </div>
                {i < PASOS.length - 1 && <div style={{ width: 1, flex: 1, minHeight: 28, background: palette.panelBorder, margin: "6px 0" }} />}
              </div>
              <div style={{ paddingBottom: i < PASOS.length - 1 ? 24 : 0 }}>
                <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 4 }}>{s.title}</div>
                <div style={{ fontSize: 14, color: palette.inkDim, lineHeight: 1.55 }}>{s.text}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* cta final */}
      <section className="ft-wrap" style={{ padding: "0 20px 56px" }}>
        <div className="ft-narrow" style={{
          borderRadius: 24, padding: "38px 26px", textAlign: "center",
          background: palette.accentDeep, color: "#fff",
        }}>
          <h2 style={{ fontSize: 26, fontWeight: 800, letterSpacing: "-0.02em", margin: "0 0 10px" }}>
            Tu primer entreno, hoy
          </h2>
          <p style={{ fontSize: 15, lineHeight: 1.55, margin: "0 auto 22px", maxWidth: 380, color: "rgba(255,255,255,0.72)" }}>
            Crea tu cuenta gratis y arma tu perfil en un par de minutos. No hace falta tarjeta.
          </p>
          <Link href="/login" style={{
            display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8,
            padding: "14px 30px", borderRadius: 12, textDecoration: "none",
            background: "#fff", color: palette.accentDeep, fontWeight: 700, fontSize: 15,
          }}>
            Comenzar gratis <ArrowRight size={16} />
          </Link>
          <p style={{
            display: "flex", alignItems: "center", justifyContent: "center", gap: 7,
            fontSize: 12.5, color: "rgba(255,255,255,0.6)", margin: "18px 0 0",
          }}>
            <Smartphone size={14} /> Funciona en el navegador y se instala en tu teléfono
          </p>
        </div>
      </section>

      {/* pie */}
      <footer style={{ borderTop: `1px solid ${palette.panelBorder}` }}>
        <div className="ft-wrap" style={{
          display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between",
          gap: 12, padding: "22px 20px 30px",
        }}>
          <div>
            <div style={{ fontSize: 15, fontWeight: 800, letterSpacing: "-0.02em" }}>Fitra</div>
            <div style={{ fontSize: 12.5, color: palette.inkDim, marginTop: 2 }}>
              Entrenamiento, nutrición y seguimiento de coach.
            </div>
          </div>
          <div style={{ display: "flex", gap: 16, fontSize: 12.5 }}>
            <Link href="/login" style={{ color: palette.inkDim, textDecoration: "none" }}>Iniciar sesión</Link>
            <Link href="/onboarding" style={{ color: palette.inkDim, textDecoration: "none" }}>Crear cuenta</Link>
          </div>
        </div>
      </footer>
    </main>
  );
}
