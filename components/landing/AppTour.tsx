"use client";

import { useState } from "react";
import { Flame, Sparkles, Trophy, Award, Check, X, SkipForward, ChevronRight } from "lucide-react";

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

function ScreenFitra() {
  return (
    <div style={{ padding: "36px 16px 18px", display: "flex", flexDirection: "column", gap: 8, height: "100%" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12.5, fontWeight: 800, color: app.ink, marginBottom: 4 }}>
        <Sparkles size={13} color={app.accent} /> Fitra
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

const SLIDES = [
  { Screen: ScreenInicio, caption: "Tu día, de un vistazo — rutina, calorías y macros en una sola tarjeta." },
  { Screen: ScreenEntreno, caption: "Marca tus series (con calentamiento y dropsets incluidos), salta el descanso si quieres, o toca un ejercicio para ver su detalle." },
  { Screen: ScreenFitra, caption: "Fitra te sugiere recetas con su preparación paso a paso, solo con contarle qué tienes." },
  { Screen: ScreenProgreso, caption: "Racha, récords y volumen — tu progreso real, medido automáticamente." },
];

export default function AppTour() {
  const [active, setActive] = useState(0);
  const [touchStartX, setTouchStartX] = useState<number | null>(null);

  function go(i: number) {
    setActive((i + SLIDES.length) % SLIDES.length);
  }

  function handleTouchStart(e: React.TouchEvent) {
    setTouchStartX(e.touches[0].clientX);
  }
  function handleTouchEnd(e: React.TouchEvent) {
    if (touchStartX === null) return;
    const dx = e.changedTouches[0].clientX - touchStartX;
    if (dx > 40) go(active - 1);
    else if (dx < -40) go(active + 1);
    setTouchStartX(null);
  }

  const { Screen, caption } = SLIDES[active];

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
      <div
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        style={{
          width: 240, height: 500, borderRadius: 38, background: "#0A0C10", padding: 12,
          boxShadow: "0 30px 60px -20px rgba(0,0,0,0.5), inset 0 0 0 1px rgba(255,255,255,0.08)",
          position: "relative",
        }}
      >
        <div style={{ width: "100%", height: "100%", borderRadius: 27, background: app.bg, overflow: "hidden", position: "relative" }}>
          <div style={{
            position: "absolute", top: 9, left: "50%", transform: "translateX(-50%)", width: 68, height: 20,
            borderRadius: 999, background: "#0A0C10", zIndex: 2,
            boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.06)",
          }} />
          <div key={active} className="ft-step-in" style={{ height: "100%" }}>
            <Screen />
          </div>
        </div>
      </div>

      <p style={{ fontSize: 13, color: "#E7EAEE", textAlign: "center", lineHeight: 1.5, maxWidth: 260, margin: "18px 0 14px", minHeight: 40 }}>
        {caption}
      </p>

      <div style={{ display: "flex", gap: 7 }}>
        {SLIDES.map((_, i) => (
          <button
            key={i}
            onClick={() => go(i)}
            aria-label={`Ver pantalla ${i + 1}`}
            style={{
              width: i === active ? 20 : 7, height: 7, borderRadius: 4, border: "none", cursor: "pointer",
              background: i === active ? "#B9C2CE" : "rgba(255,255,255,0.18)", transition: "all .25s ease",
            }}
          />
        ))}
      </div>
    </div>
  );
}
