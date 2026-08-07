"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { palette, glassPanel } from "@/lib/theme";
import { ChevronLeft, Send } from "lucide-react";

export default function ClientMessagesPage() {
  const supabase = createClient();
  const router = useRouter();
  const scrollRef = useRef<HTMLDivElement>(null);

  const [trainerId, setTrainerId] = useState<string | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [input, setInput] = useState("");
  const [myId, setMyId] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data: auth } = await supabase.auth.getUser();
      setMyId(auth.user!.id);
      const { data: clientRow } = await supabase.from("clients").select("trainer_id").eq("user_id", auth.user!.id).single();
      setTrainerId(clientRow?.trainer_id ?? null);
      setLoading(false);
    })();
  }, []);

  async function loadMessages() {
    if (!myId) return;
    const { data } = await supabase.from("messages").select("*").eq("client_id", myId).order("created_at");
    setMessages(data ?? []);
  }

  useEffect(() => {
    if (!myId) return;
    loadMessages();
    const interval = setInterval(loadMessages, 4000);
    return () => clearInterval(interval);
  }, [myId]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  async function send() {
    if (!input.trim() || !trainerId) return;
    await supabase.from("messages").insert({
      trainer_id: trainerId, client_id: myId, sender: "client", content: input, type: "text",
    });
    setInput("");
    loadMessages();
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "calc(100vh - 130px)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
        <button onClick={() => router.push("/app")} style={{ background: "none", border: "none", color: palette.inkDim, cursor: "pointer" }}>
          <ChevronLeft size={20} />
        </button>
        <div style={{ fontSize: 15, fontWeight: 700 }}>Tu coach</div>
      </div>

      {loading ? (
        <p style={{ color: palette.inkDim, fontSize: 13, textAlign: "center", marginTop: 40 }}>Cargando...</p>
      ) : !trainerId ? (
        <div style={{ ...glassPanel, padding: 24, textAlign: "center", color: palette.inkDim, margin: "auto" }}>
          Todavía no tienes un coach asignado.
        </div>
      ) : (
        <>
          <div ref={scrollRef} style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: 8, marginBottom: 12 }}>
            {messages.length === 0 ? (
              <p style={{ color: palette.inkDim, fontSize: 13, textAlign: "center", marginTop: 20 }}>Empieza la conversación con tu coach.</p>
            ) : messages.map((m) => (
              <div key={m.id} style={{ display: "flex", justifyContent: m.sender === "client" ? "flex-end" : "flex-start" }}>
                <div style={{
                  maxWidth: "78%", padding: "10px 14px", borderRadius: 15,
                  borderBottomRightRadius: m.sender === "client" ? 4 : 15,
                  borderBottomLeftRadius: m.sender === "trainer" ? 4 : 15,
                  background: m.sender === "client" ? `linear-gradient(135deg, ${palette.accent}, ${palette.accentDeep})` : palette.panel,
                  border: m.sender === "trainer" ? `1px solid ${palette.panelBorder}` : "none",
                  color: m.sender === "client" ? "#0A0C10" : palette.ink,
                  fontSize: 13.5, lineHeight: 1.4,
                }}>
                  {m.content}
                </div>
              </div>
            ))}
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <input
              value={input} onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && send()}
              placeholder="Escribe un mensaje..."
              style={{ flex: 1, padding: "12px 14px", borderRadius: 14, border: `1px solid ${palette.panelBorder}`, background: palette.inputBg, color: palette.ink, fontSize: 13.5 }}
            />
            <button onClick={send} style={{
              width: 44, height: 44, borderRadius: 14, border: "none",
              background: `linear-gradient(135deg, ${palette.accent}, ${palette.accentDeep})`, color: "#0A0C10",
              display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flexShrink: 0,
            }}>
              <Send size={17} />
            </button>
          </div>
        </>
      )}
    </div>
  );
}
