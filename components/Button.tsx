"use client";

import { usePalette, type Palette } from "@/lib/theme";
import { fontSize, radius, MIN_TOUCH_SIZE } from "@/lib/designScale";

/**
 * El botón de la app.
 *
 * Antes el botón principal —ese degradado verde— estaba escrito desde cero 52 veces en 31
 * archivos, cada una con su propio relleno, radio y tamaño de letra: dos botones idénticos
 * a la vista en la misma pantalla tenían 16/14/14.5 y 15/13/14. Nadie nota el píxel de
 * diferencia; lo que se notaba era que la app parecía hecha pantalla por pantalla, y que
 * cambiar cómo se ven todos los botones eran 52 ediciones.
 *
 * Los tamaños de aquí salen de lo que ya predominaba en el código. Lo que sí cambia:
 * ningún botón baja de 44 px de alto, que es el mínimo para tocar con el dedo.
 */

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
export type ButtonSize = "sm" | "md" | "lg";

const SIZES: Record<ButtonSize, { padding: string; fontSize: number; minHeight: number; radius: number; gap: number }> = {
  // `sm` es el único que puede bajar de 44 px de alto, y solo porque va en filas donde
  // el contenedor entero ya es tocable (chips de filtro, píldoras dentro de una tarjeta).
  sm: { padding: "8px 14px", fontSize: fontSize.caption, minHeight: 34, radius: radius.sm, gap: 5 },
  md: { padding: "12px 18px", fontSize: fontSize.body, minHeight: MIN_TOUCH_SIZE, radius: radius.md, gap: 7 },
  lg: { padding: "14px 20px", fontSize: fontSize.subtitle, minHeight: 50, radius: radius.lg, gap: 8 },
};

function variantStyle(variant: ButtonVariant, palette: Palette): React.CSSProperties {
  switch (variant) {
    case "primary":
      return {
        background: `linear-gradient(135deg, ${palette.accent}, ${palette.accentDeep})`,
        color: palette.bg,
        border: "none",
        fontWeight: 700,
      };
    case "secondary":
      return {
        background: `${palette.accent}18`,
        color: palette.accent,
        border: `1px solid ${palette.accent}55`,
        fontWeight: 700,
      };
    case "danger":
      return {
        background: "#c0392b",
        color: "#fff",
        border: "none",
        fontWeight: 700,
      };
    case "ghost":
    default:
      return {
        background: "none",
        color: palette.inkDim,
        border: `1px solid ${palette.panelBorder}`,
        fontWeight: 600,
      };
  }
}

export default function Button({
  variant = "primary",
  size = "md",
  fullWidth = false,
  loading = false,
  loadingLabel,
  icon,
  children,
  style,
  disabled,
  ...rest
}: {
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
  /** Bloquea el botón y cambia el texto. Evita el doble toque que duplica el dato. */
  loading?: boolean;
  loadingLabel?: string;
  icon?: React.ReactNode;
  children?: React.ReactNode;
} & Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "children">) {
  const palette = usePalette();
  const s = SIZES[size];
  const bloqueado = disabled || loading;

  return (
    <button
      {...rest}
      disabled={bloqueado}
      style={{
        display: "inline-flex", alignItems: "center", justifyContent: "center", gap: s.gap,
        padding: s.padding, minHeight: s.minHeight, borderRadius: s.radius, fontSize: s.fontSize,
        fontFamily: "inherit", lineHeight: 1.2, cursor: bloqueado ? "default" : "pointer",
        opacity: bloqueado ? 0.55 : 1, width: fullWidth ? "100%" : undefined,
        touchAction: "manipulation",
        ...variantStyle(variant, palette),
        ...style,
      }}
    >
      {!loading && icon}
      {loading ? (loadingLabel ?? children) : children}
    </button>
  );
}
