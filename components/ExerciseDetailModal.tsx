"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { usePalette, type Palette } from "@/lib/theme";
import { muscleLabel } from "@/lib/muscleLabels";
import { equipmentLabel } from "@/lib/equipmentLabels";
import Modal from "@/components/Modal";

type ExerciseDetail = {
  id: string;
  name: string;
  media_url: string | null;
  muscle_group: string | null;
  secondary_muscles: string[] | null;
  equipment: string | null;
  description: string | null;
  annotations: string | null;
  instructions: string[] | null;
  video_url: string | null;
};

/** Ficha del ejercicio: el GIF en grande y todo lo que se sabe de él. */
export default function ExerciseDetailModal({
  exerciseId, fallbackName, onClose,
}: {
  exerciseId: string;
  fallbackName: string;
  onClose: () => void;
}) {
  const palette = usePalette();
  const [detail, setDetail] = useState<ExerciseDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const supabase = createClient();
      const { data } = await supabase
        .from("exercises")
        .select("id, name, media_url, muscle_group, secondary_muscles, equipment, description, annotations, instructions, video_url")
        .eq("id", exerciseId)
        .maybeSingle();
      if (cancelled) return;
      setDetail((data as ExerciseDetail) ?? null);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [exerciseId]);

  const secondary = (detail?.secondary_muscles ?? []).filter(Boolean);

  return (
    <Modal title={detail?.name || fallbackName} onClose={onClose} maxWidth={460}>
      {detail?.media_url ? (
        <img
          src={detail.media_url} alt={detail.name}
          style={{
            width: "100%", maxHeight: 300, objectFit: "contain", borderRadius: 14,
            background: palette.inputBg, marginBottom: 16, display: "block",
          }}
        />
      ) : (
        <div style={{
          width: "100%", height: 160, borderRadius: 14, background: palette.inputBg, marginBottom: 16,
          display: "flex", alignItems: "center", justifyContent: "center", color: palette.inkDim, fontSize: 12.5,
        }}>
          {loading ? "Cargando..." : "Este ejercicio no tiene imagen"}
        </div>
      )}

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
        {detail?.muscle_group && <Chip palette={palette} text={muscleLabel(detail.muscle_group)} primary />}
        {detail?.equipment && <Chip palette={palette} text={equipmentLabel(detail.equipment)} />}
        {secondary.map((m) => <Chip key={m} palette={palette} text={muscleLabel(m)} />)}
      </div>

      {detail?.description && <Block palette={palette} title="Descripción">{detail.description}</Block>}
      {detail?.annotations && <Block palette={palette} title="Notas">{detail.annotations}</Block>}

      {detail?.instructions && detail.instructions.length > 0 && (
        <div style={{ marginBottom: 14 }}>
          <SectionTitle palette={palette}>Técnica</SectionTitle>
          <ol style={{ paddingLeft: 18, fontSize: 13, color: palette.ink, lineHeight: 1.65 }}>
            {detail.instructions.map((step, i) => <li key={i} style={{ marginBottom: 4 }}>{step}</li>)}
          </ol>
        </div>
      )}

      {detail?.video_url && (
        <a
          href={detail.video_url} target="_blank" rel="noopener noreferrer"
          style={{
            display: "block", textAlign: "center", padding: 11, borderRadius: 11, textDecoration: "none",
            border: `1px solid ${palette.accent}55`, background: `${palette.accent}18`,
            color: palette.accent, fontSize: 13, fontWeight: 700,
          }}
        >
          Ver video del ejercicio
        </a>
      )}

      {!loading && !detail && (
        <p style={{ fontSize: 13, color: palette.inkDim, textAlign: "center" }}>
          No pudimos cargar la información de este ejercicio.
        </p>
      )}
    </Modal>
  );
}

function Chip({ palette, text, primary }: { palette: Palette; text: string; primary?: boolean }) {
  return (
    <span style={{
      padding: "5px 11px", borderRadius: 999, fontSize: 11.5, fontWeight: 600,
      background: primary ? `${palette.accent}20` : palette.inputBg,
      color: primary ? palette.accent : palette.inkDim,
      border: `1px solid ${primary ? `${palette.accent}44` : palette.panelBorder}`,
    }}>{text}</span>
  );
}

function SectionTitle({ palette, children }: { palette: Palette; children: React.ReactNode }) {
  return (
    <div style={{
      fontSize: 10.5, fontWeight: 700, color: palette.accent,
      textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 5,
    }}>{children}</div>
  );
}

function Block({ palette, title, children }: { palette: Palette; title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <SectionTitle palette={palette}>{title}</SectionTitle>
      <p style={{ fontSize: 13, color: palette.ink, lineHeight: 1.55 }}>{children}</p>
    </div>
  );
}
