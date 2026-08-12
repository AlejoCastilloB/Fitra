import { palette } from "@/lib/theme";

export default function Skeleton({
  width = "100%", height = 16, radius = 8, style = {},
}: { width?: string | number; height?: number; radius?: number; style?: React.CSSProperties }) {
  return (
    <div
      style={{
        width, height, borderRadius: radius,
        background: `linear-gradient(90deg, ${palette.inputBg} 25%, ${palette.panelHover} 50%, ${palette.inputBg} 75%)`,
        backgroundSize: "200% 100%",
        animation: "ftShimmer 1.4s ease-in-out infinite",
        ...style,
      }}
    />
  );
}
