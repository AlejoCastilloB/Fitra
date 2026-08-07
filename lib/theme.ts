export const palette = {
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
};

export const glassPanel: React.CSSProperties = {
  background: palette.panel,
  border: `1px solid ${palette.panelBorder}`,
  backdropFilter: "blur(20px)",
  WebkitBackdropFilter: "blur(20px)",
  borderRadius: 16,
};

// bloque contenedor limpio: mismo glass, pero pensado para agrupar filas adentro (sin padding propio)
export const cleanGroup: React.CSSProperties = {
  ...glassPanel,
  padding: 0,
  overflow: "hidden",
};

// título de sección arriba de un grupo de filas
export const groupTitle: React.CSSProperties = {
  fontSize: 12.5,
  fontWeight: 700,
  color: palette.inkDim,
  marginBottom: 8,
  paddingLeft: 4,
};
