"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { usePalette, type Palette } from "@/lib/theme";
import type { ClientStats } from "@/lib/coachClientStats";
import { UserPlus, Copy, Check, Mail, Link2, ChevronRight, Dumbbell, Utensils, CalendarDays } from "lucide-react";
import Modal from "@/components/Modal";

type ClientRow = {
  user_id: string; status: string | null;
  display_name: string | null; email: string | null;
  stats: ClientStats;
};
type InviteRow = { id: string; client_email: string | null };

function relativeDay(iso: string | null): string {
  if (!iso) return "Sin entrenos aún";
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
  if (days <= 0) return "Entrenó hoy";
  if (days === 1) return "Entrenó ayer";
  if (days < 7) return `Entrenó hace ${days} días`;
  if (days < 30) return `Hace ${Math.floor(days / 7)} sem. sin entrenar`;
  return `Hace ${Math.floor(days / 30)} meses sin entrenar`;
}

export default function CoachClientsContent({
  trainerId, clients, invites, loadError, unassignedCount = 0,
}: {
  trainerId: string;
  clients: ClientRow[];
  invites: InviteRow[];
  loadError: string | null;
  unassignedCount?: number;
}) {
  const palette = usePalette();
  const router = useRouter();
  const [showInvite, setShowInvite] = useState(false);
  const [claiming, setClaiming] = useState(false);
  const [claimError, setClaimError] = useState<string | null>(null);

  async function claimUnassigned() {
    setClaiming(true);
    setClaimError(null);
    try {
      const res = await fetch("/api/coach/claim-unassigned", { method: "POST" });
      const body = await res.json();
      if (!res.ok) throw new Error(body?.error || `error ${res.status}`);
      router.refresh();
    } catch (e: any) {
      setClaimError(`No pudimos vincularlos: ${e.message}`);
    } finally {
      setClaiming(false);
    }
  }

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 22, gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 4 }}>Clientes</h1>
          <p style={{ color: palette.inkDim, fontSize: 14 }}>
            {clients.length > 0 ? `${clients.length} ${clients.length === 1 ? "persona" : "personas"} a tu cargo` : "Gestiona tus clientes e invitaciones"}
          </p>
        </div>
        <button onClick={() => setShowInvite(true)} style={{
          display: "flex", alignItems: "center", gap: 8, padding: "10px 16px", borderRadius: 11, border: "none",
          background: `linear-gradient(135deg, ${palette.accent}, ${palette.accentDeep})`, color: palette.bg,
          fontWeight: 700, fontSize: 13.5, cursor: "pointer", whiteSpace: "nowrap",
        }}>
          <UserPlus size={16} /> Invitar
        </button>
      </div>

      {loadError && (
        <div style={{
          padding: 14, borderRadius: 12, marginBottom: 18, fontSize: 13, lineHeight: 1.5,
          background: "#f8717118", border: "1px solid #f8717155", color: "#b91c1c",
        }}>
          {loadError}
        </div>
      )}

      {unassignedCount > 0 && (
        <div style={{
          ...palette.glassPanel, padding: 16, marginBottom: 20,
          border: `1px solid ${palette.accent}55`, background: `${palette.accent}12`,
        }}>
          <div style={{ fontSize: 13.5, fontWeight: 700, marginBottom: 4 }}>
            {unassignedCount} {unassignedCount === 1 ? "persona registrada" : "personas registradas"} sin entrenador
          </div>
          <p style={{ fontSize: 12.5, color: palette.inkDim, lineHeight: 1.5, marginBottom: 12 }}>
            Se registraron cuando el vínculo automático estaba fallando. Puedes agregarlas a tu cargo de una vez.
          </p>
          {claimError && <p style={{ fontSize: 12, color: "#f87171", marginBottom: 10 }}>{claimError}</p>}
          <button onClick={claimUnassigned} disabled={claiming} style={{
            display: "flex", alignItems: "center", gap: 7, padding: "10px 16px", borderRadius: 11, border: "none",
            background: `linear-gradient(135deg, ${palette.accent}, ${palette.accentDeep})`, color: palette.bg,
            fontWeight: 700, fontSize: 13, cursor: "pointer", opacity: claiming ? 0.6 : 1,
          }}>
            <UserPlus size={15} /> {claiming ? "Vinculando..." : "Agregarlas a mis clientes"}
          </button>
        </div>
      )}

      {invites.length > 0 && (
        <Section title="Invitaciones pendientes" palette={palette}>
          {invites.map((inv) => (
            <div key={inv.id} style={{
              ...palette.cleanGroup, padding: "13px 16px", display: "flex",
              justifyContent: "space-between", alignItems: "center", marginBottom: 8,
            }}>
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
        {clients.length === 0 && !loadError ? (
          <div style={{
            padding: 28, borderRadius: 16, border: `1px dashed ${palette.panelBorder}`,
            background: palette.panel, color: palette.inkDim, fontSize: 13.5, textAlign: "center", lineHeight: 1.6,
          }}>
            Todavía no tienes clientes asignados.<br />Invita al primero desde el botón de arriba.
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {clients.map((c, i) => <ClientCard key={c.user_id} client={c} palette={palette} index={i} />)}
          </div>
        )}
      </Section>

      {showInvite && (
        <InviteModal
          trainerId={trainerId}
          onClose={() => setShowInvite(false)}
          onInvited={() => router.refresh()}
        />
      )}
    </div>
  );
}

function ClientCard({ client, palette, index }: { client: ClientRow; palette: Palette; index: number }) {
  const s = client.stats;
  const name = client.display_name || client.email || "Cliente";
  const planned = s.plannedThisWeek;
  const done = s.workoutsThisWeek;
  const pct = planned > 0 ? Math.min(100, Math.round((done / planned) * 100)) : (done > 0 ? 100 : 0);
  const onTrack = planned === 0 ? done > 0 : done >= planned;

  return (
    <Link
      href={`/coach/clients/${client.user_id}`}
      className="ft-fade-in-up"
      style={{
        ...palette.glassPanel, padding: 16, textDecoration: "none", color: "inherit",
        display: "block", animationDelay: `${Math.min(index, 8) * 0.03}s`,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
        <div style={{
          width: 40, height: 40, borderRadius: "50%", flexShrink: 0,
          background: `linear-gradient(135deg, ${palette.accent}, ${palette.accentDeep})`, color: palette.bg,
          display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15, fontWeight: 800,
        }}>
          {name[0]?.toUpperCase()}
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 15, fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{name}</div>
          <div style={{ fontSize: 11.5, color: palette.inkDim, marginTop: 2, display: "flex", alignItems: "center", gap: 5 }}>
            <CalendarDays size={11} />
            {s.activeDaysThisWeek > 0 ? `${s.activeDaysThisWeek}/7 días activo esta semana` : "Sin actividad esta semana"}
            {client.status && client.status !== "active" && (
              <span style={{ marginLeft: 4, padding: "1px 7px", borderRadius: 999, background: palette.inputBg, fontSize: 10, fontWeight: 700 }}>
                {client.status}
              </span>
            )}
          </div>
        </div>

        <ChevronRight size={16} color={palette.inkDim} style={{ flexShrink: 0 }} />
      </div>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
        <span style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11.5, color: palette.inkDim, fontWeight: 600 }}>
          <Dumbbell size={12} /> Entrenamientos esta semana
        </span>
        <span style={{ fontSize: 12, fontWeight: 700, color: onTrack ? palette.accent : palette.ink }}>
          {done}{planned > 0 ? ` / ${planned}` : ""}
        </span>
      </div>
      <div style={{ height: 6, borderRadius: 4, background: palette.divider, overflow: "hidden", marginBottom: 12 }}>
        <div style={{
          height: "100%", width: `${pct}%`, borderRadius: 4,
          background: onTrack ? `linear-gradient(90deg, ${palette.accentDeep}, ${palette.accent})` : "#E0A33E",
          transition: "width .5s cubic-bezier(.16,.8,.24,1)",
        }} />
      </div>

      <div style={{ display: "flex", gap: 8 }}>
        <Stat palette={palette} icon={<Dumbbell size={12} />} label="Última sesión" value={relativeDay(s.lastWorkoutAt)} />
        <Stat palette={palette} icon={<Utensils size={12} />} label="Nutrición" value={`${s.daysLoggedFoodThisWeek}/7 días`} hint={s.kcalToday > 0 ? `${Math.round(s.kcalToday).toLocaleString("es-CO")} kcal hoy` : "Sin registro hoy"} />
      </div>
    </Link>
  );
}

function Stat({ palette, icon, label, value, hint }: {
  palette: Palette; icon: React.ReactNode; label: string; value: string; hint?: string;
}) {
  return (
    <div style={{ flex: 1, minWidth: 0, padding: "9px 11px", borderRadius: 11, background: palette.inputBg }}>
      <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 9.5, fontWeight: 700, color: palette.inkDim, textTransform: "uppercase", letterSpacing: "0.03em", marginBottom: 3 }}>
        {icon} {label}
      </div>
      <div style={{ fontSize: 12, fontWeight: 600, color: palette.ink, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{value}</div>
      {hint && <div style={{ fontSize: 10.5, color: palette.inkDim, marginTop: 1 }}>{hint}</div>}
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

  const primaryBtn: React.CSSProperties = {
    width: "100%", padding: 12, borderRadius: 11, border: "none",
    background: `linear-gradient(135deg, ${palette.accent}, ${palette.accentDeep})`, color: palette.bg,
    fontWeight: 700, fontSize: 14, cursor: "pointer",
  };

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
              <button onClick={copyLink} style={{ ...primaryBtn, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                {copied ? <><Check size={16} /> Copiado</> : <><Copy size={16} /> Copiar link</>}
              </button>
            </div>
          ) : (
            <button onClick={generateLink} disabled={saving} style={{ ...primaryBtn, opacity: saving ? 0.6 : 1 }}>
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
              <button onClick={sendEmailInvite} disabled={saving || !email.trim()} style={{ ...primaryBtn, opacity: saving || !email.trim() ? 0.5 : 1 }}>
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
