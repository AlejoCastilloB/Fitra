"use client";

import { useState } from "react";
import { usePalette } from "@/lib/theme";

export default function SeedAdminPage() {
  const palette = usePalette();
  const [secret, setSecret] = useState("");
  const [log, setLog] = useState<string[]>([]);
  const [running, setRunning] = useState(false);
  const [total, setTotal] = useState(0);

  async function runSeed() {
    setRunning(true);
    setLog([]);
    setTotal(0);

    const musclesRes = await fetch(`/api/admin/seed-exercises?secret=${encodeURIComponent(secret)}`);
    const musclesData = await musclesRes.json();

    if (!musclesRes.ok) {
      setLog([`❌ Error (${musclesRes.status}): ${musclesData.error ?? "desconocido"}`]);
      setRunning(false);
      return;
    }

    const { muscles } = musclesData;
    let sum = 0;

    for (const m of muscles) {
      const muscleId =
        typeof m === "string"
          ? m
          : (m.id ?? m.slug ?? m.name ?? m.muscle ?? m.value ?? m.key ?? null);

      if (!muscleId) {
        setLog((l) => [...l, `⚠️ No pude extraer el id de: ${JSON.stringify(m)}`]);
        continue;
      }

      try {
        const res = await fetch(`/api/admin/seed-exercises?secret=${encodeURIComponent(secret)}&muscle=${muscleId}`);
        const data = await res.json();
        if (data.ok) {
          sum += data.inserted;
          setTotal(sum);
          setLog((l) => [...l, `✅ ${muscleId}: ${data.inserted} ejercicios`]);
        } else {
          setLog((l) => [...l, `⚠️ ${muscleId}: ${data.error ?? "error desconocido"}`]);
        }
      } catch {
        setLog((l) => [...l, `⚠️ ${muscleId}: fallo de red`]);
      }
    }

    setLog((l) => [...l, `🎉 Listo — ${sum} ejercicios cargados en total`]);
    setRunning(false);
  }

  return (
    <div style={{ minHeight: "100vh", background: palette.bg, color: palette.ink, display: "flex", alignItems: "center", justifyContent: "center", padding: 20, fontFamily: "system-ui, sans-serif" }}>
      <div style={{ ...palette.glassPanel, padding: 28, width: "100%", maxWidth: 460 }}>
        <h1 style={{ fontSize: 19, fontWeight: 700, marginBottom: 16 }}>Seed de biblioteca de ejercicios</h1>

        <input
          type="password"
          value={secret}
          onChange={(e) => setSecret(e.target.value)}
          placeholder="SEED_SECRET"
          style={{
            width: "100%", padding: "11px 14px", borderRadius: 11, border: `1px solid ${palette.panelBorder}`,
            background: palette.inputBg, color: palette.ink, fontSize: 14, marginBottom: 12,
          }}
        />

        <button onClick={runSeed} disabled={running || !secret} style={{
          width: "100%", padding: 12, borderRadius: 11, border: "none", cursor: "pointer",
          background: `linear-gradient(135deg, ${palette.accent}, ${palette.accentDeep})`, color: "#0A0C10",
          fontWeight: 700, fontSize: 14, opacity: (running || !secret) ? 0.6 : 1, marginBottom: 18,
        }}>
          {running ? `Cargando... (${total} hasta ahora)` : "Iniciar seed"}
        </button>

        <div style={{ maxHeight: 320, overflowY: "auto", display: "flex", flexDirection: "column", gap: 4 }}>
          {log.map((l, i) => (
            <div key={i} style={{ fontSize: 11.5, color: palette.inkDim, fontFamily: "monospace", wordBreak: "break-all" }}>{l}</div>
          ))}
        </div>
      </div>
    </div>
  );
}
