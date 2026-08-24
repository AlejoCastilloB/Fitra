"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { usePalette } from "@/lib/theme";
import { Send } from "lucide-react";

export default function CoachMessagesPage() {
  const palette = usePalette();
  const supabase = createClient();
  const scrollRef = useRef<HTMLDivElement>(null);

  const [clients, setClients] = useState<any[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [input, setInput] = useState("");
  const [myId, setMyId] = useState("");

  useEffect(() => {
    (async () => {
      const { data: auth } = await supabase.auth.getUser();
      setMyId(auth.user!.id);
      const { data: cli } = await supabase.from("clients").select("user_id, users(email)").eq("trainer_id", auth.user!.id);
      setClients(cli ?? []);
      if (cli && cli.length > 0) setSelected(cli[0].user_id);
    })();
  }, []);

  async function loadMessages(clientId: string) {
    const { data } = await supabase.from("messages").select("*").eq("client_id", clientId).order("created_at");
    setMessages(data ?? []);
  }

  useEffect(() => {
    if (!selected) return;
    loadMessages(selected);
    const interval = setInterval(() => loadMessages(selected), 4000);
    return () => clearInterval(interval);
  }, [selected]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  async function send() {
    if (!input.trim() || !selected) return;
    const { data: auth } = await supabase.auth.getUser();
    await supabase.from("messages").insert({
      trainer_id: auth.user!.id, client_id: selected, sender: "trainer", content: input, type: "text",
    });
    setInput("");
    loadMessages(selected);
  }

  return (
    <>
      <div className="coach-desktop-only" style={{ display: "grid", gridTemplateColumns: "240px 1fr", gap: 16, height: "calc(100vh - 100px)" }}>
        <div className="ft-fade-in-up" style={{ ...palette.glassPanel, padding: 10, overflowY: "auto" }}>
          <h2 style={{ fontSize: 13, fontWeight: 700, color: palette.accent, textTransform: "uppercase", letterSpacing: "0.04em", padding: "6px 8px 10px" }}>Clientes</h2>
          {clients.length === 0 ? (
            <p style={{ fontSize: 12, color: palette.inkDim, padding: 10 }}>Todavía no tienes clientes.</p>
          ) : clients.map((c) => (
            <button key={c.user_id} onClick={() => setSelected(c.user_id)} style={{
              display: "block", width: "100%", textAlign: "left", padding: "10px 10px", borderRadius: 10, marginBottom: 4,
              background: selected === c.user_id ? `${palette.accent}22` : "transparent", border: "none",
              color: palette.ink, fontSize: 13, cursor: "pointer",
            }}>
              {c.users?.email}
            </button>
          ))}
        </div>

        <ChatPanel palette={palette} selected={selected} messages={messages} input={input} setInput={setInput} send={send} scrollRef={scrollRef} />
      </div>

      <div className="coach-mobile-only" style={{ flexDirection: "column", gap: 10 }}>
        <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 4 }}>
          {clients.length === 0 ? (
            <p style={{ fontSize: 12, color: palette.inkDim }}>Todavía no tienes clientes.</p>
          ) : clients.map((c) => (
            <button key={c.user_id} onClick={() => setSelected(c.user_id)} style={{
              flexShrink: 0, padding: "8px 14px", borderRadius: 999, border: `1px solid ${palette.panelBorder}`,
              background: selected === c.user_id ? `${palette.accent}22` : palette.inputBg,
              color: selected === c.user_id ? palette.accent : palette.ink, fontSize: 12.5, fontWeight: 600,
              cursor: "pointer", whiteSpace: "nowrap",
            }}>
              {c.users?.email}
            </button>
          ))}
        </div>

        <ChatPanel palette={palette} selected={selected} messages={messages} input={input} setInput={setInput} send={send} scrollRef={scrollRef} height="60vh" />
      </div>
    </>
  );
}

function ChatPanel({ palette, selected, messages, input, setInput, send, scrollRef, height }: {
  palette: any; selected: string | null; messages: any[]; input: string; setInput: (v: string) => void;
  send: () => void; scrollRef: React.RefObject<HTMLDivElement>; height?: string;
}) {
  return (
    <div className="ft-fade-in-up" style={{ ...palette.glassPanel, display: "flex", flexDirection: "column", padding: 16, animationDelay: ".05s", height }}>
      {!selected ? (
        <p style={{ color: palette.inkDim, fontSize: 13, margin: "auto" }}>Selecciona un cliente para chatear.</p>
      ) : (
        <>
          <div ref={scrollRef} style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: 8, marginBottom: 12 }}>
            {messages.map((m) => (
              <div key={m.id} style={{ display: "flex", justifyContent: m.sender === "trainer" ? "flex-end" : "flex-start" }}>
                <div style={{
                  maxWidth: "70%", padding: "9px 13px", borderRadius: 14,
                  borderBottomRightRadius: m.sender === "trainer" ? 4 : 14,
                  borderBottomLeftRadius: m.sender === "client" ? 4 : 14,
                  background: m.sender === "trainer" ? `linear-gradient(135deg, ${palette.accent}, ${palette.accentDeep})` : palette.inputBg,
                  color: m.sender === "trainer" ? palette.bg : palette.ink,
                  fontSize: 13, lineHeight: 1.4,
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
              style={{ flex: 1, padding: "11px 14px", borderRadius: 12, border: `1px solid ${palette.panelBorder}`, background: palette.inputBg, color: palette.ink, fontSize: 13.5 }}
            />
            <button onClick={send} style={{
              width: 42, height: 42, borderRadius: 12, border: "none",
              background: `linear-gradient(135deg, ${palette.accent}, ${palette.accentDeep})`, color: palette.bg,
              display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer",
            }}>
              <Send size={16} />
            </button>
          </div>
        </>
      )}
    </div>
  );
}
