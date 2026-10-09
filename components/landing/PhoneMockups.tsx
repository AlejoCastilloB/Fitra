"use client";

/**
 * Las maquetas de pantalla que se enseñan en la landing.
 *
 * Están dibujadas con los mismos tokens del tema claro de la app en vez de ser capturas:
 * una captura envejece con cada cambio de la app y pesa, y en un teléfono se ve borrosa.
 * Esto es la pantalla de verdad en miniatura, y se mantiene sola.
 */

import { useState } from "react";
import { Flame, Sparkles, Trophy, Award, Check, X, SkipForward, ChevronRight, Home, TrendingUp, User } from "lucide-react";

const app = {
  bg: "#F4F5F7",
  panel: "rgba(15,18,24,0.045)",
  panelBorder: "rgba(15,18,24,0.10)",
  ink: "#181B21",
  inkDim: "#6B7280",
  accent: "#3D4451",
  accentDeep: "#181B21",
  glassFill: "rgba(255,255,255,0.55)",
  glassBorder: "rgba(255,255,255,0.75)",
};

const SET_BADGE: Record<string, { text: string; color: string }> = {
  warmup: { text: "C", color: "#D19A4A" },
  normal: { text: "", color: "" },
  dropset: { text: "D", color: "#A97DD1" },
};

const glassPanel: React.CSSProperties = {
  background: app.glassFill,
  border: `1px solid ${app.glassBorder}`,
  borderRadius: 16,
  boxShadow: "inset 0 1px 0 rgba(255,255,255,0.9), 0 8px 20px -10px rgba(20,20,30,0.14)",
};

function ScreenInicio() {
  const routines = [
    { name: "Push Day — Fuerza", meta: "5 ejercicios · ~48 min", active: true },
    { name: "Pull Day — Espalda y bíceps", meta: "6 ejercicios · ~50 min", active: false },
    { name: "Piernas — Fuerza e hipertrofia", meta: "5 ejercicios · ~55 min", active: false },
  ];
  return (
    <div style={{ padding: "36px 16px 18px", display: "flex", flexDirection: "column", gap: 10, height: "100%" }}>
      <div>
        <div style={{ fontSize: 15, fontWeight: 800, color: app.ink }}>Buenos días, Camila</div>
        <div style={{ fontSize: 11, color: app.inkDim }}>Lista para entrenar</div>
      </div>
      <div style={{ ...glassPanel, padding: 14, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <div style={{ fontSize: 9.5, color: app.inkDim, marginBottom: 3 }}>Calorías restantes</div>
          <div style={{ fontSize: 20, fontWeight: 800, color: app.ink }}>1,240 <span style={{ fontSize: 10, fontWeight: 600, color: app.inkDim }}>kcal</span></div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          {[["P", "#5EBBA0", "132g"], ["C", "#D19A4A", "98g"], ["G", "#C56767", "41g"]].map(([l, c, v]) => (
            <div key={l as string} style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <span style={{ width: 14, height: 14, borderRadius: 4, background: `${c}2a`, color: c as string, fontSize: 8, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center" }}>{l}</span>
              <span style={{ fontSize: 9.5, fontWeight: 700, color: app.ink }}>{v}</span>
            </div>
          ))}
        </div>
      </div>
      <div style={{ fontSize: 9, fontWeight: 700, color: app.accent, textTransform: "uppercase", letterSpacing: "0.04em", marginTop: 2 }}>Tus rutinas</div>
      {routines.map((r) => (
        <div key={r.name} style={{
          ...glassPanel, padding: 12, display: "flex", alignItems: "center", gap: 10,
          borderColor: r.active ? `${app.accent}55` : app.glassBorder,
        }}>
          <div style={{ width: 30, height: 30, borderRadius: "50%", background: `${app.accent}18`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <Flame size={13} color={app.accent} />
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 10.5, fontWeight: 700, color: app.ink, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{r.name}</div>
            <div style={{ fontSize: 8.5, color: app.inkDim }}>{r.meta}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

function ScreenEntreno() {
  const [modalOpen, setModalOpen] = useState(false);
  const sets = [
    { type: "warmup", r: 12, w: 8, done: true },
    { type: "normal", r: 10, w: 16, done: true },
    { type: "normal", r: 10, w: 16, done: false },
    { type: "dropset", r: 8, w: 12, done: false },
  ];
  let normalCount = 0;

  return (
    <div style={{ padding: "36px 16px 18px", display: "flex", flexDirection: "column", gap: 8, height: "100%", position: "relative" }}>
      <button
        onClick={() => setModalOpen(true)}
        style={{
          ...glassPanel, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8,
          padding: "9px 11px", marginBottom: 2, border: "none", cursor: "pointer", width: "100%", textAlign: "left",
        }}
      >
        <div>
          <div style={{ fontSize: 10.5, fontWeight: 700, color: app.ink }}>Sentadilla búlgara</div>
          <div style={{ fontSize: 8.5, color: app.inkDim }}>3 series completadas</div>
        </div>
        <ChevronRight size={13} color={app.inkDim} />
      </button>

      <div style={{ fontSize: 13, fontWeight: 800, color: app.ink, marginTop: 4, marginBottom: 2 }}>Press banca</div>
      <div style={{ display: "flex", gap: 6, fontSize: 8.5, color: app.inkDim, fontWeight: 700, textTransform: "uppercase", padding: "0 2px" }}>
        <span style={{ width: 22, textAlign: "center" }}>Serie</span>
        <span style={{ width: 44, textAlign: "center" }}>Reps</span>
        <span style={{ width: 44, textAlign: "center" }}>Peso</span>
      </div>
      {sets.map((s, i) => {
        if (s.type === "normal") normalCount++;
        const badge = SET_BADGE[s.type];
        return (
          <div key={i} style={{
            display: "flex", gap: 6, alignItems: "center", padding: "6px 2px", borderRadius: 8,
            background: s.done ? "rgba(94,187,160,0.16)" : "transparent",
          }}>
            <span style={{
              width: 22, height: 22, borderRadius: 6, background: badge.color ? `${badge.color}22` : app.panel,
              color: badge.color || app.ink, fontSize: 10, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              {s.type === "normal" ? normalCount : badge.text}
            </span>
            <span style={{ width: 44, height: 22, borderRadius: 6, border: `1px solid ${app.panelBorder}`, fontSize: 10, color: app.ink, display: "flex", alignItems: "center", justifyContent: "center" }}>{s.r}</span>
            <span style={{ width: 44, height: 22, borderRadius: 6, border: `1px solid ${app.panelBorder}`, fontSize: 10, color: app.ink, display: "flex", alignItems: "center", justifyContent: "center" }}>{s.w}</span>
            <span style={{ width: 22, height: 22, borderRadius: "50%", background: s.done ? "#5EBBA0" : "transparent", border: s.done ? "none" : `1.5px solid ${app.panelBorder}`, display: "flex", alignItems: "center", justifyContent: "center", marginLeft: "auto" }}>
              {s.done && <Check size={12} color="#fff" />}
            </span>
          </div>
        );
      })}
      <div style={{
        marginTop: 4, padding: "8px 0", borderRadius: 10, border: `1.5px dashed ${app.accent}55`,
        color: app.accent, fontSize: 10, fontWeight: 700, textAlign: "center", background: `${app.accent}0d`,
      }}>+ Agregar serie</div>
      <div style={{ marginTop: 4 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 9.5, color: app.inkDim, marginBottom: 4 }}>
          <span style={{ fontWeight: 700, color: app.ink }}>Descansando · 72s</span>
          <span style={{ display: "flex", alignItems: "center", gap: 3, color: app.accent, fontWeight: 700 }}><SkipForward size={11} /> Saltar</span>
        </div>
        <div style={{ height: 5, borderRadius: 3, background: app.panel, overflow: "hidden" }}>
          <div style={{ width: "62%", height: "100%", background: app.accent }} />
        </div>
      </div>

      {modalOpen && (
        <div
          onClick={() => setModalOpen(false)}
          style={{
            position: "absolute", inset: 0, background: "rgba(20,20,26,0.45)", borderRadius: 25,
            display: "flex", alignItems: "flex-end", zIndex: 5,
          }}
        >
          <div onClick={(e) => e.stopPropagation()} style={{
            width: "100%", background: app.bg, borderTopLeftRadius: 20, borderTopRightRadius: 20,
            padding: 16, boxShadow: "0 -8px 24px -8px rgba(0,0,0,0.2)",
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
              <span style={{ fontSize: 11.5, fontWeight: 800, color: app.ink }}>Sentadilla búlgara</span>
              <X size={14} color={app.inkDim} onClick={() => setModalOpen(false)} />
            </div>
            {[["Calentamiento", "12 reps · 8 kg"], ["Serie 1", "10 reps · 16 kg"], ["Serie 2", "10 reps · 16 kg"]].map(([l, v]) => (
              <div key={l} style={{ display: "flex", justifyContent: "space-between", fontSize: 9.5, color: app.inkDim, padding: "5px 0" }}>
                <span>{l}</span><span style={{ color: app.ink, fontWeight: 600 }}>{v}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function ScreenAsistente() {
  return (
    <div style={{ padding: "36px 16px 18px", display: "flex", flexDirection: "column", gap: 8, height: "100%" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12.5, fontWeight: 800, color: app.ink, marginBottom: 4 }}>
        <Sparkles size={13} color={app.accent} /> Tu asistente
      </div>
      <div style={{ ...glassPanel, padding: "9px 11px", fontSize: 10.5, color: app.ink, alignSelf: "flex-start", maxWidth: "84%", borderBottomLeftRadius: 4 }}>
        Cuéntame qué ingredientes tienes y te sugiero algo rico 👋
      </div>
      <div style={{
        padding: "9px 11px", borderRadius: 14, borderBottomRightRadius: 4, fontSize: 10.5, color: app.bg,
        background: `linear-gradient(135deg, ${app.accent}, ${app.accentDeep})`, alignSelf: "flex-end", maxWidth: "84%",
      }}>
        Tengo pollo, arroz y brócoli
      </div>
      <div style={{ ...glassPanel, padding: 10, alignSelf: "flex-start", maxWidth: "92%" }}>
        <div style={{ fontSize: 10.5, color: app.ink, marginBottom: 6 }}>Te armo un bowl de pollo con arroz — 420 kcal, 38g de proteína 🍗</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 3, marginBottom: 8 }}>
          {["Sella el pollo 6 min por lado", "Cocina el arroz con caldo de verduras", "Sirve con el brócoli al vapor"].map((step, i) => (
            <div key={i} style={{ display: "flex", gap: 6, fontSize: 9, color: app.inkDim }}>
              <span style={{ fontWeight: 800, color: app.accent }}>{i + 1}.</span> {step}
            </div>
          ))}
        </div>
        <div style={{ padding: "6px 10px", borderRadius: 8, background: app.panel, fontSize: 9.5, fontWeight: 700, color: app.accent, textAlign: "center" }}>Guardar receta</div>
      </div>
    </div>
  );
}

function ScreenProgreso() {
  return (
    <div style={{ padding: "36px 16px 18px", display: "flex", flexDirection: "column", gap: 10, height: "100%" }}>
      <div style={{ ...glassPanel, padding: 14, display: "flex", alignItems: "center", gap: 10 }}>
        <div style={{ width: 38, height: 38, borderRadius: "50%", background: `${app.accent}18`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15, fontWeight: 800, color: app.accent }}>C</div>
        <div>
          <div style={{ fontSize: 12.5, fontWeight: 800, color: app.ink }}>Camila</div>
          <div style={{ fontSize: 9.5, color: app.inkDim, display: "flex", alignItems: "center", gap: 3 }}><Flame size={10} color={app.accent} /> 6 semanas de racha</div>
        </div>
      </div>
      <div style={{ display: "flex", gap: 8 }}>
        {[["23", "Entrenos", Trophy], ["8.4t", "Volumen", Award], ["11", "Récords", Trophy]].map(([v, l, Icon]: any) => (
          <div key={l} style={{ ...glassPanel, flex: 1, padding: "10px 6px", textAlign: "center" }}>
            <Icon size={12} color={app.accent} style={{ marginBottom: 4 }} />
            <div style={{ fontSize: 13, fontWeight: 800, color: app.ink }}>{v}</div>
            <div style={{ fontSize: 8, color: app.inkDim }}>{l}</div>
          </div>
        ))}
      </div>
      <div style={{ fontSize: 9.5, fontWeight: 700, color: app.accent, textTransform: "uppercase", letterSpacing: "0.04em", marginTop: 2 }}>Récords recientes</div>
      {[["Press banca", "42.5 kg"], ["Sentadilla", "70 kg"]].map(([n, v]) => (
        <div key={n} style={{ ...glassPanel, padding: "9px 12px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontSize: 10.5, color: app.ink }}>{n}</span>
          <span style={{ fontSize: 10.5, fontWeight: 700, color: app.accent }}>{v}</span>
        </div>
      ))}
    </div>
  );
}

/** Cada bloque de la landing: una pantalla con lo que cuenta. */
export const SCREENS: { id: string; Screen: () => JSX.Element; tab: number; title: string; text: string }[] = [
  {
    id: "inicio",
    Screen: ScreenInicio,
    tab: 0,
    title: "Tu día, de un vistazo",
    text: "Al abrir la app ves lo que toca hoy: la rutina del día, las calorías que te quedan y tus macros. Sin menús ni pestañas de por medio.",
  },
  {
    id: "entreno",
    Screen: ScreenEntreno,
    tab: 0,
    title: "Entrena sin pelear con la app",
    text: "Marca cada serie con un toque. Calentamientos, dropsets y superseries se ven como lo que son, el descanso arranca solo al terminar una serie y puedes saltarlo cuando quieras.",
  },
  {
    id: "asistente",
    Screen: ScreenAsistente,
    tab: 1,
    title: "Nutrición sin contar a mano",
    text: "Tómale una foto al plato y tu asistente calcula calorías y macros. ¿No sabes qué cocinar? Cuéntale qué tienes en la cocina y te arma la receta con su preparación paso a paso.",
  },
  {
    id: "progreso",
    Screen: ScreenProgreso,
    tab: 2,
    title: "Tu progreso, medido solo",
    text: "Racha, récords personales y volumen total se calculan con lo que vas marcando. No hay nada que apuntar aparte para ver si estás avanzando.",
  },
];

/**
 * El teléfono que enmarca una pantalla.
 *
 * Se escala con un transform y el hueco que ocupa se calcula aparte: si se escalara sin
 * reservar el tamaño, el teléfono encogería pero seguiría ocupando el alto entero y
 * dejaría un agujero debajo.
 */
export function PhoneFrame({ children, tab = 0, scale = 1 }: { children: React.ReactNode; tab?: number; scale?: number }) {
  const ANCHO = 240;
  const ALTO = 500;
  return (
    <div style={{ width: ANCHO * scale, height: ALTO * scale, flexShrink: 0 }}>
      <div style={{
        width: ANCHO, height: ALTO, borderRadius: 38, background: "#0A0C10", padding: 12,
        boxShadow: "0 30px 60px -24px rgba(20,24,34,0.45), inset 0 0 0 1px rgba(255,255,255,0.08)",
        position: "relative", transform: `scale(${scale})`, transformOrigin: "top left",
      }}>
        <div style={{ width: "100%", height: "100%", borderRadius: 27, background: app.bg, overflow: "hidden", position: "relative" }}>
          <div style={{
            position: "absolute", top: 9, left: "50%", transform: "translateX(-50%)", width: 68, height: 20,
            borderRadius: 999, background: "#0A0C10", zIndex: 2,
            boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.06)",
          }} />
          <div style={{ height: "100%", paddingBottom: ALTO_TAB }}>{children}</div>
          <TabBar activo={tab} />
        </div>
      </div>
    </div>
  );
}

/** Alto de la barra de pestañas, descontado del alto útil de la pantalla. */
const ALTO_TAB = 44;

/**
 * La barra de abajo, igual que la de la app.
 *
 * No es decoración: sin ella las pantallas cortas dejaban un hueco blanco al final del
 * teléfono que parecía un error de maquetación en vez de una app.
 */
function TabBar({ activo }: { activo: number }) {
  const items = [
    { Icon: Home, label: "Inicio" },
    { Icon: TrendingUp, label: "Progreso" },
    { Icon: User, label: "Perfil" },
  ];
  return (
    <div style={{
      position: "absolute", left: 0, right: 0, bottom: 0, height: ALTO_TAB,
      display: "flex", alignItems: "center", justifyContent: "space-around",
      background: "rgba(255,255,255,0.86)", borderTop: `1px solid ${app.panelBorder}`,
    }}>
      {items.map(({ Icon, label }, i) => (
        <div key={label} style={{
          display: "flex", flexDirection: "column", alignItems: "center", gap: 2,
          color: i === activo ? app.accent : app.inkDim, opacity: i === activo ? 1 : 0.65,
        }}>
          <Icon size={14} />
          <span style={{ fontSize: 7.5, fontWeight: 600 }}>{label}</span>
        </div>
      ))}
    </div>
  );
}
