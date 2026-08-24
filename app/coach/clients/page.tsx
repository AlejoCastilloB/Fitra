"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { usePalette, type Palette } from "@/lib/theme";
import { Users, UserPlus, Copy, Check, Mail, Link2, X, ChevronRight } from "lucide-react";
import Modal from "@/components/Modal";
import Link from "next/link";

type ClientRow = { user_id: string; status: string; display_name: string | null; email: string | null };
type InviteRow = { id: string; code: string | null; client_email: string | null; used_by: string | null; created_at: string };

export default function ClientsPage() {
  const palette = usePalette();
  const supabase = createClient();

  const [uid, setUid] = useState("");
  const [clients, setClients] = useState<ClientRow[]>([]);
  const [invites, setInvites] = useState<InviteRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [showInvite, setShowInvite] = useState(false);

  async function load() {
    const { data: auth } = await supabase.auth.getUser();
    const id = auth.user!.id;
    setUid(id);

    const [{ data: clientRows }, { data: inviteRows }] = await Promise.all([
      supabase.from("clients").select("user_id, status, users(display_name, email)").eq("trainer_id", id),
      supabase.from("invites").select("id, code, client_email, used_by, created_at").eq("trainer_id", id).is("used_by", null).order("created_at", { ascending: false }),
    ]);

    setClients((clientRows ?? []).map((c: any) => ({ user_id: c.user_id, status: c.status, display_name: c.users?.display_name ?? null, email: c.users?.email ?? null })));
    setInvites(inviteRows ?? []);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24, gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 4 }}>Clientes</h1>
          <p style={{ color: palette.inkDim, fontSize: 14 }}>Gestiona tus clientes e invitaciones</p>
        </div>
        <button onClick={() => setShowInvite(true)} style={{
          display: "flex", alignItems: "center", gap: 8, padding: "10px 16px", borderRadius: 11, border: "none",
          background: `linear-gradient(135deg, ${palette.accent}, ${palette.accentDeep})`, color: palette.bg,
          fontWeight: 700, fontSize: 13.5, cursor: "pointer", whiteSpace: "nowrap",
        }}>
          <UserPlus size={16} /> Invitar cliente
        </button>
      </div>

      {!loading && invites.length > 0 && (
        <Section title="Invitaciones pendientes" palette={palette}>
          {invites.map((inv) => (
            <div key={inv.id} style={{ ...palette.cleanGroup, padding: "13px 16px", display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
                {inv.client_email ? <Mail size={15} color={palette.inkDim} /> : <Link2 size={15} color={palette.inkDim} />}
                <span style={{ fontSize: 13.5, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {inv.client_email || "Link de invitación"}
                </span>
              </div>
              <span style={{ fontSize: 11.5, color: palette.accent, fontWeight: 600, flexShrink: 0 }}>Pendiente</span>
            </div>
          ))}
        </Section>
      )}

      <Section title="Todos tus clientes" palette={palette}>
        {loading ? (
          <EmptyState palette={palette} text="Cargando..." />
        ) : clients.length === 0 ? (
          <EmptyState palette={palette} text="Todavía no tienes clientes asignados. Invita al primero desde el botón de arriba." />
        ) : (
          clients.map((c) => (
            <Link key={c.user_id} href={`/coach/clients/${c.user_id}`} style={{
              ...palette.cleanGroup, padding: "14px 18px", display: "flex", justifyContent: "space-between", alignItems: "center",
              marginBottom: 10, textDecoration: "none", color: "inherit",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
                <div style={{
                  width: 32, height: 32, borderRadius: "50%", background: `${palette.accent}22`,
                  display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 700, color: palette.accent, flexShrink: 0,
                }}>
                  {(c.display_name || c.email || "?")[0]?.toUpperCase()}
                </div>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.display_name || c.email}</div>
                  {c.display_name && c.email && <div style={{ fontSize: 11.5, color: palette.inkDim }}>{c.email}</div>}
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
                <span style={{ fontSize: 12, color: palette.inkDim }}>{c.status}</span>
                <ChevronRight size={15} color={palette.inkDim} />
              </div>
            </Link>
          ))
        )}
      </Section>

      {showInvite && <InviteModal trainerId={uid} onClose={() => setShowInvite(false)} onInvited={load} />}
    </div>
  );
}

function InviteModal({ trainerId, onClose, onInvited }: { trainerId: string; onClose: () => void; onInvited: () => void }) {
  const palette = usePalette();
  const supabase = createClient();
  const [mode, setMode] = useState<"link" | "email">("link");
  const [email, setEmail] = useState("");
  const [generatedLink, setGeneratedLink] = useState("");
  const [copied, setCopied] = useState(false);
  const [saving, setSaving] = useState(false);
  const [sentTo, setSentTo] = useState("");
  const [error, setError] = useState("");

  async function generateLink() {
    setSaving(true);
    setError("");
    const code = Math.random().toString(36).slice(2, 10);
    const { error: err } = await supabase.from("invites").insert({ trainer_id: trainerId, code });
    setSaving(false);
    if (err) { setError("No pudimos generar el link, inténtalo de nuevo."); return; }
    setGeneratedLink(`${window.location.origin}/onboarding?invite=${code}`);
    onInvited();
  }

  async function copyLink() {
    await navigator.clipboard.writeText(generatedLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  }

  async function sendEmailInvite() {
    const trimmed = email.trim().toLowerCase();
    if (!trimmed) return;
    setSaving(true);
    setError("");
    const { error: err } = await supabase.from("invites").insert({ trainer_id: trainerId, client_email: trimmed });
    setSaving(false);
    if (err) { setError("No pudimos crear la invitación, inténtalo de nuevo."); return; }
    setSentTo(trimmed);
    setEmail("");
    onInvited();
  }

  return (
    <Modal title="Invitar cliente" onClose={onClose} maxWidth={400}>
      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        <ModeBtn active={mode === "link"} label="Link nuevo" icon={<Link2 size={14} />} onClick={() => setMode("link")} palette={palette} />
        <ModeBtn active={mode === "email"} label="Cuenta existente" icon={<Mail size={14} />} onClick={() => setMode("email")} palette={palette} />
      </div>

      {mode === "link" ? (
        <div>
          <p style={{ fontSize: 12, color: palette.inkDim, marginBottom: 14, lineHeight: 1.5 }}>
            Genera un link para que una persona nueva se registre y quede vinculada a ti automáticamente.
          </p>
          {generatedLink ? (
            <div>
              <div style={{ padding: 11, borderRadius: 10, background: palette.inputBg, border: `1px solid ${palette.panelBorder}`, fontSize: 12, wordBreak: "break-all", marginBottom: 10 }}>
                {generatedLink}
              </div>
              <button onClick={copyLink} style={{
                width: "100%", padding: 12, borderRadius: 11, border: "none",
                background: `linear-gradient(135deg, ${palette.accent}, ${palette.accentDeep})`, color: palette.bg,
                fontWeight: 700, fontSize: 14, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
              }}>
                {copied ? <><Check size={16} /> Copiado</> : <><Copy size={16} /> Copiar link</>}
              </button>
            </div>
          ) : (
            <button onClick={generateLink} disabled={saving} style={{
              width: "100%", padding: 12, borderRadius: 11, border: "none",
              background: `linear-gradient(135deg, ${palette.accent}, ${palette.accentDeep})`, color: palette.bg,
              fontWeight: 700, fontSize: 14, cursor: "pointer", opacity: saving ? 0.6 : 1,
            }}>
              {saving ? "Generando..." : "Generar link"}
            </button>
          )}
        </div>
      ) : (
        <div>
          <p style={{ fontSize: 12, color: palette.inkDim, marginBottom: 14, lineHeight: 1.5 }}>
            Si la persona ya tiene una cuenta en FitTrack, escribe su correo y le va a aparecer una invitación para aceptarte como su entrenador.
          </p>
          {sentTo ? (
            <div style={{ padding: 12, borderRadius: 10, background: `${palette.accent}18`, color: palette.accent, fontSize: 13, fontWeight: 600, textAlign: "center" }}>
              Invitación enviada a {sentTo}
            </div>
          ) : (
            <>
              <input
                type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="correo@ejemplo.com"
                style={{ width: "100%", padding: 11, borderRadius: 10, border: `1px solid ${palette.panelBorder}`, background: palette.inputBg, color: palette.ink, fontSize: 14, marginBottom: 12 }}
              />
              <button onClick={sendEmailInvite} disabled={saving || !email.trim()} style={{
                width: "100%", padding: 12, borderRadius: 11, border: "none",
                background: `linear-gradient(135deg, ${palette.accent}, ${palette.accentDeep})`, color: palette.bg,
                fontWeight: 700, fontSize: 14, cursor: "pointer", opacity: saving || !email.trim() ? 0.5 : 1,
              }}>
                {saving ? "Enviando..." : "Enviar invitación"}
              </button>
            </>
          )}
        </div>
      )}

      {error && <p style={{ color: "#f87171", fontSize: 12, marginTop: 10 }}>{error}</p>}
    </Modal>
  );
}

function ModeBtn({ active, label, icon, onClick, palette }: { active: boolean; label: string; icon: React.ReactNode; onClick: () => void; palette: Palette }) {
  return (
    <button onClick={onClick} style={{
      flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "9px 10px", borderRadius: 10,
      border: `1px solid ${active ? palette.accent : palette.panelBorder}`,
      background: active ? `${palette.accent}18` : palette.inputBg,
      color: active ? palette.accent : palette.inkDim, cursor: "pointer", fontSize: 12.5, fontWeight: 600,
    }}>
      {icon} {label}
    </button>
  );
}

function Section({ title, children, palette }: { title: string; children: React.ReactNode; palette: Palette }) {
  return (
    <div style={{ marginBottom: 24 }}>
      <h2 style={{ fontSize: 13, fontWeight: 700, color: palette.accent, marginBottom: 10, textTransform: "uppercase", letterSpacing: "0.04em" }}>{title}</h2>
      {children}
    </div>
  );
}

function EmptyState({ text, palette }: { text: string; palette: Palette }) {
  return (
    <div style={{ padding: 24, borderRadius: 14, border: `1px solid ${palette.panelBorder}`, background: palette.panel, color: palette.inkDim, fontSize: 13.5, textAlign: "center" }}>
      {text}
    </div>
  );
}
