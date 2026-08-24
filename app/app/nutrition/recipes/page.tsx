"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { usePalette } from "@/lib/theme";
import { ChevronLeft, Send, Camera, Sparkles, Loader2, X } from "lucide-react";
import RecipeCard, { Recipe } from "@/components/RecipeCard";

type Msg = { role: "user" | "assistant"; content: string; recipe?: Recipe | null; saved?: boolean };

export default function RecipeChatPage() {
  const palette = usePalette();
  const router = useRouter();
  const supabase = createClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const [messages, setMessages] = useState<Msg[]>([
    { role: "assistant", content: "Hola, soy Fitra 👋 Cuéntame qué ingredientes tienes disponibles (por texto o con una foto) y te sugiero una receta rica que te ayude a llegar a tus metas de hoy." },
  ]);
  const [input, setInput] = useState("");
  const [stagedImage, setStagedImage] = useState<string | null>(null);
  const [stagedPreview, setStagedPreview] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [remaining, setRemaining] = useState<number | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, sending]);

  function fileToBase64(file: File): Promise<{ base64: string; preview: string }> {
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
          const dataUrl = canvas.toDataURL("image/jpeg", 0.7);
          resolve({ base64: dataUrl.split(",")[1], preview: dataUrl });
        };
        img.onerror = reject;
        img.src = reader.result as string;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  async function handlePickImage(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const { base64, preview } = await fileToBase64(file);
    setStagedImage(base64);
    setStagedPreview(preview);
    if (fileRef.current) fileRef.current.value = "";
  }

  async function sendMessage() {
    if (!input.trim() && !stagedImage) return;
    setError("");
    const userMsg: Msg = { role: "user", content: input.trim() || "📷 Foto de ingredientes" };
    const nextMessages = [...messages, userMsg];
    setMessages(nextMessages);
    const imgToSend = stagedImage;
    setInput("");
    setStagedImage(null);
    setStagedPreview(null);
    setSending(true);

    try {
      const res = await fetch("/api/ai/recipe-chat", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: nextMessages, imageBase64: imgToSend, mimeType: "image/jpeg" }),
      });
      const data = await res.json();

      if (!res.ok) setError(data.message || data.error || "Error al hablar con Fitra");
      else {
        setMessages([...nextMessages, { role: "assistant", content: data.reply, recipe: data.recipe }]);
        setRemaining(data.remaining);
      }
    } catch { setError("Fallo de red, inténtalo de nuevo"); }
    finally { setSending(false); }
  }

  async function saveRecipe(msgIdx: number, recipe: Recipe) {
    const { data: auth } = await supabase.auth.getUser();
    await supabase.from("nutrition_logs").insert({
      client_id: auth.user!.id, food_name: recipe.title, portion: "Receta sugerida por Fitra",
      kcal: recipe.kcal, protein: recipe.protein, carbs: recipe.carbs, fat: recipe.fat,
      source: "manual", recipe_data: recipe,
    });
    setMessages((prev) => prev.map((m, i) => i === msgIdx ? { ...m, saved: true } : m));
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "calc(100vh - 48px)" }}>
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
            <Sparkles size={14} color={palette.accent} /> Fitra
          </div>
          <div style={{ fontSize: 11, color: palette.inkDim }}>Sugerencias de recetas</div>
        </div>
      </div>

      <div ref={scrollRef} style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: 10, paddingBottom: 10 }}>
        {messages.map((m, i) => (
          <div key={i} className="ft-bubble" style={{ display: "flex", flexDirection: "column", alignItems: m.role === "user" ? "flex-end" : "flex-start", gap: 8 }}>
            <div style={{
              maxWidth: "82%", padding: "11px 14px", borderRadius: 16,
              borderBottomRightRadius: m.role === "user" ? 4 : 16,
              borderBottomLeftRadius: m.role === "assistant" ? 4 : 16,
              background: m.role === "user" ? `linear-gradient(135deg, ${palette.accent}, ${palette.accentDeep})` : palette.panel,
              border: m.role === "assistant" ? `1px solid ${palette.panelBorder}` : "none",
              color: m.role === "user" ? palette.bg : palette.ink,
              fontSize: 13.5, lineHeight: 1.5, whiteSpace: "pre-wrap",
            }}>
              {m.content}
            </div>
            {m.recipe && (
              <div style={{ width: "100%", maxWidth: 340 }}>
                <RecipeCard recipe={m.recipe} onSave={() => saveRecipe(i, m.recipe!)} saved={m.saved} />
              </div>
            )}
          </div>
        ))}
        {sending && (
          <div className="ft-bubble" style={{ display: "flex", justifyContent: "flex-start" }}>
            <div style={{ ...palette.glassPanel, padding: "12px 16px" }} className="ft-typing"><span>●</span> <span>●</span> <span>●</span></div>
          </div>
        )}
      </div>

      {error && <p style={{ color: "#f87171", fontSize: 12.5, textAlign: "center", marginBottom: 8 }}>{error}</p>}
      {remaining !== null && <p style={{ textAlign: "center", fontSize: 11, color: palette.inkDim, marginBottom: 8 }}>{remaining} mensajes gratis restantes hoy</p>}

      {stagedPreview && (
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8, padding: 8, borderRadius: 12, background: palette.inputBg, border: `1px solid ${palette.panelBorder}` }}>
          <img src={stagedPreview} alt="preview" style={{ width: 44, height: 44, borderRadius: 8, objectFit: "cover" }} />
          <span style={{ fontSize: 12, color: palette.inkDim, flex: 1 }}>Foto lista — agrega texto o envía directo</span>
          <button onClick={() => { setStagedImage(null); setStagedPreview(null); }} style={{ background: "none", border: "none", color: palette.inkDim, cursor: "pointer" }}><X size={16} /></button>
        </div>
      )}

      <input ref={fileRef} type="file" accept="image/*" capture="environment" onChange={handlePickImage} style={{ display: "none" }} />

      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <button onClick={() => fileRef.current?.click()} style={{
          width: 42, height: 42, borderRadius: 12, border: `1px solid ${palette.panelBorder}`,
          background: palette.inputBg, color: palette.ink, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flexShrink: 0,
        }}><Camera size={17} /></button>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && sendMessage()}
          placeholder="Ej: tengo 2 zanahorias, un huevo..."
          style={{ flex: 1, padding: "12px 14px", borderRadius: 14, border: `1px solid ${palette.panelBorder}`, background: palette.inputBg, color: palette.ink, fontSize: 13.5 }}
        />
        <button onClick={sendMessage} disabled={sending || (!input.trim() && !stagedImage)} style={{
          width: 42, height: 42, borderRadius: 12, border: "none",
          background: `linear-gradient(135deg, ${palette.accent}, ${palette.accentDeep})`, color: palette.bg,
          display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flexShrink: 0,
          opacity: sending || (!input.trim() && !stagedImage) ? 0.5 : 1,
        }}>
          {sending ? <Loader2 size={16} /> : <Send size={16} />}
        </button>
      </div>
    </div>
  );
}
