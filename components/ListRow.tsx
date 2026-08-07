"use client";

import { palette } from "@/lib/theme";
import { ChevronRight } from "lucide-react";

export default function ListRow({
  label, sublabel, right, onClick, showChevron = false, danger = false,
}: {
  label: string;
  sublabel?: string;
  right?: React.ReactNode;
  onClick?: () => void;
  showChevron?: boolean;
  danger?: boolean;
}) {
  const Wrapper = onClick ? "button" : "div";
  return (
    <Wrapper
      onClick={onClick}
      style={{
        width: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 12,
        padding: "13px 16px",
        background: "none",
        border: "none",
        textAlign: "left",
        cursor: onClick ? "pointer" : "default",
        color: danger ? palette.danger : palette.ink,
        fontFamily: "inherit",
      }}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 500 }}>{label}</div>
        {sublabel && (
          <div style={{ fontSize: 11.5, color: palette.inkDim, marginTop: 2, lineHeight: 1.4 }}>{sublabel}</div>
        )}
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
        {right}
        {showChevron && <ChevronRight size={16} color={palette.inkDim} />}
      </div>
    </Wrapper>
  );
}
