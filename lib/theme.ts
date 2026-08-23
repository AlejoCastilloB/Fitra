"use client";

import { createContext, useContext } from "react";

export type ThemeName = "light" | "dark";

export type Palette = {
  bg: string;
  panel: string;
  panelBorder: string;
  panelHover: string;
  ink: string;
  inkDim: string;
  accent: string;
  accentDeep: string;
  inputBg: string;
  danger: string;
  divider: string;
  metallic: string;
  metallicBorder: string;
  glassPanel: React.CSSProperties;
  cleanGroup: React.CSSProperties;
  groupTitle: React.CSSProperties;
};

type PaletteBase = Omit<Palette, "glassPanel" | "cleanGroup" | "groupTitle">;

function buildPalette(base: PaletteBase): Palette {
  const glassPanel: React.CSSProperties = {
    background: base.panel,
    border: `1px solid ${base.panelBorder}`,
    backdropFilter: "blur(20px)",
    WebkitBackdropFilter: "blur(20px)",
    borderRadius: 16,
  };
  const cleanGroup: React.CSSProperties = { ...glassPanel, padding: 0, overflow: "hidden" };
  const groupTitle: React.CSSProperties = {
    fontSize: 12.5, fontWeight: 700, color: base.inkDim, marginBottom: 8, paddingLeft: 4,
  };
  return { ...base, glassPanel, cleanGroup, groupTitle };
}

export const darkPalette: Palette = buildPalette({
  bg: "#0A0C10",
  panel: "rgba(255,255,255,0.055)",
  panelBorder: "rgba(255,255,255,0.09)",
  panelHover: "rgba(255,255,255,0.09)",
  ink: "#E7EAEE",
  inkDim: "#8A93A0",
  accent: "#B9C2CE",
  accentDeep: "#5B6472",
  inputBg: "rgba(255,255,255,0.04)",
  danger: "#f87171",
  divider: "rgba(255,255,255,0.08)",
  metallic: "linear-gradient(135deg, #EDEFF3 0%, #C9D0DA 40%, #8A93A0 75%, #5B6472 100%)",
  metallicBorder: "linear-gradient(135deg, rgba(255,255,255,0.35), rgba(255,255,255,0.05))",
});

export const lightPalette: Palette = buildPalette({
  bg: "#F4F5F7",
  panel: "rgba(15,18,24,0.045)",
  panelBorder: "rgba(15,18,24,0.10)",
  panelHover: "rgba(15,18,24,0.065)",
  ink: "#181B21",
  inkDim: "#6B7280",
  accent: "#3D4451",
  accentDeep: "#181B21",
  inputBg: "rgba(15,18,24,0.035)",
  danger: "#DC2626",
  divider: "rgba(15,18,24,0.09)",
  metallic: "linear-gradient(135deg, #3D4451 0%, #545C6B 40%, #6B7280 75%, #8A93A0 100%)",
  metallicBorder: "linear-gradient(135deg, rgba(0,0,0,0.18), rgba(0,0,0,0.02))",
});

type ThemeContextValue = {
  theme: ThemeName;
  palette: Palette;
  setTheme: (theme: ThemeName) => void;
};

export const ThemeContext = createContext<ThemeContextValue | null>(null);

export function usePalette(): Palette {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("usePalette debe usarse dentro de ThemeProvider");
  return ctx.palette;
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme debe usarse dentro de ThemeProvider");
  return ctx;
}
