"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { palette, glassPanel } from "@/lib/theme";
import { ChevronLeft, Send, Camera, Sparkles, Loader2 } from "lucide-react";

type Msg = { role: "user" | "assistant"; content: string };

export default function RecipeChatPage() {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const [messages, setMessages] = useState<Msg[]>([
    { role: "assistant", content: "Hola, soy la IA de Alejo 👋 Cuéntame qué ingredientes tienes disponibles (por texto o con una foto) y te sugiero una receta." },
  ]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [remaining, setRemaining] = useState<number | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, sending]);

  function fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const reader = new FileReader();
      reader.onload = () => {
        img.onload = () => {
          const canvas = document.createElement("canvas");
          const maxDim = 900;
          const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
          canvas.width = img.width * scale;
          canvas.height = img.height * scale;
          const ctx = canvas.getContext("2d");
          ctx?.drawImage(img, 0, 0, canvas.width, canvas.height);
          resolve(canvas.toDataURL("image/jpeg", 0.7).split(",")[1]);
        };
        img.onerror = reject;
        img.src = reader.result as string;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  async function sendMessage(text: string, imageBase64?: string) {
    if (!text.trim() && !imageBase64) return;
    setError("");
    const userMsg: Msg = { role: "user", content: text || "📷 Foto de ingredientes" };
    const nextMessages = [...messages, userMsg];
    setMessages(nextMessages);
    setInput("");
    setSending(true);

    try {
      const res = await fetch("/api/ai/recipe-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: nextMessages, imageBase64, mimeType: "image/jpeg" }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.message || data.error || "Error al hablar con la IA de Alejo");
      } else {
        setMessages([...nextMessages, { role: "assistant", content: data.reply }]);
        setRemaining(data.remaining);
      }
    } catch {
      setError("Fallo de red, inténtalo de nuevo");
    } finally {
      setSending(false);
    }
  }

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const base64 = await fileToBase64(file);
    await sendMessage(input, base64);
    if (fileRef.current) fileRef.current.value = "";
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "calc(100vh - 130px)" }}>
      <style>{`
        @keyframes ftBubbleIn { from { opacity: 0; transform: translateY(8px) scale(0.97); } to { opacity: 1; transform: none; } }
        .ft-bubble { animation: ftBubbleIn .3s cubic-bezier(.16,.8,.24,1) both; }
        @keyframes ftDot { 0%, 60%, 100% { opacity: 0.25; } 30% { opacity: 1; } }
        .ft-typing span { animation: ftDot 1.2s infinite; display: inline-block; }
        .ft-typing span:nth-child(2) { animation-delay: .15s; }
        .ft-typing span:nth-child(3) { animation-delay: .3s; }
      `}</style>

      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
        <button onClick={() => router.push("/app/nutrition")} style={{ background: "none", border: "none", color: palette.inkDim, cursor: "pointer" }}>
          <ChevronLeft size={20} />
        </button>
        <div>
          <div style={{ fontSize: 15, fontWeight: 700, display: "flex", alignItems: "center", gap: 5 }}>
            <Sparkles size={14} color={palette.accent} /> IA de Alejo
          </div>
          <div style={{ fontSize: 11, color: palette.inkDim }}>Sugerencias de recetas</div>
        </div>
      </div>

      <div ref={scrollRef} style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: 10, paddingBottom: 10 }}>
        {messages.map((m, i) => (
          <div key={i} className="ft-bubble" style={{ display: "flex", justifyContent: m.role === "user" ? "flex-end" : "flex-start" }}>
            <div style={{
              maxWidth: "82%", padding: "11px 14px", borderRadius: 16,
              borderBottomRightRadius: m.role === "user" ? 4 : 16,
              borderBottomLeftRadius: m.role === "assistant" ? 4 : 16,
              background: m.role === "user" ? `linear-gradient(135deg, ${palette.accent}, ${palette.accentDeep})` : palette.panel,
              border: m.role === "assistant" ? `1px solid ${palette.panelBorder}` : "none",
              color: m.role === "user" ? "#0A0C10" : palette.ink,
              fontSize: 13.5, lineHeight: 1.5, whiteSpace: "pre-wrap",
            }}>
              {m.content}
            </div>
          </div>
        ))}
        {sending && (
          <div className="ft-bubble" style={{ display: "flex", justifyContent: "flex-start" }}>
            <div style={{ ...glassPanel, padding: "12px 16px" }} className="ft-typing">
              <span>●</span> <span>●</span> <span>●</span>
            </div>
          </div>
        )}
      </div>

      {error && <p style={{ color: "#f87171", fontSize: 12.5, textAlign: "center", marginBottom: 8 }}>{error}</p>}
      {remaining !== null && (
        <p style={{ textAlign: "center", fontSize: 11, color: palette.inkDim, marginBottom: 8 }}>{remaining} mensajes gratis restantes hoy</p>
      )}

      <input ref={fileRef} type="file" accept="image/*" capture="environment" onChange={handleFile} style={{ display: "none" }} />

      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <button onClick={() => fileRef.current?.click()} style={{
          width: 42, height: 42, borderRadius: 12, border: `1px solid ${palette.panelBorder}`,
          background: palette.inputBg, color: palette.ink, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flexShrink: 0,
        }}>
          <Camera size={17} />
        </button>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && sendMessage(input)}
          placeholder="Ej: tengo 2 zanahorias, un huevo..."
          style={{ flex: 1, padding: "12px 14px", borderRadius: 14, border: `1px solid ${palette.panelBorder}`, background: palette.inputBg, color: palette.ink, fontSize: 13.5 }}
        />
        <button onClick={() => sendMessage(input)} disabled={sending || !input.trim()} style={{
          width: 42, height: 42, borderRadius: 12, border: "none",
          background: `linear-gradient(135deg, ${palette.accent}, ${palette.accentDeep})`, color: "#0A0C10",
          display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flexShrink: 0,
          opacity: sending || !input.trim() ? 0.5 : 1,
        }}>
          {sending ? <Loader2 size={16} className="spin" /> : <Send size={16} />}
        </button>
      </div>
    </div>
  );
}
