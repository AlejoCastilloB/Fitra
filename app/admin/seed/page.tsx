"use client";

import { useState } from "react";
import { palette, glassPanel } from "@/lib/theme";

export default function SeedAdminPage() {
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

    // debug: mostramos la forma real del primer elemento
    setLog((l) => [...l, `🔍 Ejemplo crudo: ${JSON.stringify(muscles[0])}`, `🔍 Tipo: ${typeof muscles[0]}`, `🔍 Total recibidos: ${muscles.length}`]);

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
    const r = await fetch(`${BASE}/api/es/muscles/${muscle}.json`);
    if (!r.ok) {
      return NextResponse.json({ error: `jsDelivr respondió ${r.status} para ${muscle}` }, { status: 502 });
    }
    const raw = await r.json();
    const exercises: any[] = Array.isArray(raw) ? raw : (raw.exercises ?? []);

    const rows = exercises.map((ex) => ({
      slug: ex.slug,
      name: ex.name,
      muscle_group: ex.muscle,
      body_part: ex.bodyPart,
      equipment: ex.equipment,
      category: ex.category,
      secondary_muscles: ex.secondaryMuscles ?? [],
      instructions: ex.instructions ?? [],
      measurement_type: "reps_weight",
      media_url: ex.gifUrl,
      trainer_id: null,
    }));

    if (rows.length === 0) {
      return NextResponse.json({ ok: true, muscle, inserted: 0, note: "sin ejercicios o formato inesperado" });
    }

    const { error } = await supabase.from("exercises").upsert(rows, { onConflict: "slug" });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ ok: true, muscle, inserted: rows.length });
  } catch (e: any) {
    return NextResponse.json({ error: `excepción: ${e.message}` }, { status: 500 });
  }


  return (
    <div style={{ minHeight: "100vh", background: palette.bg, color: palette.ink, display: "flex", alignItems: "center", justifyContent: "center", padding: 20, fontFamily: "system-ui, sans-serif" }}>
      <div style={{ ...glassPanel, padding: 28, width: "100%", maxWidth: 460 }}>
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
