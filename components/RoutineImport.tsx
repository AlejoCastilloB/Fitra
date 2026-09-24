"use client";

import { useRef, useState } from "react";
import { usePalette, type Palette } from "@/lib/theme";
import Modal from "@/components/Modal";
import ExercisePicker, { type PickableExercise } from "@/components/ExercisePicker";
import { emptySet, type SetRow } from "@/lib/replaceExercise";
import ExerciseForm from "@/components/ExerciseForm";
import SetTypePopover from "@/components/SetTypePopover";
import { setTypeBadge } from "@/lib/setBadges";
import { supersetColor } from "@/lib/supersetColors";
import {
  setTypesFor, supersetGroupsFromLinks, linksFromSupersetGroups, dayRoutineName, type SetType,
} from "@/lib/routineImport";
import {
  ClipboardPaste, ImagePlus, Sparkles, Trash2, ArrowLeftRight, AlertTriangle, Loader2, Plus, Link2, CalendarDays,
} from "lucide-react";

/** Lo que la ruta de IA devuelve por cada ejercicio leído. */
type FilaImportada = {
  importedName: string;
  sets: number;
  reps?: number;
  repsMax?: number;
  restSeconds?: number;
  notes?: string;
  setType: SetType;
  supersetGroup?: number;
  exerciseId: string | null;
  matchedName: string | null;
  confidence: number;
  media_url?: string;
  measurement_type?: string;
};

/** Un día de entrenamiento leído de la hoja. Cada uno acabará siendo una rutina. */
type DiaImportado = { name: string; exercises: FilaImportada[] };

/** Lo que se devuelve al creador de rutinas, ya con forma de ejercicio de la app. */
export type ImportedForBuilder = {
  id: string;
  name: string;
  media_url?: string;
  measurement_type: string;
  sets: SetRow[];
  notes?: string;
  restSeconds?: number;
  supersetGroup?: number;
};

export type ImportedDayForBuilder = { name: string; exercises: ImportedForBuilder[] };

const DESCANSO_POR_DEFECTO = 90;
/** Ancho máximo de la captura antes de mandarla. Con esto el texto se sigue leyendo. */
const ANCHO_MAX_IMAGEN = 1400;

/** La letra de una superserie: el grupo 1 es la A, como se escribe en cualquier rutina. */
function letraSuperserie(grupo: number): string {
  return String.fromCharCode(64 + ((grupo - 1) % 26) + 1);
}

/**
 * Importar una rutina desde un texto pegado o una captura de pantalla.
 *
 * Dos pasos, y el segundo no es opcional: lo que devuelve un modelo hay que revisarlo
 * antes de que se convierta en la rutina de alguien. En la revisión se puede cambiar
 * cualquier ejercicio, corregir series, reps y descanso, marcar dropsets y superseries,
 * y borrar filas o días enteros.
 *
 * Una hoja puede traer un día o la semana completa, y eso cambia lo que sale: cada día es
 * una rutina distinta. Por eso la revisión va por pestañas y no en una única lista — en
 * una lista seguida no se ve dónde acaba el lunes y empieza el miércoles.
 *
 * Lo que no se pudo emparejar con la biblioteca se marca y NO se añade a ciegas: preferimos
 * pedir un toque más que colar un ejercicio equivocado que solo se descubre en el gimnasio.
 */
export default function RoutineImport({
  onImport, onClose,
}: { onImport: (dias: ImportedDayForBuilder[], nombreRutina: string | null) => void; onClose: () => void }) {
  const palette = usePalette();
  const fileRef = useRef<HTMLInputElement>(null);

  const [texto, setTexto] = useState("");
  const [imagen, setImagen] = useState<{ base64: string; mime: string; nombre: string } | null>(null);
  const [analizando, setAnalizando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [dias, setDias] = useState<DiaImportado[] | null>(null);
  const [activo, setActivo] = useState(0);
  const [nombreRutina, setNombreRutina] = useState<string | null>(null);
  const [eligiendoPara, setEligiendoPara] = useState<number | null>(null);
  const [creandoPara, setCreandoPara] = useState<number | null>(null);
  const [tipoPara, setTipoPara] = useState<{ fila: number; x: number; y: number } | null>(null);

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
      setDias(cuerpo.days ?? []);
      setActivo(0);
      setNombreRutina(cuerpo.routineName ?? null);
    } catch {
      setError("No se pudo conectar. Revisa tu conexión.");
    } finally {
      setAnalizando(false);
    }
  }

  /** Cambia una fila del día que se está revisando. */
  function cambiar(fila: number, cambios: Partial<FilaImportada>) {
    setDias((prev) => prev && prev.map((d, di) => di !== activo ? d : {
      ...d, exercises: d.exercises.map((f, i) => i === fila ? { ...f, ...cambios } : f),
    }));
  }

  /** Quita una fila y recoloca las superseries: un grupo no puede quedarse con uno solo. */
  function borrar(fila: number) {
    setDias((prev) => prev && prev.map((d, di) => {
      if (di !== activo) return d;
      const enlaces = linksFromSupersetGroups(d.exercises.map((e) => e.supersetGroup));
      // Al caer la fila, la de debajo deja de estar unida a la de arriba: eran vecinas
      // solo porque la borrada estaba en medio.
      const quedan = enlaces.filter((_, i) => i !== fila);
      if (fila < quedan.length) quedan[fila] = false;
      return conEnlaces(d.exercises.filter((_, i) => i !== fila), quedan);
    }));
  }

  /** Une o separa una fila de la de arriba. Una superserie son ejercicios seguidos. */
  function alternarEnlace(fila: number) {
    setDias((prev) => prev && prev.map((d, di) => {
      if (di !== activo) return d;
      const enlaces = linksFromSupersetGroups(d.exercises.map((e) => e.supersetGroup));
      enlaces[fila] = !enlaces[fila];
      return conEnlaces(d.exercises, enlaces);
    }));
  }

  function conEnlaces(filas: FilaImportada[], enlaces: boolean[]): DiaImportado {
    const grupos = supersetGroupsFromLinks(enlaces);
    return {
      name: dias?.[activo]?.name ?? "",
      exercises: filas.map((f, i) => ({ ...f, supersetGroup: grupos[i] })),
    };
  }

  function renombrarDia(nombre: string) {
    setDias((prev) => prev && prev.map((d, di) => di === activo ? { ...d, name: nombre } : d));
  }

  function borrarDia() {
    setDias((prev) => {
      if (!prev) return prev;
      const quedan = prev.filter((_, i) => i !== activo);
      setActivo((a) => Math.max(0, Math.min(a, quedan.length - 1)));
      return quedan;
    });
  }

  function sustituir(fila: number, ex: PickableExercise) {
    cambiar(fila, {
      exerciseId: ex.id,
      matchedName: ex.name,
      media_url: ex.media_url,
      measurement_type: ex.measurement_type,
      confidence: 100,
    });
    setEligiendoPara(null);
  }

  /** El ejercicio recién creado queda puesto en su fila, sin tener que buscarlo otra vez. */
  function usarRecienCreado(fila: number, creado: any) {
    if (creado?.id) {
      cambiar(fila, {
        exerciseId: creado.id,
        matchedName: creado.name,
        media_url: creado.media_url ?? undefined,
        measurement_type: creado.measurement_type,
        confidence: 100,
      });
    }
    setCreandoPara(null);
  }

  const dia = dias?.[activo] ?? null;
  const filas = dia?.exercises ?? [];
  const enlaces = linksFromSupersetGroups(filas.map((f) => f.supersetGroup));
  const sinIdentificar = (dias ?? []).reduce((n, d) => n + d.exercises.filter((f) => !f.exerciseId).length, 0);
  const totalListos = (dias ?? []).reduce((n, d) => n + d.exercises.filter((f) => f.exerciseId).length, 0);

  /** Los días que de verdad se van a crear: los que conservan algún ejercicio identificado. */
  function diasParaGuardar(): ImportedDayForBuilder[] {
    return (dias ?? [])
      .map((d, i) => ({
        name: dayRoutineName(nombreRutina, d.name, i, (dias ?? []).length),
        exercises: d.exercises.filter((f) => f.exerciseId).map(aEjercicio),
      }))
      .filter((d) => d.exercises.length > 0);
  }

  function confirmar() {
    const listos = diasParaGuardar();
    if (listos.length > 0) onImport(listos, nombreRutina);
  }

  const paraGuardar = dias ? diasParaGuardar() : [];

  return (
    <>
      <Modal title={dias ? "Revisa lo que encontré" : "Importar rutina"} onClose={onClose} maxWidth={460}>
        {!dias ? (
          <>
            <p style={{ fontSize: 12.5, color: palette.inkDim, lineHeight: 1.55, marginBottom: 14 }}>
              Pega la rutina como texto o sube una captura de pantalla. Saco los ejercicios con sus
              series, repeticiones, descanso, dropsets y superseries, y los emparejo con la biblioteca.
              Si la hoja trae varios días, cada uno se convierte en una rutina.
            </p>

            <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11.5, fontWeight: 700, color: palette.accent, textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 7 }}>
              <ClipboardPaste size={13} /> Texto
            </label>
            <textarea
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              placeholder={"Día 1 — Empuje\nA1 Press de banca  4x8-12  90 seg\nA2 Aperturas  4x12\nPress militar  3x10  2 min\n\nDía 2 — Tirón\nDominadas  4 x al fallo\nRemo con barra  4x10 + dropset"}
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
            <div style={{
              display: "flex", alignItems: "center", gap: 7, marginBottom: 12,
              fontSize: 11.5, fontWeight: 700, color: palette.inkDim,
            }}>
              <CalendarDays size={14} color={palette.accent} style={{ flexShrink: 0 }} />
              {/* Todo en un solo nodo de texto: repartido en varios, el separador se
                  quedaba solo en una columna al no caber la línea. */}
              <span style={{ lineHeight: 1.4 }}>
                {dias.length === 1 ? "Un día de entrenamiento" : `${dias.length} días de entrenamiento`}
                {" · "}
                {totalListos} {totalListos === 1 ? "ejercicio listo" : "ejercicios listos"}
              </span>
            </div>

            {dias.length > 1 && (
              <div style={{ display: "flex", gap: 7, overflowX: "auto", paddingBottom: 4, marginBottom: 12, scrollbarWidth: "none" }}>
                {dias.map((d, i) => {
                  const pendientes = d.exercises.filter((f) => !f.exerciseId).length;
                  return (
                    <button
                      key={i}
                      onClick={() => setActivo(i)}
                      className="ft-touch-y"
                      style={{
                        display: "flex", alignItems: "center", gap: 6, flexShrink: 0, padding: "8px 12px",
                        borderRadius: 999, cursor: "pointer", fontFamily: "inherit", fontSize: 12, fontWeight: 700,
                        border: `1px solid ${i === activo ? palette.accent : palette.panelBorder}`,
                        background: i === activo ? `${palette.accent}1a` : palette.inputBg,
                        color: i === activo ? palette.accent : palette.inkDim, whiteSpace: "nowrap",
                      }}
                    >
                      {d.name || `Día ${i + 1}`}
                      <span style={{ opacity: 0.7, fontWeight: 600 }}>{d.exercises.length}</span>
                      {pendientes > 0 && (
                        <span style={{ width: 6, height: 6, borderRadius: 999, background: palette.danger, flexShrink: 0 }} />
                      )}
                    </button>
                  );
                })}
              </div>
            )}

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

            {dia && (
              <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 12 }}>
                <input
                  value={dia.name}
                  onChange={(e) => renombrarDia(e.target.value)}
                  // Con un solo día este campo ES el nombre de la rutina, así que el
                  // marcador enseña el que se va a usar si se deja en blanco.
                  placeholder={dias.length > 1 ? `Día ${activo + 1}` : (nombreRutina || "Nombre de la rutina")}
                  style={{
                    flex: 1, minWidth: 0, padding: "10px 12px", borderRadius: 11,
                    border: `1px solid ${palette.panelBorder}`, background: palette.inputBg, color: palette.ink,
                    fontSize: 13.5, fontWeight: 700, fontFamily: "inherit",
                  }}
                />
                {dias.length > 1 && (
                  <button onClick={borrarDia} aria-label="Quitar este día" title="Quitar este día" className="ft-touch" style={{ ...iconoBtn(palette), color: palette.danger }}>
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            )}

            <div style={{ marginBottom: 16 }}>
              {filas.map((f, i) => (
                <div key={i}>
                  {i > 0 && (
                    <EnlaceSuperserie
                      unido={enlaces[i]}
                      color={supersetColor(f.supersetGroup ?? filas[i - 1].supersetGroup ?? 1)}
                      palette={palette}
                      onToggle={() => alternarEnlace(i)}
                    />
                  )}
                  <FilaRevision
                    fila={f}
                    palette={palette}
                    onCambiar={(c) => cambiar(i, c)}
                    onElegir={() => setEligiendoPara(i)}
                    onCrear={() => setCreandoPara(i)}
                    onBorrar={() => borrar(i)}
                    onTipo={(x, y) => setTipoPara({ fila: i, x, y })}
                  />
                </div>
              ))}
            </div>

            {filas.length === 0 && (
              <p style={{ fontSize: 13, color: palette.inkDim, textAlign: "center", padding: 20 }}>
                No queda ningún ejercicio en este día.
              </p>
            )}

            <div style={{ display: "flex", gap: 10 }}>
              <button
                onClick={() => { setDias(null); setError(null); }}
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
                disabled={paraGuardar.length === 0}
                className="ft-touch-y"
                style={{
                  flex: 1.6, padding: 12, borderRadius: 12, border: "none", cursor: "pointer", fontFamily: "inherit",
                  background: `linear-gradient(135deg, ${palette.accent}, ${palette.accentDeep})`, color: palette.bg,
                  fontSize: 13, fontWeight: 700, opacity: paraGuardar.length === 0 ? 0.5 : 1,
                }}
              >
                {paraGuardar.length > 1
                  ? `Crear ${paraGuardar.length} rutinas`
                  : totalListos === 1 ? "Añadir 1 ejercicio" : `Añadir ${totalListos} ejercicios`}
              </button>
            </div>
          </>
        )}
      </Modal>

      {creandoPara !== null && dia && (
        <ExerciseForm
          existingExercises={[]}
          initialName={dia.exercises[creandoPara]?.importedName}
          onSaved={(creado) => usarRecienCreado(creandoPara, creado)}
          onClose={() => setCreandoPara(null)}
        />
      )}

      {eligiendoPara !== null && dia && (
        <ExercisePicker
          mode="replace"
          subtitle={`Para "${dia.exercises[eligiendoPara]?.importedName ?? ""}"`}
          onPick={(ex) => sustituir(eligiendoPara, ex)}
          onClose={() => setEligiendoPara(null)}
        />
      )}

      {tipoPara && dia && (
        <SetTypePopover
          current={dia.exercises[tipoPara.fila]?.setType ?? "normal"}
          x={tipoPara.x}
          y={tipoPara.y}
          onSelect={(t) => cambiar(tipoPara.fila, { setType: t as SetType })}
          onClose={() => setTipoPara(null)}
          // El modal de importar va a 200; sin esto el popover sale por detrás.
          zIndex={320}
        />
      )}
    </>
  );
}

/** Una fila importada convertida en lo que entiende el creador de rutinas. */
function aEjercicio(f: FilaImportada): ImportedForBuilder {
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
    sets: setTypesFor(f.sets, f.setType).map((tipo) => ({ ...serie, set_type: tipo })),
    notes: f.notes,
    restSeconds: f.restSeconds ?? DESCANSO_POR_DEFECTO,
    supersetGroup: f.supersetGroup,
  };
}

/**
 * El eslabón entre dos filas seguidas.
 *
 * Se dibuja EN el hueco entre las dos tarjetas, no dentro de una de ellas, porque lo que
 * une son las dos: así se ve de un vistazo dónde empieza y dónde acaba la superserie.
 */
function EnlaceSuperserie({
  unido, color, palette, onToggle,
}: { unido: boolean; color: string; palette: Palette; onToggle: () => void }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, height: 22, paddingLeft: 12 }}>
      <button
        onClick={onToggle}
        aria-label={unido ? "Separar de la superserie" : "Unir en superserie con el anterior"}
        title={unido ? "Separar de la superserie" : "Unir en superserie con el anterior"}
        className="ft-touch"
        style={{
          display: "flex", alignItems: "center", justifyContent: "center", gap: 5, height: 22, padding: "0 9px",
          borderRadius: 999, cursor: "pointer", fontFamily: "inherit", fontSize: 10, fontWeight: 700,
          border: `1px solid ${unido ? color : palette.panelBorder}`,
          background: unido ? `${color}1f` : "transparent",
          color: unido ? color : palette.inkDim, opacity: unido ? 1 : 0.55,
        }}
      >
        <Link2 size={11} />
        {unido && "Superserie"}
      </button>
      <div style={{ flex: 1, height: 1, background: unido ? `${color}55` : palette.panelBorder, opacity: unido ? 1 : 0.5 }} />
    </div>
  );
}

function FilaRevision({
  fila, palette, onCambiar, onElegir, onCrear, onBorrar, onTipo,
}: {
  fila: FilaImportada;
  palette: Palette;
  onCambiar: (c: Partial<FilaImportada>) => void;
  onElegir: () => void;
  onCrear: () => void;
  onBorrar: () => void;
  onTipo: (x: number, y: number) => void;
}) {
  const identificado = !!fila.exerciseId;
  const esTiempo = fila.measurement_type === "time" || fila.measurement_type === "time_distance";
  const insignia = setTypeBadge(fila.setType);
  const colorGrupo = fila.supersetGroup != null ? supersetColor(fila.supersetGroup) : null;

  return (
    <div style={{
      display: "flex", overflow: "hidden", borderRadius: 13,
      border: `1px solid ${identificado ? palette.panelBorder : `${palette.danger}55`}`,
      background: identificado ? palette.inputBg : `${palette.danger}0c`,
    }}>
      {/* La franja de color es lo que hace visible una superserie sin leer nada. */}
      {colorGrupo && <div style={{ width: 4, flexShrink: 0, background: colorGrupo }} />}

      <div style={{ flex: 1, minWidth: 0, padding: 12 }}>
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

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "flex-end" }}>
          <CampoNumero label="Series" value={fila.sets} min={1} max={20} palette={palette} onChange={(v) => onCambiar({ sets: v })} />
          <CampoNumero
            label={esTiempo ? "Segundos" : "Reps"}
            value={fila.reps}
            min={1} max={500} palette={palette}
            onChange={(v) => onCambiar({ reps: v, repsMax: undefined })}
          />
          <CampoNumero label="Descanso (s)" value={fila.restSeconds} min={0} max={3600} palette={palette} onChange={(v) => onCambiar({ restSeconds: v })} />

          <button
            onClick={(e) => {
              const r = e.currentTarget.getBoundingClientRect();
              onTipo(r.left + r.width / 2, r.bottom);
            }}
            className="ft-touch"
            style={{
              display: "flex", alignItems: "center", gap: 5, height: 31, padding: "0 10px", borderRadius: 9,
              cursor: "pointer", fontFamily: "inherit", fontSize: 11, fontWeight: 700,
              border: `1px solid ${insignia ? insignia.color : palette.panelBorder}`,
              background: insignia ? `${insignia.color}1a` : palette.bg,
              color: insignia ? insignia.color : palette.inkDim,
            }}
          >
            {insignia ? insignia.label : "Series normales"}
          </button>

          {fila.supersetGroup != null && (
            <span style={{
              display: "flex", alignItems: "center", gap: 5, height: 31, padding: "0 10px", borderRadius: 9,
              fontSize: 11, fontWeight: 700, color: supersetColor(fila.supersetGroup),
              background: `${supersetColor(fila.supersetGroup)}1a`,
            }}>
              <Link2 size={12} /> {letraSuperserie(fila.supersetGroup)}
            </span>
          )}
        </div>

        {fila.notes && (
          <p style={{ fontSize: 11.5, color: palette.inkDim, lineHeight: 1.5, marginTop: 9 }}>{fila.notes}</p>
        )}
      </div>
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
