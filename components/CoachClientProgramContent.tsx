"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { usePalette, type Palette } from "@/lib/theme";
import { muscleLabel } from "@/lib/muscleLabels";
import type { Program } from "@/lib/coachClientProgram";
import { ChevronLeft, ChevronRight, Dumbbell, FolderOpen, Layers, Pencil, Info } from "lucide-react";

const DAY_LABELS = ["D", "L", "M", "X", "J", "V", "S"];

/**
 * El plan de un cliente, agrupado por programa.
 *
 * La idea es poder mirar el conjunto y entenderlo de una: qué programa tiene, para qué es,
 * y qué hace cada día dentro de él. La descripción del programa se edita aquí mismo,
 * porque es leyendo el desglose cuando uno se da cuenta de lo que hay que explicar.
 */
export default function CoachClientProgramContent({
  clientId, clientName, programs,
}: { clientId: string; clientName: string; programs: Program[] }) {
  const palette = usePalette();
  const totalDays = programs.reduce((n, p) => n + p.days.length, 0);

  return (
    <div style={{ maxWidth: 720 }}>
      <Link href={`/coach/clients/${clientId}`} style={{ display: "inline-flex", alignItems: "center", gap: 6, color: palette.inkDim, textDecoration: "none", fontSize: 13.5, marginBottom: 18 }}>
        <ChevronLeft size={16} /> {clientName}
      </Link>

      <h1 style={{ fontSize: 20, fontWeight: 700, marginBottom: 4 }}>Su plan de entrenamiento</h1>
      <p style={{ fontSize: 13, color: palette.inkDim, marginBottom: 22 }}>
        {totalDays === 0
          ? "Todavía no tiene ninguna rutina asignada."
          : `${totalDays} ${totalDays === 1 ? "día" : "días"} en ${programs.length} ${programs.length === 1 ? "programa" : "programas"}. Todo lo que escribas aquí lo lee ${clientName} en su app.`}
      </p>

      {totalDays === 0 ? (
        <div style={{ ...palette.glassPanel, padding: 30, textAlign: "center" }}>
          <Dumbbell size={22} color={palette.inkDim} style={{ marginBottom: 10 }} />
          <p style={{ fontSize: 13, color: palette.inkDim, lineHeight: 1.5, marginBottom: 16 }}>
            Cuando le asignes rutinas van a aparecer aquí agrupadas por programa, con su descripción.
          </p>
          <Link href={`/coach/routines/new?client=${clientId}`} style={{
            display: "inline-block", padding: "10px 18px", borderRadius: 11, textDecoration: "none",
            background: `${palette.accent}18`, border: `1px solid ${palette.accent}55`, color: palette.accent,
            fontSize: 13, fontWeight: 700,
          }}>Crear su primera rutina</Link>
        </div>
      ) : (
        programs.map((p) => <ProgramBlock key={p.folder ?? "__sueltas"} program={p} palette={palette} clientName={clientName} />)
      )}
    </div>
  );
}

function ProgramBlock({ program, palette, clientName }: { program: Program; palette: Palette; clientName: string }) {
  const router = useRouter();
  const supabase = createClient();
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(program.description ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    if (!program.folder || saving) return;
    setSaving(true);
    setError(null);

    const { data: auth } = await supabase.auth.getUser();
    const uid = auth.user?.id;
    if (!uid) { setError("Se cerró tu sesión, vuelve a entrar."); setSaving(false); return; }

    const { error: saveError } = await supabase.from("routine_folders").upsert(
      { trainer_id: uid, name: program.folder, description: text.trim() || null, updated_at: new Date().toISOString() },
      { onConflict: "trainer_id,name" },
    );

    if (saveError) { setError(`No pudimos guardarla: ${saveError.message}`); setSaving(false); return; }

    setSaving(false);
    setEditing(false);
    router.refresh();
  }

  return (
    <div style={{ marginBottom: 26 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
        <FolderOpen size={15} color={palette.accent} />
        <h2 style={{ fontSize: 15, fontWeight: 700, flex: 1, minWidth: 0 }}>
          {program.folder ?? "Rutinas sueltas"}
        </h2>
        <span style={{ fontSize: 11.5, color: palette.inkDim }}>
          {program.days.length} {program.days.length === 1 ? "día" : "días"}
        </span>
      </div>

      {/* La descripción del programa entero: el "por qué son seis días y no cuatro". */}
      {program.folder ? (
        <div style={{ ...palette.glassPanel, padding: 14, marginBottom: 12 }}>
          {editing ? (
            <>
              <textarea
                value={text} onChange={(e) => setText(e.target.value)} rows={5} autoFocus
                placeholder={`Ej: son seis días porque dividimos el volumen para que cada grupo se entrene dos veces por semana sin sesiones eternas. Este mes buscamos estrés metabólico: más repeticiones, menos descanso. En un mes cambiamos a tensión mecánica.`}
                style={{
                  width: "100%", padding: "10px 12px", borderRadius: 11, resize: "vertical",
                  border: `1px solid ${palette.panelBorder}`, background: palette.inputBg, color: palette.ink,
                  fontSize: 13.5, fontFamily: "inherit", lineHeight: 1.6, marginBottom: 10,
                }}
              />
              {error && <p style={{ fontSize: 11.5, color: "#f87171", marginBottom: 10 }}>{error}</p>}
              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={() => { setEditing(false); setText(program.description ?? ""); setError(null); }} style={{
                  flex: 1, padding: 10, borderRadius: 10, border: `1px solid ${palette.panelBorder}`,
                  background: "none", color: palette.inkDim, fontSize: 13, cursor: "pointer",
                }}>Cancelar</button>
                <button onClick={save} disabled={saving} style={{
                  flex: 1, padding: 10, borderRadius: 10, border: "none", background: palette.accent,
                  color: palette.bg, fontSize: 13, fontWeight: 700, cursor: "pointer", opacity: saving ? 0.6 : 1,
                }}>{saving ? "Guardando..." : "Guardar"}</button>
              </div>
            </>
          ) : (
            <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
              <Info size={14} color={palette.accent} style={{ flexShrink: 0, marginTop: 2 }} />
              <p style={{ flex: 1, minWidth: 0, fontSize: 13, lineHeight: 1.6, color: program.description ? palette.ink : palette.inkDim, margin: 0, whiteSpace: "pre-wrap" }}>
                {program.description ?? `Sin descripción. Explícale a ${clientName} para qué es este programa y por qué tiene estos días — lo verá al abrir sus rutinas.`}
              </p>
              <button onClick={() => setEditing(true)} title="Editar la descripción" style={{
                flexShrink: 0, width: 30, height: 30, borderRadius: 9, cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "center",
                border: `1px solid ${palette.panelBorder}`, background: "none", color: palette.inkDim,
              }}><Pencil size={13} /></button>
            </div>
          )}
        </div>
      ) : (
        <p style={{ fontSize: 11.5, color: palette.inkDim, marginBottom: 12, lineHeight: 1.5 }}>
          Estas rutinas no están en ninguna carpeta. Ponles una desde la lista de rutinas y podrás
          escribirles una descripción de programa.
        </p>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {program.days.map((d) => (
          <Link
            key={d.id}
            href={`/coach/routines/${d.id}/edit`}
            style={{
              display: "flex", alignItems: "flex-start", gap: 12, textDecoration: "none", color: palette.ink,
              padding: 14, borderRadius: 12, border: `1px solid ${palette.panelBorder}`, background: palette.panel,
            }}
          >
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4, flexWrap: "wrap" }}>
                <span style={{ fontSize: 14, fontWeight: 700 }}>{d.name}</span>
                {d.daysOfWeek.length > 0 && (
                  <span style={{ display: "flex", gap: 3 }}>
                    {d.daysOfWeek.map((n) => (
                      <span key={n} style={{
                        width: 17, height: 17, borderRadius: 5, fontSize: 9, fontWeight: 700,
                        display: "flex", alignItems: "center", justifyContent: "center",
                        background: `${palette.accent}22`, color: palette.accent,
                      }}>{DAY_LABELS[n] ?? "?"}</span>
                    ))}
                  </span>
                )}
              </div>

              <div style={{ display: "flex", gap: 12, flexWrap: "wrap", fontSize: 11.5, color: palette.inkDim, marginBottom: d.description ? 7 : 0 }}>
                <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                  <Dumbbell size={11} /> {d.exerciseCount} {d.exerciseCount === 1 ? "ejercicio" : "ejercicios"}
                </span>
                <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                  <Layers size={11} /> {d.setCount} series
                </span>
                {d.muscles.length > 0 && <span>{d.muscles.map(muscleLabel).join(" · ")}</span>}
              </div>

              <p style={{ fontSize: 12.5, lineHeight: 1.55, margin: 0, color: d.description ? palette.ink : palette.inkDim, whiteSpace: "pre-wrap" }}>
                {d.description ?? "Sin descripción — tócala para explicarle el propósito de este día."}
              </p>
            </div>
            <ChevronRight size={17} color={palette.inkDim} style={{ flexShrink: 0, marginTop: 2 }} />
          </Link>
        ))}
      </div>
    </div>
  );
}
