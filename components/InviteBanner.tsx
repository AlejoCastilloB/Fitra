"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { usePalette } from "@/lib/theme";
import { useCurrentUser } from "@/lib/useCurrentUser";
import { UserCheck } from "lucide-react";
import Modal from "@/components/Modal";

type PendingInvite = { id: string; trainer_id: string; trainerName: string };

export default function InviteBanner() {
  const palette = usePalette();
  const uid = useCurrentUser();
  const supabase = createClient();
  const [invite, setInvite] = useState<PendingInvite | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!uid) return;
    (async () => {
      const { data: userRow } = await supabase.from("users").select("email").eq("id", uid).single();
      if (!userRow?.email) return;

      const { data: inviteRow } = await supabase
        .from("invites")
        .select("id, trainer_id")
        .eq("client_email", userRow.email.toLowerCase())
        .is("used_by", null)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!inviteRow) return;

      const { data: trainerRow } = await supabase.from("users").select("display_name").eq("id", inviteRow.trainer_id).single();
      setInvite({ id: inviteRow.id, trainer_id: inviteRow.trainer_id, trainerName: trainerRow?.display_name || "Un entrenador" });
    })();
  }, [uid]);

  async function accept() {
    if (!invite || !uid) return;
    setBusy(true);
    await Promise.all([
      supabase.from("clients").update({ trainer_id: invite.trainer_id }).eq("user_id", uid),
      supabase.from("invites").update({ used_by: uid }).eq("id", invite.id),
    ]);
    setBusy(false);
    setInvite(null);
  }

  async function decline() {
    if (!invite || !uid) return;
    setBusy(true);
    await supabase.from("invites").update({ used_by: uid }).eq("id", invite.id);
    setBusy(false);
    setInvite(null);
  }

  if (!invite) return null;

  return (
    <Modal title="Invitación de entrenador" onClose={decline} maxWidth={360}>
      <div style={{ display: "flex", justifyContent: "center", marginBottom: 14 }}>
        <div style={{ width: 52, height: 52, borderRadius: "50%", background: `${palette.accent}22`, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <UserCheck size={24} color={palette.accent} />
        </div>
      </div>
      <p style={{ fontSize: 14, textAlign: "center", lineHeight: 1.5, marginBottom: 20 }}>
        <strong>{invite.trainerName}</strong> te invitó a vincularte como su cliente en FitTrack.
      </p>
      <div style={{ display: "flex", gap: 10 }}>
        <button onClick={decline} disabled={busy} style={{
          flex: 1, padding: 12, borderRadius: 11, border: `1px solid ${palette.panelBorder}`,
          background: palette.inputBg, color: palette.inkDim, fontWeight: 600, fontSize: 13.5, cursor: "pointer",
        }}>
          Rechazar
        </button>
        <button onClick={accept} disabled={busy} style={{
          flex: 1, padding: 12, borderRadius: 11, border: "none",
          background: `linear-gradient(135deg, ${palette.accent}, ${palette.accentDeep})`, color: palette.bg,
          fontWeight: 700, fontSize: 13.5, cursor: "pointer",
        }}>
          Aceptar
        </button>
      </div>
    </Modal>
  );
}
