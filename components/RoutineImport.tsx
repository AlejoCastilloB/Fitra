"use client";

import { useRef, useState } from "react";
import { usePalette, type Palette } from "@/lib/theme";
import Modal from "@/components/Modal";
import ExercisePicker, { type PickableExercise } from "@/components/ExercisePicker";
import { emptySet, type SetRow } from "@/lib/replaceExercise";
import ExerciseForm from "@/components/ExerciseForm";
import { ClipboardPaste, ImagePlus, Sparkles, Trash2, ArrowLeftRight, AlertTriangle, Loader2, Plus } from "lucide-react";

/** Lo que la ruta de IA devuelve por cada ejercicio leído. */
type FilaImportada = {
  importedName: string;
  sets: number;
  reps?: number;
  repsMax?: number;
  restSeconds?: number;
  notes?: string;
  exerciseId: string | null;
  matchedName: string | null;
  confidence: number;
  media_url?: string;
  measurement_type?: string;
};

/** Lo que se devuelve al creador de rutinas, ya con forma de ejercicio de la app. */
export type ImportedForBuilder = {
  id: string;
  name: string;
  media_url?: string;
  measurement_type: string;
  sets: SetRow[];
  notes?: string;
  restSeconds?: number;
};

const DESCANSO_POR_DEFECTO = 90;
/** Ancho máximo de la captura antes de mandarla. Con esto el texto se sigue leyendo. */
const ANCHO_MAX_IMAGEN = 1400;

/**
 * Importar una rutina desde un texto pegado o una captura de pantalla.
 *
 * Dos pasos, y el segundo no es opcional: lo que devuelve un modelo hay que revisarlo
 * antes de que se convierta en la rutina de alguien. En la revisión se puede cambiar
 * cualquier ejercicio, corregir series, reps y descanso, y borrar filas.
 *
 * Lo que no se pudo emparejar con la biblioteca se marca y NO se añade a ciegas: preferimos
 * pedir un toque más que colar un ejercicio equivocado que solo se descubre en el gimnasio.
 */
export default function RoutineImport({
  onImport, onClose,
}: { onImport: (ejercicios: ImportedForBuilder[], nombreRutina: string | null) => void; onClose: () => void }) {
  const palette = usePalette();
  const fileRef = useRef<HTMLInputElement>(null);

  const [texto, setTexto] = useState("");
  const [imagen, setImagen] = useState<{ base64: string; mime: string; nombre: string } | null>(null);
  const [analizando, setAnalizando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [filas, setFilas] = useState<FilaImportada[] | null>(null);
  const [nombreRutina, setNombreRutina] = useState<string | null>(null);
  const [eligiendoPara, setEligiendoPara] = useState<number | null>(null);
  const [creandoPara, setCreandoPara] = useState<number | null>(null);

  async function elegirImagen(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    try {
      setImagen({ ...(await reducirImagen(file)), nombre: file.name });
    } catch {
      setError("No pude leer esa imagen. Prueba con otra captura.");
    }
  }

  async function analizar() {
    setAnalizando(true);
    setError(null);
    try {
      const res = await fetch("/api/ai/import-routine", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: texto, imageBase64: imagen?.base64, mimeType: imagen?.mime }),
      });
      const cuerpo = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(cuerpo?.message || cuerpo?.error || "No se pudo leer la rutina.");
        return;
      }
      setFilas(cuerpo.exercises ?? []);
      setNombreRutina(cuerpo.routineName ?? null);
    } catch {
      setError("No se pudo conectar. Revisa tu conexión.");
    } finally {
      setAnalizando(false);
    }
  }

  function cambiar(indice: number, cambios: Partial<FilaImportada>) {
    setFilas((prev) => prev && prev.map((f, i) => i === indice ? { ...f, ...cambios } : f));
  }

  function borrar(indice: number) {
    setFilas((prev) => prev && prev.filter((_, i) => i !== indice));
  }

  function sustituir(indice: number, ex: PickableExercise) {
    cambiar(indice, {
      exerciseId: ex.id,
      matchedName: ex.name,
      media_url: ex.media_url,
      measurement_type: ex.measurement_type,
      confidence: 100,
    });
    setEligiendoPara(null);
  }

  /** El ejercicio recién creado queda puesto en su fila, sin tener que buscarlo otra vez. */
  function usarRecienCreado(indice: number, creado: any) {
    if (creado?.id) {
      cambiar(indice, {
        exerciseId: creado.id,
        matchedName: creado.name,
        media_url: creado.media_url ?? undefined,
        measurement_type: creado.measurement_type,
        confidence: 100,
      });
    }
    setCreandoPara(null);
  }

  const identificadas = (filas ?? []).filter((f) => f.exerciseId);
  const sinIdentificar = (filas ?? []).length - identificadas.length;

  function confirmar() {
    onImport(identificadas.map((f) => {
      const medida = f.measurement_type || "reps_weight";
      const base = emptySet(medida);
      // En un ejercicio de tiempo, el número que se leyó como repeticiones son en realidad
      // los segundos: "Plancha 3 x 30" son treinta segundos, no treinta repeticiones.
      const serie: SetRow = medida === "time" || medida === "time_distance"
        ? { ...base, ...(f.reps != null ? { time_sec: f.reps } : {}) }
        : { ...base, ...(f.reps != null ? { reps: f.reps } : {}) };

      return {
        id: f.exerciseId!,
        name: f.matchedName || f.importedName,
        media_url: f.media_url,
        measurement_type: medida,
        sets: Array.from({ length: f.sets }, () => ({ ...serie })),
        notes: f.notes,
        restSeconds: f.restSeconds ?? DESCANSO_POR_DEFECTO,
      };
    }), nombreRutina);
  }

  return (
    <>
      <Modal title={filas ? "Revisa lo que encontré" : "Importar rutina"} onClose={onClose} maxWidth={460}>
        {!filas ? (
          <>
            <p style={{ fontSize: 12.5, color: palette.inkDim, lineHeight: 1.55, marginBottom: 14 }}>
              Pega la rutina como texto o sube una captura de pantalla. Saco los ejercicios con sus
              series, repeticiones y descanso, y los emparejo con la biblioteca.
            </p>

            <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11.5, fontWeight: 700, color: palette.accent, textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 7 }}>
              <ClipboardPaste size={13} /> Texto
            </label>
            <textarea
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              placeholder={"Día 1 — Empuje\nPress de banca  4x8-12  90 seg\nPress militar  3x10  2 min\nFondos  3 x al fallo"}
              style={{
                width: "100%", minHeight: 130, padding: "11px 12px", borderRadius: 12, resize: "vertical",
                border: `1px solid ${palette.panelBorder}`, background: palette.inputBg, color: palette.ink,
                fontSize: 13.5, fontFamily: "inherit", lineHeight: 1.5, marginBottom: 14,
              }}
            />

            <input ref={fileRef} type="file" accept="image/*" onChange={elegirImagen} style={{ display: "none" }} />
            <button
              onClick={() => fileRef.current?.click()}
              className="ft-touch-y"
              style={{
                display: "flex", alignItems: "center", justifyContent: "center", gap: 7, width: "100%", padding: 12,
                borderRadius: 12, cursor: "pointer", fontFamily: "inherit", marginBottom: 14,
                border: `1px dashed ${imagen ? palette.accent : palette.panelBorder}`,
                background: imagen ? `${palette.accent}12` : "none",
                color: imagen ? palette.accent : palette.inkDim, fontSize: 12.5, fontWeight: 700,
              }}
            >
              <ImagePlus size={15} /> {imagen ? `Captura lista · ${imagen.nombre}` : "Subir una captura"}
            </button>

            {error && <p style={{ fontSize: 12, color: palette.danger, marginBottom: 12, lineHeight: 1.5 }}>{error}</p>}

            <button
              onClick={analizar}
              disabled={analizando || (!texto.trim() && !imagen)}
              className="ft-touch-y"
              style={{
                display: "flex", alignItems: "center", justifyContent: "center", gap: 7, width: "100%", padding: 13,
                borderRadius: 13, border: "none", cursor: "pointer", fontFamily: "inherit",
                background: `linear-gradient(135deg, ${palette.accent}, ${palette.accentDeep})`, color: palette.bg,
                fontWeight: 700, fontSize: 14, opacity: analizando || (!texto.trim() && !imagen) ? 0.5 : 1,
              }}
            >
              {analizando ? <><Loader2 size={15} className="ft-spin" /> Leyendo la rutina...</> : <><Sparkles size={15} /> Analizar</>}
            </button>
          </>
        ) : (
          <>
            {sinIdentificar > 0 && (
              <div style={{
                display: "flex", gap: 9, padding: 11, borderRadius: 12, marginBottom: 14,
                background: `${palette.danger}12`, border: `1px solid ${palette.danger}33`,
              }}>
                <AlertTriangle size={15} color={palette.danger} style={{ flexShrink: 0, marginTop: 1 }} />
                <p style={{ fontSize: 12, lineHeight: 1.5, color: palette.ink }}>
                  {sinIdentificar === 1
                    ? "Un ejercicio no está en la biblioteca. Elígelo a mano o bórralo: no se añade solo."
                    : `${sinIdentificar} ejercicios no están en la biblioteca. Elígelos a mano o bórralos: no se añaden solos.`}
                </p>
              </div>
            )}

            <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 16 }}>
              {filas.map((f, i) => (
                <FilaRevision
                  key={i}
                  fila={f}
                  palette={palette}
                  onCambiar={(c) => cambiar(i, c)}
                  onElegir={() => setEligiendoPara(i)}
                  onCrear={() => setCreandoPara(i)}
                  onBorrar={() => borrar(i)}
                />
              ))}
            </div>

            {filas.length === 0 && (
              <p style={{ fontSize: 13, color: palette.inkDim, textAlign: "center", padding: 20 }}>
                No queda ningún ejercicio.
              </p>
            )}

            <div style={{ display: "flex", gap: 10 }}>
              <button
                onClick={() => { setFilas(null); setError(null); }}
                className="ft-touch-y"
                style={{
                  flex: 1, padding: 12, borderRadius: 12, cursor: "pointer", fontFamily: "inherit",
                  border: `1px solid ${palette.panelBorder}`, background: palette.inputBg, color: palette.ink,
                  fontSize: 13, fontWeight: 700,
                }}
              >
                Volver
              </button>
              <button
                onClick={confirmar}
                disabled={identificadas.length === 0}
                className="ft-touch-y"
                style={{
                  flex: 1.6, padding: 12, borderRadius: 12, border: "none", cursor: "pointer", fontFamily: "inherit",
                  background: `linear-gradient(135deg, ${palette.accent}, ${palette.accentDeep})`, color: palette.bg,
                  fontSize: 13, fontWeight: 700, opacity: identificadas.length === 0 ? 0.5 : 1,
                }}
              >
                {identificadas.length === 1 ? "Añadir 1 ejercicio" : `Añadir ${identificadas.length} ejercicios`}
              </button>
            </div>
          </>
        )}
      </Modal>

      {creandoPara !== null && filas && (
        <ExerciseForm
          existingExercises={[]}
          initialName={filas[creandoPara].importedName}
          onSaved={(creado) => usarRecienCreado(creandoPara, creado)}
          onClose={() => setCreandoPara(null)}
        />
      )}

      {eligiendoPara !== null && filas && (
        <ExercisePicker
          mode="replace"
          subtitle={`Para "${filas[eligiendoPara].importedName}"`}
          onPick={(ex) => sustituir(eligiendoPara, ex)}
          onClose={() => setEligiendoPara(null)}
        />
      )}
    </>
  );
}

function FilaRevision({
  fila, palette, onCambiar, onElegir, onCrear, onBorrar,
}: {
  fila: FilaImportada;
  palette: Palette;
  onCambiar: (c: Partial<FilaImportada>) => void;
  onElegir: () => void;
  onCrear: () => void;
  onBorrar: () => void;
}) {
  const identificado = !!fila.exerciseId;
  const esTiempo = fila.measurement_type === "time" || fila.measurement_type === "time_distance";

  return (
    <div style={{
      padding: 12, borderRadius: 13,
      border: `1px solid ${identificado ? palette.panelBorder : `${palette.danger}55`}`,
      background: identificado ? palette.inputBg : `${palette.danger}0c`,
    }}>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 8, marginBottom: 10 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13.5, fontWeight: 700, lineHeight: 1.3 }}>
            {identificado ? fila.matchedName : fila.importedName}
          </div>
          <div style={{ fontSize: 11, color: identificado ? palette.inkDim : palette.danger, marginTop: 3, lineHeight: 1.4 }}>
            {identificado
              ? (fila.matchedName !== fila.importedName ? `Leí "${fila.importedName}"` : "En la biblioteca")
              : "Sin identificar"}
            {fila.repsMax != null && <> · rango {fila.reps}-{fila.repsMax}</>}
          </div>
        </div>
        <button onClick={onElegir} aria-label="Cambiar ejercicio" title="Elegir otro de la biblioteca" className="ft-touch" style={iconoBtn(palette)}>
          <ArrowLeftRight size={14} />
        </button>
        {/* Solo donde hace falta: si no está en la biblioteca, el camino es crearlo, no
            seguir buscándolo. */}
        {!identificado && (
          <button onClick={onCrear} aria-label="Crear este ejercicio" title="Crear este ejercicio en la biblioteca" className="ft-touch" style={{ ...iconoBtn(palette), color: palette.accent, borderColor: `${palette.accent}66` }}>
            <Plus size={15} />
          </button>
        )}
        <button onClick={onBorrar} aria-label="Quitar esta fila" className="ft-touch" style={{ ...iconoBtn(palette), color: palette.danger }}>
          <Trash2 size={14} />
        </button>
      </div>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <CampoNumero label="Series" value={fila.sets} min={1} max={20} palette={palette} onChange={(v) => onCambiar({ sets: v })} />
        <CampoNumero
          label={esTiempo ? "Segundos" : "Reps"}
          value={fila.reps}
          min={1} max={500} palette={palette}
          onChange={(v) => onCambiar({ reps: v, repsMax: undefined })}
        />
        <CampoNumero label="Descanso (s)" value={fila.restSeconds} min={0} max={3600} palette={palette} onChange={(v) => onCambiar({ restSeconds: v })} />
      </div>

      {fila.notes && (
        <p style={{ fontSize: 11.5, color: palette.inkDim, lineHeight: 1.5, marginTop: 9 }}>{fila.notes}</p>
      )}
    </div>
  );
}

function CampoNumero({
  label, value, min, max, palette, onChange,
}: { label: string; value?: number; min: number; max: number; palette: Palette; onChange: (v: number | undefined) => void }) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 9.5, fontWeight: 700, color: palette.inkDim, textTransform: "uppercase", letterSpacing: "0.05em" }}>
      {label}
      <input
        type="number" inputMode="numeric" min={min} max={max}
        // Sin cero anclado: se puede dejar vacío y escribir directo, como el resto de la app.
        value={value == null ? "" : String(value)}
        placeholder="—"
        onKeyDown={(e) => { if (e.key === "-" || e.key === "+" || e.key === "e") e.preventDefault(); }}
        onChange={(e) => {
          const bruto = e.target.value;
          if (bruto === "") return onChange(undefined);
          const n = parseInt(bruto, 10);
          if (!Number.isNaN(n)) onChange(Math.max(min, Math.min(max, n)));
        }}
        style={{
          width: 74, padding: "7px 9px", borderRadius: 9, textAlign: "center",
          border: `1px solid ${palette.panelBorder}`, background: palette.bg, color: palette.ink,
          fontSize: 13, fontWeight: 700, fontFamily: "inherit",
        }}
      />
    </label>
  );
}

function iconoBtn(palette: Palette): React.CSSProperties {
  return {
    display: "flex", alignItems: "center", justifyContent: "center", width: 30, height: 30, flexShrink: 0,
    borderRadius: 9, border: `1px solid ${palette.panelBorder}`, background: palette.bg,
    color: palette.inkDim, cursor: "pointer",
  };
}

/**
 * Reduce la captura antes de mandarla.
 *
 * Una captura de móvil son tres o cuatro megas, y en base64 crece un tercio más. A 1400 px
 * de ancho el texto de una rutina se sigue leyendo perfectamente y el envío baja a unos
 * pocos cientos de kilobytes.
 */
async function reducirImagen(file: File): Promise<{ base64: string; mime: string }> {
  const dataUrl = await new Promise<string>((res, rej) => {
    const lector = new FileReader();
    lector.onload = () => res(String(lector.result));
    lector.onerror = rej;
    lector.readAsDataURL(file);
  });

  const img = await new Promise<HTMLImageElement>((res, rej) => {
    const i = new Image();
    i.onload = () => res(i);
    i.onerror = rej;
    i.src = dataUrl;
  });

  if (img.width <= ANCHO_MAX_IMAGEN) {
    return { base64: dataUrl.split(",")[1] ?? "", mime: file.type || "image/jpeg" };
  }

  const escala = ANCHO_MAX_IMAGEN / img.width;
  const lienzo = document.createElement("canvas");
  lienzo.width = ANCHO_MAX_IMAGEN;
  lienzo.height = Math.round(img.height * escala);
  lienzo.getContext("2d")!.drawImage(img, 0, 0, lienzo.width, lienzo.height);

  return { base64: lienzo.toDataURL("image/jpeg", 0.85).split(",")[1] ?? "", mime: "image/jpeg" };
}
