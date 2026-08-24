"use client";

import { usePalette } from "@/lib/theme";
import LoadingMark from "@/components/LoadingMark";

export default function RootLoading() {
  const palette = usePalette();
  return (
    <div style={{
      minHeight: "100vh", background: palette.bg, color: palette.ink,
      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 14,
      fontFamily: "system-ui, sans-serif",
    }}>
      <LoadingMark size={52} />
      <span style={{ fontSize: 14, fontWeight: 700, letterSpacing: "-0.01em", color: palette.inkDim }}>FitTrack</span>
    </div>
  );
}
