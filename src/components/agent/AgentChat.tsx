import { useState } from "react";
import { X, Send, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { StudySessionRow } from "./types";

interface Props { session: StudySessionRow; onClose: () => void }
type Msg = { role: "user" | "assistant"; content: string };

export default function AgentChat({ session, onClose }: Props) {
  const [messages, setMessages] = useState<Msg[]>([
    { role: "assistant", content: `Estou com a aula "${session.title}" carregada. Pergunte algo, peça resumo, comparação ou contexto sobre o que foi falado.` },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  const send = async () => {
    if (!input.trim() || loading) return;
    const userMsg: Msg = { role: "user", content: input.trim() };
    setMessages((m) => [...m, userMsg]);
    setInput("");
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("agent-chat", {
        body: {
          message: userMsg.content,
          transcript: session.full_transcript,
          topics: session.topics,
          history: messages.slice(-6),
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setMessages((m) => [...m, { role: "assistant", content: data.reply || "(sem resposta)" }]);
    } catch (e: any) {
      setMessages((m) => [...m, { role: "assistant", content: `Erro: ${e?.message || "falha"}` }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-background/70 backdrop-blur-sm flex items-end lg:items-center justify-center lg:justify-end p-3 lg:p-6" onClick={onClose}>
      <div
        className="w-full max-w-md h-[80vh] lg:h-[600px] bg-card border border-border/50 rounded-2xl flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="px-4 py-3 border-b border-border/40 flex items-center gap-2">
          <Sparkles size={14} className="text-primary" />
          <p className="font-ui text-sm font-bold text-foreground flex-1">Agente de Estudo</p>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><X size={16} /></button>
        </header>
        <div className="flex-1 overflow-y-auto p-3 space-y-3">
          {messages.map((m, i) => (
            <div
              key={i}
              className={`text-sm rounded-xl px-3 py-2 max-w-[85%] ${
                m.role === "user"
                  ? "ml-auto bg-primary/15 text-foreground"
                  : "mr-auto bg-muted/30 text-foreground/85"
              }`}
              style={{ whiteSpace: "pre-wrap" }}
            >
              {m.content}
            </div>
          ))}
          {loading && <p className="text-xs italic text-muted-foreground">pensando…</p>}
        </div>
        <div className="p-3 border-t border-border/40 flex gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && send()}
            placeholder="Pergunte ao agente…"
            className="flex-1 bg-background border border-border/50 rounded-full px-3 py-2 text-sm focus:outline-none focus:border-primary/40"
          />
          <button
            onClick={send}
            disabled={loading || !input.trim()}
            className="w-9 h-9 rounded-full flex items-center justify-center disabled:opacity-40"
            style={{ background: "hsl(var(--primary))", color: "hsl(var(--primary-foreground))" }}
          >
            <Send size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}
