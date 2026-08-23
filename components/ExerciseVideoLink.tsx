"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { usePalette } from "@/lib/theme";
import { Youtube, Pencil, ExternalLink } from "lucide-react";

export default function ExerciseVideoLink({ exerciseId, initialUrl }: { exerciseId: string; initialUrl?: string | null }) {
  const palette = usePalette();
  const supabase = createClient();
  const [url, setUrl] = useState<string | null>(initialUrl ?? null);
  const [loaded, setLoaded] = useState(initialUrl !== undefined);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");

  useEffect(() => {
    if (loaded) return;
    (async () => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) return;
      const { data } = await supabase
        .from("exercise_video_links")
        .select("video_url")
        .eq("user_id", auth.user.id)
        .eq("exercise_id", exerciseId)
        .maybeSingle();
      setUrl(data?.video_url ?? null);
      setLoaded(true);
    })();
  }, [exerciseId, loaded]);

  async function save() {
    const trimmed = draft.trim();
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) return;

    if (!trimmed) {
      await supabase.from("exercise_video_links").delete().eq("user_id", auth.user.id).eq("exercise_id", exerciseId);
      setUrl(null);
    } else {
      await supabase.from("exercise_video_links").upsert(
        { user_id: auth.user.id, exercise_id: exerciseId, video_url: trimmed },
        { onConflict: "user_id,exercise_id" }
      );
      setUrl(trimmed);
    }
    setEditing(false);
  }

  if (!loaded) return null;

  if (editing) {
    return (
      <div style={{ marginTop: 8, display: "flex", gap: 6 }}>
        <input
          autoFocus
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && save()}
          onBlur={save}
          placeholder="Link de YouTube..."
          style={{ flex: 1, padding: "6px 9px", borderRadius: 8, border: `1px solid ${palette.panelBorder}`, background: palette.inputBg, color: palette.ink, fontSize: 11.5 }}
        />
      </div>
    );
  }

  return url ? (
    <div style={{ marginTop: 8, display: "flex", alignItems: "center", gap: 8 }}>
      <a href={url} target="_blank" rel="noopener noreferrer" style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11.5, color: palette.accent, textDecoration: "none", fontWeight: 600 }}>
        <Youtube size={13} /> Ver video explicativo <ExternalLink size={10} />
      </a>
      <button onClick={() => { setDraft(url); setEditing(true); }} style={{ background: "none", border: "none", color: palette.inkDim, cursor: "pointer", display: "flex" }}>
        <Pencil size={11} />
      </button>
    </div>
  ) : (
    <button onClick={() => { setDraft(""); setEditing(true); }} style={{ marginTop: 8, display: "flex", alignItems: "center", gap: 5, background: "none", border: "none", color: palette.inkDim, fontSize: 11.5, cursor: "pointer" }}>
      <Youtube size={13} /> Agregar video explicativo
    </button>
  );
}
