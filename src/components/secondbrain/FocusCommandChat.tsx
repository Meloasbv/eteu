import { useState, useRef, useEffect, useCallback } from "react";
import { Send, BookOpen, Flame, PenLine, Brain, Sparkles, ArrowUp } from "lucide-react";
import { haptic } from "@/hooks/useHaptic";
import { toast } from "@/hooks/use-toast";

interface Msg { role: "user" | "assistant"; content: string }

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/study-chat`;

const QUICK_ACTIONS = [
  { id: "leitura", label: "Leitura do dia", icon: BookOpen, hint: "Abrir o plano bíblico em painel" },
  { id: "devocional", label: "Devocional", icon: Flame, hint: "Meditar com VerseReader" },
  { id: "anotacoes", label: "Caderno", icon: PenLine, hint: "Notas & mapa mental" },
  { id: "cerebro", label: "Capturar pensamento", icon: Brain, hint: "Adicionar ao Segundo Cérebro" },
] as const;

export type FocusPanelKey = "leitura" | "devocional" | "anotacoes" | "cerebro";

interface Props {
  accent: string;
  onOpenPanel: (key: FocusPanelKey) => void;
}

/**
 * GPT-style command center for the Focus Workspace.
 * "O que quer fazer?" — accepts free chat OR quick actions that open floating panels.
 */
export default function FocusCommandChat({ accent, onOpenPanel }: Props) {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const taRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  const detectIntent = (text: string): FocusPanelKey | null => {
    const t = text.toLowerCase();
    if (/\b(ler|leitura|plano|bíbli|capítulo|cap[íi]tulo)\b/.test(t)) return "leitura";
    if (/\b(devocion|medita|orac|oração)\b/.test(t)) return "devocional";
    if (/\b(anota|caderno|nota|mapa mental|estudo)\b/.test(t)) return "anotacoes";
    if (/\b(captur|pensament|cérebro|cerebro|registr)\b/.test(t)) return "cerebro";
    return null;
  };

  const send = useCallback(async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || isLoading) return;

    // Quick intent shortcut → open panel directly
    const intent = detectIntent(trimmed);
    if (intent && trimmed.split(/\s+/).length <= 4) {
      haptic("medium");
      onOpenPanel(intent);
      setInput("");
      if (taRef.current) taRef.current.style.height = "44px";
      return;
    }

    const userMsg: Msg = { role: "user", content: trimmed };
    const next = [...messages, userMsg];
    setMessages(next);
    setInput("");
    setIsLoading(true);
    if (taRef.current) taRef.current.style.height = "44px";

    let so_far = "";
    const upsert = (chunk: string) => {
      so_far += chunk;
      setMessages(prev => {
        const last = prev[prev.length - 1];
        if (last?.role === "assistant") return prev.map((m, i) => i === prev.length - 1 ? { ...m, content: so_far } : m);
        return [...prev, { role: "assistant", content: so_far }];
      });
    };

    try {
      const resp = await fetch(CHAT_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ messages: next }),
      });
      if (!resp.ok || !resp.body) throw new Error("Falha no assistente");
      const reader = resp.body.getReader();
      const dec = new TextDecoder();
      let buf = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += dec.decode(value, { stream: true });
        let nl;
        while ((nl = buf.indexOf("\n")) !== -1) {
          let line = buf.slice(0, nl); buf = buf.slice(nl + 1);
          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (!line.startsWith("data: ")) continue;
          const j = line.slice(6).trim();
          if (j === "[DONE]") break;
          try {
            const p = JSON.parse(j);
            const c = p.choices?.[0]?.delta?.content;
            if (c) upsert(c);
          } catch {
            buf = line + "\n" + buf;
            break;
          }
        }
      }
    } catch (e: any) {
      toast({ title: "Erro no assistente", description: e.message, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  }, [messages, isLoading, onOpenPanel]);

  const onTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    e.target.style.height = "44px";
    e.target.style.height = Math.min(e.target.scrollHeight, 160) + "px";
  };

  return (
    <div className="h-full w-full flex flex-col items-center justify-end px-4 sm:px-8 pb-6">
      {/* Hero greeting + quick actions (only when empty) */}
      {messages.length === 0 ? (
        <div className="flex-1 w-full max-w-2xl flex flex-col items-center justify-center text-center animate-fade-in">
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center mb-5"
            style={{
              background: `${accent}22`,
              border: `1px solid ${accent}55`,
              boxShadow: `0 0 40px -8px ${accent}88`,
            }}
          >
            <Sparkles size={22} style={{ color: accent }} strokeWidth={2} />
          </div>
          <h2 className="text-[26px] sm:text-[34px] font-bold tracking-tight leading-tight mb-2 text-white/95"
            style={{ fontFamily: "var(--font-display, 'Cinzel'), serif" }}>
            O que quer fazer agora?
          </h2>
          <p className="text-[13px] text-white/55 max-w-md mb-8">
            Pergunte, peça uma exegese, ou abra qualquer modo de estudo. Tudo num só lugar, sem sair do foco.
          </p>

          {/* Quick action chips */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 w-full max-w-2xl">
            {QUICK_ACTIONS.map(qa => {
              const Icon = qa.icon;
              return (
                <button
                  key={qa.id}
                  onClick={() => { haptic("light"); onOpenPanel(qa.id as FocusPanelKey); }}
                  className="group relative flex flex-col items-start gap-2 p-3.5 rounded-2xl backdrop-blur-md text-left transition-all hover:scale-[1.03] active:scale-95"
                  style={{
                    background: "rgba(255,255,255,0.04)",
                    border: `1px solid ${accent}33`,
                  }}
                >
                  <div
                    className="w-8 h-8 rounded-xl flex items-center justify-center transition-all group-hover:scale-110"
                    style={{ background: `${accent}22`, border: `1px solid ${accent}55` }}
                  >
                    <Icon size={15} style={{ color: accent }} />
                  </div>
                  <div>
                    <p className="text-[12px] font-bold text-white/95 leading-tight">{qa.label}</p>
                    <p className="text-[10px] text-white/50 leading-tight mt-0.5">{qa.hint}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      ) : (
        // Conversation thread
        <div className="flex-1 w-full max-w-2xl overflow-y-auto py-6 space-y-5 no-scrollbar">
          {messages.map((m, i) => (
            <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"} animate-fade-in`}>
              <div
                className="max-w-[85%] px-4 py-3 rounded-2xl text-[14px] leading-relaxed whitespace-pre-wrap"
                style={{
                  background: m.role === "user" ? `${accent}28` : "rgba(255,255,255,0.06)",
                  border: m.role === "user" ? `1px solid ${accent}55` : "1px solid rgba(255,255,255,0.08)",
                  color: m.role === "user" ? "white" : "rgba(255,255,255,0.92)",
                  fontFamily: m.role === "assistant" ? "'Crimson Text', Georgia, serif" : undefined,
                }}
              >
                {m.content || (isLoading && m.role === "assistant" ? "…" : "")}
              </div>
            </div>
          ))}
          {isLoading && messages[messages.length - 1]?.role !== "assistant" && (
            <div className="flex gap-1.5 px-4 py-3 rounded-2xl max-w-[80px]" style={{ background: "rgba(255,255,255,0.06)" }}>
              <span className="w-2 h-2 rounded-full animate-bounce" style={{ background: accent, animationDelay: "0ms" }} />
              <span className="w-2 h-2 rounded-full animate-bounce" style={{ background: accent, animationDelay: "150ms" }} />
              <span className="w-2 h-2 rounded-full animate-bounce" style={{ background: accent, animationDelay: "300ms" }} />
            </div>
          )}
          <div ref={endRef} />
        </div>
      )}

      {/* Composer */}
      <div className="w-full max-w-2xl shrink-0">
        <div
          className="flex items-end gap-2 p-2 rounded-3xl backdrop-blur-2xl transition-all"
          style={{
            background: "rgba(255,255,255,0.05)",
            border: `1px solid ${accent}44`,
            boxShadow: `0 12px 40px -12px ${accent}55`,
          }}
        >
          <textarea
            ref={taRef}
            value={input}
            onChange={onTextareaChange}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(input); } }}
            placeholder="O que quer fazer? Ex: 'abrir leitura', 'exegese de João 1', 'capturar ideia'…"
            className="flex-1 resize-none bg-transparent border-none outline-none px-3 py-2.5 text-[14px] text-white/95 placeholder:text-white/30"
            style={{
              fontFamily: "'Crimson Text', Georgia, serif",
              height: "44px", maxHeight: "160px",
            }}
          />
          <button
            onClick={() => send(input)}
            disabled={isLoading || !input.trim()}
            className="w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 transition-all hover:scale-105 active:scale-90 disabled:opacity-30 disabled:scale-100"
            style={{ background: accent, color: "#0a0612", boxShadow: `0 4px 20px -4px ${accent}` }}
            aria-label="Enviar"
          >
            <ArrowUp size={17} strokeWidth={2.6} />
          </button>
        </div>
        <p className="text-[10px] text-center text-white/30 mt-2">
          Enter envia · Shift+Enter quebra linha · Ações rápidas abrem painéis flutuantes
        </p>
      </div>
    </div>
  );
}
