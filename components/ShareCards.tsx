"use client";

import { shareInk, type ShareTone } from "@/lib/shareImage";
import { formatDurationLabel } from "@/lib/formatDuration";

/**
 * Las tarjetas que se convierten en PNG.
 *
 * Ninguna lleva fondo, borde ni sombra de caja: lo que no es texto queda transparente.
 * Tampoco llevan botones ni nada tocable — son solo la imagen. Todo lo interactivo vive
 * fuera, en la pantalla que las usa.
 */

const WORDMARK: React.CSSProperties = { fontSize: 10, fontWeight: 700, letterSpacing: "0.22em", textTransform: "uppercase" };
const EYEBROW: React.CSSProperties = { fontSize: 10.5, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase" };

function frame(tone: ShareTone): React.CSSProperties {
  const c = shareInk(tone);
  return {
    // Ancho fijo a propósito. Con ancho fluido, html-to-image mide el texto un pelo
    // distinto que el navegador y una línea que en pantalla se parte en dos cabe entera
    // en el PNG — y queda un hueco donde estaba la segunda línea.
    width: 320,
    boxSizing: "border-box",
    margin: "0 auto",
    padding: "26px 18px 22px",
    textAlign: "center",
    color: c.ink,
    textShadow: c.shadow,
    // El texto de la app hereda la fuente del sistema; aquí se fija para que la imagen
    // salga igual en cualquier teléfono.
    fontFamily: "inherit",
  };
}

export function WorkoutShareCard({
  tone, routineName, volume, durationSec, setCount, prs, comparison,
}: {
  tone: ShareTone;
  routineName: string;
  volume: number;
  durationSec: number;
  setCount: number;
  prs: string[];
  comparison: { emoji: string; text: string };
}) {
  const c = shareInk(tone);
  return (
    <div style={frame(tone)}>
      <div style={{ ...EYEBROW, color: c.dim, marginBottom: 5 }}>Entreno completado</div>
      <div style={{ fontSize: 20, fontWeight: 800, lineHeight: 1.2, marginBottom: 22 }}>{routineName}</div>

      <div style={{ fontSize: 56, fontWeight: 900, lineHeight: 0.95, letterSpacing: "-0.02em" }}>
        {volume.toLocaleString("es-CO")}
      </div>
      <div style={{ ...EYEBROW, color: c.dim, marginTop: 7 }}>kg de volumen</div>

      <div style={{ fontSize: 34, marginTop: 20, lineHeight: 1 }}>{comparison.emoji}</div>
      <p style={{ fontSize: 12.5, lineHeight: 1.5, color: c.dim, maxWidth: 250, margin: "8px auto 0" }}>
        Eso es como mover <span style={{ color: c.ink, fontWeight: 700 }}>{comparison.text}</span>
      </p>

      <div style={{ display: "flex", justifyContent: "center", gap: 26, marginTop: 22 }}>
        <Stat value={formatDurationLabel(durationSec)} label="Duración" c={c} />
        <Stat value={String(setCount)} label="Series" c={c} />
        {prs.length > 0 && <Stat value={String(prs.length)} label="Récords" c={c} />}
      </div>

      {prs.length > 0 && (
        <div style={{ marginTop: 22, paddingTop: 18, borderTop: `1px solid ${c.rule}` }}>
          <div style={{ ...EYEBROW, color: c.dim, marginBottom: 10 }}>Récords personales</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6, maxWidth: 272, margin: "0 auto" }}>
            {prs.map((p) => (
              <div key={p} style={{ fontSize: 12, fontWeight: 600, lineHeight: 1.35 }}>{p}</div>
            ))}
          </div>
        </div>
      )}

      <div style={{ ...WORDMARK, color: c.faint, marginTop: 24 }}>FitTrack</div>
    </div>
  );
}

export function AchievementShareCard({
  tone, emoji, title, description,
}: { tone: ShareTone; emoji: string; title: string; description: string }) {
  const c = shareInk(tone);
  return (
    <div style={frame(tone)}>
      {/* Sin el marco redondeado de la app: aquel llevaba una sombra de 60 px que se salía
          de la caja y el recorte del PNG la cortaba por un lado. */}
      <div style={{ fontSize: 76, lineHeight: 1, marginBottom: 18 }}>{emoji}</div>
      <div style={{ ...EYEBROW, color: c.dim, marginBottom: 7 }}>Insignia desbloqueada</div>
      <div style={{ fontSize: 26, fontWeight: 800, lineHeight: 1.15, marginBottom: 10 }}>{title}</div>
      <p style={{ fontSize: 13, lineHeight: 1.5, color: c.dim, maxWidth: 260, margin: "0 auto" }}>{description}</p>
      <div style={{ ...WORDMARK, color: c.faint, marginTop: 24 }}>FitTrack</div>
    </div>
  );
}

export function VolumeShareCard({
  tone, volume, comparison,
}: { tone: ShareTone; volume: number; comparison: { emoji: string; text: string } }) {
  const c = shareInk(tone);
  return (
    <div style={frame(tone)}>
      <div style={{ ...EYEBROW, color: c.dim, marginBottom: 12 }}>Volumen total movido</div>
      <div style={{ fontSize: 52, fontWeight: 900, lineHeight: 0.95, letterSpacing: "-0.02em" }}>
        {volume.toLocaleString("es-CO")}
      </div>
      <div style={{ ...EYEBROW, color: c.dim, marginTop: 7 }}>kg desde que empecé</div>
      <div style={{ fontSize: 34, marginTop: 20, lineHeight: 1 }}>{comparison.emoji}</div>
      <p style={{ fontSize: 12.5, lineHeight: 1.5, color: c.dim, maxWidth: 250, margin: "8px auto 0" }}>
        Eso es como mover <span style={{ color: c.ink, fontWeight: 700 }}>{comparison.text}</span>
      </p>
      <div style={{ ...WORDMARK, color: c.faint, marginTop: 24 }}>FitTrack</div>
    </div>
  );
}

function Stat({ value, label, c }: { value: string; label: string; c: ReturnType<typeof shareInk> }) {
  return (
    <div>
      <div style={{ fontSize: 18, fontWeight: 800, lineHeight: 1.1 }}>{value}</div>
      <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: c.dim, marginTop: 3 }}>{label}</div>
    </div>
  );
}
