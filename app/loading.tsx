"use client";

import { usePalette } from "@/lib/theme";

export default function RootLoading() {
  const palette = usePalette();
  return (
    <div style={{
      minHeight: "100vh", background: palette.bg, color: palette.inkDim,
      display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "system-ui, sans-serif",
    }}>
      <style>{`
        @keyframes ftRootLoadingPulse { 0%, 100% { opacity: 0.35; } 50% { opacity: 0.9; } }
        .ft-root-loading { animation: ftRootLoadingPulse 1.3s ease-in-out infinite; }
      `}</style>
      <span className="ft-root-loading" style={{ fontSize: 14, fontWeight: 700, letterSpacing: "-0.01em" }}>FitTrack</span>
    </div>
  );
}
