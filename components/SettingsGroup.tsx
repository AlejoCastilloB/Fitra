"use client";

import { palette, cleanGroup, groupTitle } from "@/lib/theme";
import { Children } from "react";

export default function SettingsGroup({
  title, children,
}: { title?: string; children: React.ReactNode }) {
  const items = Children.toArray(children);

  return (
    <div style={{ marginBottom: 22 }}>
      {title && <div style={groupTitle}>{title}</div>}
      <div style={cleanGroup}>
        {items.map((child, i) => (
          <div key={i} style={{ borderBottom: i < items.length - 1 ? `1px solid ${palette.divider}` : "none" }}>
            {child}
          </div>
        ))}
      </div>
    </div>
  );
}
