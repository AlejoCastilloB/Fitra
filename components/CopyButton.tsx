"use client";

import { useState } from "react";
import { usePalette } from "@/lib/theme";
import { Copy, Check } from "lucide-react";

export default function CopyButton({ text, label }: { text: string; label: string }) {
  const palette = usePalette();
  const [copied, setCopied] = useState(false);

  async function copy() {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  }

  return (
    <button onClick={copy} style={{
      ...palette.glassPanel, padding: "9px 16px", borderRadius: 11, cursor: "pointer", border: "none",
      display: "flex", alignItems: "center", gap: 7, fontSize: 13, fontWeight: 600, color: palette.ink,
    }}>
      {copied ? <Check size={14} /> : <Copy size={14} />} {copied ? "Copiado" : label}
    </button>
  );
}
