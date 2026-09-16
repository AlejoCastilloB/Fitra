"use client";

import { shareInk, type ShareTone, type ShareInk } from "@/lib/shareImage";
import { formatDurationLabel } from "@/lib/formatDuration";

/**
 * Las tarjetas que se convierten en PNG.
 *
 * Ninguna lleva fondo, ni borde, ni sombra de caja, ni nada tocable: lo que no es
 * contenido queda transparente y la imagen se pega encima de una foto.
 *
 * El estilo visual sigue a la app: FitTrack no es una app de gimnasio con neones — su
 * paleta es gris pizarra. Así que la identidad aquí es tipográfica: números enormes,
 * etiquetas diminutas en versalitas muy espaciadas, líneas de un pixel, y un solo motivo
 * geométrico, el anillo de progreso, que es el mismo del cronómetro de descanso.
 */

/**
 * El ancho de la tarjeta que se convierte en PNG, en px.
 *
 * Fijo a propósito: con ancho fluido, html-to-image mide el texto un pelo distinto que el
 * navegador y una línea que en pantalla se parte en dos cabe entera en la imagen, dejando
 * un hueco. Lo usa ShareStage para saber cuánto encoger la vista previa.
 */
export const SHARE_CARD_WIDTH = 320;

export type ShareStyle = "resumen" | "minimo" | "racha" | "records";

export type WorkoutShareData = {
  routineName: string;
  volume: number;
  durationSec: number;
  setCount: number;
  prs: string[];
  comparison: { emoji: string; text: string };
  /** Semanas seguidas entrenando. Sin esto el estilo "racha" no se ofrece. */
  streakWeeks?: number | null;
  /** Qué días de ESTA semana hubo entreno, de lunes a domingo. */
  weekDays?: boolean[] | null;
};

/** Los estilos que tienen sentido con los datos que hay. El orden es el del selector. */
export function availableStyles(data: WorkoutShareData): { id: ShareStyle; label: string }[] {
  const estilos: { id: ShareStyle; label: string }[] = [
    { id: "resumen", label: "Resumen" },
    { id: "minimo", label: "Mínimo" },
  ];
  // Una racha de cero semanas no es un logro que compartir, es un recordatorio de que no
  // has entrenado. Solo se ofrece cuando hay algo que enseñar.
  if ((data.streakWeeks ?? 0) > 0) estilos.push({ id: "racha", label: "Racha" });
  if (data.prs.length > 0) estilos.push({ id: "records", label: "Récords" });
  return estilos;
}

const WORDMARK: React.CSSProperties = { fontSize: 10, fontWeight: 700, letterSpacing: "0.24em", textTransform: "uppercase" };
const EYEBROW: React.CSSProperties = { fontSize: 10, fontWeight: 700, letterSpacing: "0.16em", textTransform: "uppercase" };

/** El aire a los lados de la tarjeta: 18 px por banda en todos los estilos. */
const ANCHO_UTIL = SHARE_CARD_WIDTH - 36;

/**
 * Cuánto ocupa una cifra, en múltiplos del tamaño de fuente.
 *
 * Medido en el navegador con la fuente del sistema a peso 900 y -0.035em de interletraje:
 * un dígito son 0.661 em y un punto 0.345. Aquí se redondea hacia arriba (0.68 y 0.36)
 * porque la fuente del sistema no es la misma en todos los teléfonos y porque
 * html-to-image compone el texto un pelo distinto — y pasarse de ancho significa que la
 * imagen sale con el número cortado.
 */
function anchoEnEms(texto: string): number {
  let ancho = 0;
  for (const ch of texto) ancho += /[0-9]/.test(ch) ? 0.68 : 0.36;
  return ancho;
}

/**
 * Los números grandes, que son el centro de todas las tarjetas.
 *
 * El tamaño se calcula, no se fija: "11.112" a 86 px mediría 314 px y la tarjeta solo
 * tiene 284 de ancho útil, así que se salía por la derecha. Ahora cada cifra se encoge
 * lo justo para caber entera, y las cortas siguen saliendo al tamaño máximo.
 */
function cifra(texto: string, maxSize: number): React.CSSProperties {
  return {
    fontSize: Math.min(maxSize, Math.floor(ANCHO_UTIL / anchoEnEms(texto))),
    fontWeight: 900,
    lineHeight: 0.92,
    letterSpacing: "-0.035em",
    // Sin esto, los dígitos de distinto ancho bailan y el número se ve mal compuesto.
    fontVariantNumeric: "tabular-nums",
    whiteSpace: "nowrap",
  };
}

function frame(tone: ShareTone, padding = "28px 18px 22px"): React.CSSProperties {
  const c = shareInk(tone);
  return {
    width: SHARE_CARD_WIDTH,
    boxSizing: "border-box",
    margin: "0 auto",
    padding,
    textAlign: "center",
    color: c.ink,
    textShadow: c.shadow,
    fontFamily: "inherit",
  };
}

/**
 * El anillo de progreso: el único elemento no tipográfico de las tarjetas.
 *
 * Es el mismo gesto visual del cronómetro de descanso, y por eso funciona como marca:
 * quien use la app lo reconoce. El hueco del centro es donde va la cifra.
 */
function Ring({
  size, progress, c, children, stroke = 7,
}: { size: number; progress: number; c: ShareInk; children: React.ReactNode; stroke?: number }) {
  const r = (size - stroke) / 2;
  const circunferencia = 2 * Math.PI * r;
  const avance = Math.max(0, Math.min(1, progress));

  return (
    <div style={{ position: "relative", width: size, height: size, margin: "0 auto" }}>
      <svg width={size} height={size} style={{ display: "block", transform: "rotate(-90deg)" }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={c.rule} strokeWidth={stroke} />
        <circle
          cx={size / 2} cy={size / 2} r={r} fill="none" stroke={c.ink} strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circunferencia}
          strokeDashoffset={circunferencia * (1 - avance)}
        />
      </svg>
      <div style={{
        position: "absolute", inset: 0, display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center", gap: 2,
      }}>
        {children}
      </div>
    </div>
  );
}

/** Una línea de un pixel con aire a los lados. Separa sin pesar. */
function Regla({ c, margin = "20px auto" }: { c: ShareInk; margin?: string }) {
  return <div style={{ height: 1, width: 56, background: c.rule, margin }} />;
}

function Stat({ value, label, c }: { value: string; label: string; c: ShareInk }) {
  return (
    <div>
      <div style={{ fontSize: 17, fontWeight: 800, lineHeight: 1.1, fontVariantNumeric: "tabular-nums" }}>{value}</div>
      <div style={{ ...EYEBROW, fontSize: 8.5, color: c.dim, marginTop: 4 }}>{label}</div>
    </div>
  );
}

const DIAS = ["L", "M", "M", "J", "V", "S", "D"];

export function WorkoutShareCard({
  tone, style = "resumen", data,
}: { tone: ShareTone; style?: ShareStyle; data: WorkoutShareData }) {
  const c = shareInk(tone);

  if (style === "minimo") return <Minimo tone={tone} c={c} data={data} />;
  if (style === "racha") return <Racha tone={tone} c={c} data={data} />;
  if (style === "records") return <Records tone={tone} c={c} data={data} />;
  return <Resumen tone={tone} c={c} data={data} />;
}

/** Todo el entreno de un vistazo: el estilo por defecto. */
function Resumen({ tone, c, data }: { tone: ShareTone; c: ShareInk; data: WorkoutShareData }) {
  return (
    <div style={frame(tone)}>
      <div style={{ ...EYEBROW, color: c.dim, marginBottom: 6 }}>Entreno completado</div>
      <div style={{ fontSize: 19, fontWeight: 800, lineHeight: 1.2, marginBottom: 24 }}>{data.routineName}</div>

      <div style={cifra(data.volume.toLocaleString("es-CO"), 58)}>{data.volume.toLocaleString("es-CO")}</div>
      <div style={{ ...EYEBROW, color: c.dim, marginTop: 9 }}>kg de volumen</div>

      <div style={{ fontSize: 32, marginTop: 22, lineHeight: 1 }}>{data.comparison.emoji}</div>
      <p style={{ fontSize: 12.5, lineHeight: 1.5, color: c.dim, maxWidth: 250, margin: "8px auto 0" }}>
        Eso es como mover <span style={{ color: c.ink, fontWeight: 700 }}>{data.comparison.text}</span>
      </p>

      <div style={{ display: "flex", justifyContent: "center", gap: 28, marginTop: 24 }}>
        <Stat value={formatDurationLabel(data.durationSec)} label="Duración" c={c} />
        <Stat value={String(data.setCount)} label="Series" c={c} />
        {data.prs.length > 0 && <Stat value={String(data.prs.length)} label="Récords" c={c} />}
      </div>

      <Regla c={c} margin="22px auto 0" />
      <div style={{ ...WORDMARK, color: c.faint, marginTop: 18 }}>FitTrack</div>
    </div>
  );
}

/** Solo la cifra. Para cuando la foto es la protagonista y esto es el pie. */
function Minimo({ tone, c, data }: { tone: ShareTone; c: ShareInk; data: WorkoutShareData }) {
  return (
    <div style={frame(tone, "34px 18px 26px")}>
      <div style={{ ...EYEBROW, color: c.dim, marginBottom: 18 }}>{data.routineName}</div>

      <div style={cifra(data.volume.toLocaleString("es-CO"), 86)}>{data.volume.toLocaleString("es-CO")}</div>
      <div style={{ ...EYEBROW, color: c.dim, marginTop: 12 }}>kg de volumen</div>

      <Regla c={c} margin="26px auto" />

      <div style={{ display: "flex", justifyContent: "center", gap: 10, fontSize: 11.5, color: c.dim, fontWeight: 600 }}>
        <span>{formatDurationLabel(data.durationSec)}</span>
        <span style={{ color: c.faint }}>·</span>
        <span>{data.setCount} series</span>
      </div>

      <div style={{ ...WORDMARK, color: c.faint, marginTop: 26 }}>FitTrack</div>
    </div>
  );
}

/** La constancia, que es lo que de verdad cuesta. El anillo marca la semana. */
function Racha({ tone, c, data }: { tone: ShareTone; c: ShareInk; data: WorkoutShareData }) {
  const dias = data.weekDays ?? [];
  const entrenados = dias.filter(Boolean).length;
  const semanas = data.streakWeeks ?? 0;

  return (
    <div style={frame(tone, "30px 18px 24px")}>
      <div style={{ ...EYEBROW, color: c.dim, marginBottom: 22 }}>Racha activa</div>

      <Ring size={148} progress={entrenados / 7} c={c} stroke={8}>
        <div style={cifra(String(semanas), 56)}>{semanas}</div>
        <div style={{ ...EYEBROW, fontSize: 9, color: c.dim, marginTop: 4 }}>
          {semanas === 1 ? "semana" : "semanas"}
        </div>
      </Ring>

      <p style={{ fontSize: 12.5, color: c.dim, marginTop: 18, lineHeight: 1.5 }}>
        {semanas === 1 ? "Semana seguida entrenando" : "Semanas seguidas entrenando"}
      </p>

      <div style={{ display: "flex", justifyContent: "center", gap: 9, marginTop: 22 }}>
        {DIAS.map((d, i) => {
          const hecho = !!dias[i];
          return (
            <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 7 }}>
              <div style={{
                width: 9, height: 9, borderRadius: "50%",
                background: hecho ? c.ink : "transparent",
                border: hecho ? "none" : `1.5px solid ${c.rule}`,
                boxSizing: "border-box",
              }} />
              <span style={{ fontSize: 8.5, fontWeight: 700, letterSpacing: "0.08em", color: hecho ? c.dim : c.faint }}>{d}</span>
            </div>
          );
        })}
      </div>

      <div style={{ fontSize: 11.5, color: c.dim, marginTop: 16 }}>
        {entrenados} {entrenados === 1 ? "día" : "días"} esta semana
      </div>

      <Regla c={c} margin="20px auto 0" />
      <div style={{ ...WORDMARK, color: c.faint, marginTop: 18 }}>FitTrack</div>
    </div>
  );
}

/** Los récords del día, que es lo que se presume. */
function Records({ tone, c, data }: { tone: ShareTone; c: ShareInk; data: WorkoutShareData }) {
  return (
    <div style={frame(tone, "30px 18px 24px")}>
      <div style={{ ...EYEBROW, color: c.dim, marginBottom: 20 }}>Hoy rompí</div>

      <Ring size={126} progress={1} c={c} stroke={7}>
        <div style={cifra(String(data.prs.length), 50)}>{data.prs.length}</div>
      </Ring>

      <p style={{ ...EYEBROW, color: c.dim, marginTop: 16 }}>
        {data.prs.length === 1 ? "récord personal" : "récords personales"}
      </p>

      <Regla c={c} margin="20px auto" />

      <div style={{ display: "flex", flexDirection: "column", gap: 7, maxWidth: 268, margin: "0 auto" }}>
        {data.prs.map((p) => (
          <div key={p} style={{ fontSize: 12.5, fontWeight: 600, lineHeight: 1.35 }}>{p}</div>
        ))}
      </div>

      <div style={{ fontSize: 11, color: c.faint, marginTop: 20 }}>
        {data.routineName} · {formatDurationLabel(data.durationSec)}
      </div>

      <div style={{ ...WORDMARK, color: c.faint, marginTop: 18 }}>FitTrack</div>
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
      <div style={{ fontSize: 76, lineHeight: 1, marginBottom: 20 }}>{emoji}</div>
      <div style={{ ...EYEBROW, color: c.dim, marginBottom: 8 }}>Insignia desbloqueada</div>
      <div style={{ fontSize: 26, fontWeight: 800, lineHeight: 1.15, marginBottom: 10 }}>{title}</div>
      <p style={{ fontSize: 13, lineHeight: 1.5, color: c.dim, maxWidth: 260, margin: "0 auto" }}>{description}</p>
      <Regla c={c} margin="22px auto 0" />
      <div style={{ ...WORDMARK, color: c.faint, marginTop: 18 }}>FitTrack</div>
    </div>
  );
}

export function VolumeShareCard({
  tone, volume, comparison,
}: { tone: ShareTone; volume: number; comparison: { emoji: string; text: string } }) {
  const c = shareInk(tone);
  return (
    <div style={frame(tone)}>
      <div style={{ ...EYEBROW, color: c.dim, marginBottom: 16 }}>Volumen total movido</div>
      <div style={cifra(volume.toLocaleString("es-CO"), 54)}>{volume.toLocaleString("es-CO")}</div>
      <div style={{ ...EYEBROW, color: c.dim, marginTop: 9 }}>kg desde que empecé</div>
      <div style={{ fontSize: 32, marginTop: 22, lineHeight: 1 }}>{comparison.emoji}</div>
      <p style={{ fontSize: 12.5, lineHeight: 1.5, color: c.dim, maxWidth: 250, margin: "8px auto 0" }}>
        Eso es como mover <span style={{ color: c.ink, fontWeight: 700 }}>{comparison.text}</span>
      </p>
      <Regla c={c} margin="22px auto 0" />
      <div style={{ ...WORDMARK, color: c.faint, marginTop: 18 }}>FitTrack</div>
    </div>
  );
}
