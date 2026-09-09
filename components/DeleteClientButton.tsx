"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { usePalette } from "@/lib/theme";
import Modal from "@/components/Modal";
import { Trash2, AlertTriangle } from "lucide-react";

/**
 * Borrar la cuenta de un cliente, de verdad y para siempre.
 *
 * Pide escribir el correo entero antes de habilitar el botón. No es burocracia: un
 * "¿seguro?" se toca sin leer, y esto no tiene deshacer. Escribir el correo obliga a mirar
 * a quién se está borrando, que es justo el error que se quiere evitar — el de equivocarse
 * de persona en una lista.
 */
export default function DeleteClientButton({
  clientId, email, displayName,
}: { clientId: string; email: string | null; displayName: string | null }) {
  const palette = usePalette();
  const router = useRouter();
  const [abierto, setAbierto] = useState(false);
  const [escrito, setEscrito] = useState("");
  const [borrando, setBorrando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const nombre = displayName || email || "esta persona";
  const coincide = !!email && escrito.trim().toLowerCase() === email.trim().toLowerCase();

  async function borrar() {
    if (!coincide) return;
    setBorrando(true);
    setError(null);
    try {
      const res = await fetch("/api/coach/client-delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientId, confirmEmail: escrito.trim() }),
      });
      const cuerpo = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(cuerpo?.error ? `No se pudo borrar: ${cuerpo.error}` : "No se pudo borrar la cuenta.");
        setBorrando(false);
        return;
      }
      // A la lista de clientes: esta ficha ya no existe.
      router.push("/coach/clients");
      router.refresh();
    } catch {
      setError("No se pudo borrar. Revisa tu conexión.");
      setBorrando(false);
    }
  }

  return (
    <>
      <button
        onClick={() => { setEscrito(""); setError(null); setAbierto(true); }}
        style={{
          display: "inline-flex", alignItems: "center", gap: 7, padding: "9px 16px", borderRadius: 11,
          border: `1px solid ${palette.danger}55`, background: "none", color: palette.danger,
          fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit",
        }}
      >
        <Trash2 size={14} /> Eliminar esta cuenta
      </button>

      {abierto && (
        <Modal title="Eliminar la cuenta" onClose={() => !borrando && setAbierto(false)} maxWidth={380}>
          <div style={{
            display: "flex", gap: 10, padding: 12, borderRadius: 12, marginBottom: 16,
            background: `${palette.danger}12`, border: `1px solid ${palette.danger}33`,
          }}>
            <AlertTriangle size={16} color={palette.danger} style={{ flexShrink: 0, marginTop: 1 }} />
            <p style={{ fontSize: 12.5, lineHeight: 1.55, color: palette.ink }}>
              Se borra <strong>{nombre}</strong> con todo lo suyo: entrenamientos, series, récords,
              medidas, fotos, comidas e insignias. <strong>No se puede deshacer.</strong>
            </p>
          </div>

          {email ? (
            <>
              <label style={{ fontSize: 12, color: palette.inkDim, display: "block", marginBottom: 7, lineHeight: 1.5 }}>
                Para confirmar, escribe su correo: <strong style={{ color: palette.ink }}>{email}</strong>
              </label>
              <input
                value={escrito}
                onChange={(e) => setEscrito(e.target.value)}
                placeholder={email}
                autoCapitalize="off"
                autoCorrect="off"
                spellCheck={false}
                style={{
                  width: "100%", padding: "10px 12px", borderRadius: 11, marginBottom: 14,
                  border: `1px solid ${coincide ? palette.danger : palette.panelBorder}`,
                  background: palette.inputBg, color: palette.ink, fontSize: 14, fontFamily: "inherit",
                }}
              />
            </>
          ) : (
            <p style={{ fontSize: 12.5, color: palette.inkDim, marginBottom: 14, lineHeight: 1.55 }}>
              Esta cuenta no tiene correo guardado, así que no se puede confirmar por escrito.
              Escríbeme y lo resolvemos a mano.
            </p>
          )}

          {error && <p style={{ fontSize: 12, color: palette.danger, marginBottom: 12 }}>{error}</p>}

          <div style={{ display: "flex", gap: 10 }}>
            <button
              onClick={() => setAbierto(false)}
              disabled={borrando}
              style={{
                flex: 1, padding: 12, borderRadius: 12, cursor: "pointer", fontFamily: "inherit",
                border: `1px solid ${palette.panelBorder}`, background: palette.inputBg,
                color: palette.ink, fontSize: 13.5, fontWeight: 700,
              }}
            >
              Cancelar
            </button>
            <button
              onClick={borrar}
              disabled={!coincide || borrando}
              style={{
                flex: 1, padding: 12, borderRadius: 12, border: "none", fontFamily: "inherit",
                cursor: coincide && !borrando ? "pointer" : "default",
                background: palette.danger, color: "#fff", fontSize: 13.5, fontWeight: 700,
                opacity: coincide && !borrando ? 1 : 0.45,
              }}
            >
              {borrando ? "Borrando..." : "Eliminar"}
            </button>
          </div>
        </Modal>
      )}
    </>
  );
}
