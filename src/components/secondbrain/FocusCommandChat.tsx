import { useState, useRef, useEffect, useCallback, ReactNode } from "react";
import { ArrowUp, BookOpen, Flame, PenLine, Brain, Sparkles, X } from "lucide-react";
import { haptic } from "@/hooks/useHaptic";
import { toast } from "@/hooks/use-toast";

type Role = "user" | "assistant" | "panel";
interface Msg {
  role: Role;
  content?: string;
  panelKey?: FocusPanelKey;
}

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/study-chat`;

export type FocusPanelKey = "leitura" | "devocional" | "anotacoes" | "cerebro";

const QUICK_ACTIONS: { id: FocusPanelKey; label: string; icon: any; hint: string }[] = [
  { id: "leitura", label: "Leitura", icon: BookOpen, hint: "Plano bíblico" },
  { id: "devocional", label: "Devocional", icon: Flame, hint: "Meditação" },
  { id: "anotacoes", label: "Caderno", icon: PenLine, hint: "Notas & mapa" },
  { id: "cerebro", label: "Capturar", icon: Brain, hint: "Pensamento" },
];

const PANEL_META: Record<FocusPanelKey, { label: string; icon: any }> = {
  leitura: { label: "Leitura do dia", icon: BookOpen },
  devocional: { label: "Devocional", icon: Flame },
  anotacoes: { label: "Caderno & Mapa", icon: PenLine },
  cerebro: { label: "Segundo Cérebro", icon: Brain },
};

interface Props {
  /** Render the actual platform tab inline inside a chat balloon */
  renderPanel: (key: FocusPanelKey) => ReactNode;
  /** Notify parent which panel is currently focused so it can switch the underlying tab */
  onPanelFocus: (key: FocusPanelKey) => void;
}

const PALETTE = {
  bg: "#0B0F14",
  surface: "#11161D",
  border: "#1F2730",
  primary: "#00FF94",
  primarySoft: "#1DB954",
  text: "#E6EDF3",
  textDim: "#7A8A99",
};

/**
 * GPT-style command center: chat thread where panels (Leitura/Devocional/etc.)
 * appear inline as bubble cards (no overlay). Mobile-responsive.
 */
export default function FocusCommandChat({ renderPanel, onPanelFocus }: Props) {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const taRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" }); }, [messages]);

  const detectIntent = (text: string): FocusPanelKey | null => {
    const t = text.toLowerCase();
    if (/\b(ler|leitura|plano|bíbli|capítulo|cap[íi]tulo)\b/.test(t)) return "leitura";
    if (/\b(devocion|medita|orac|oração)\b/.test(t)) return "devocional";
    if (/\b(anota|caderno|nota|mapa mental|escrev)\b/.test(t)) return "anotacoes";
    if (/\b(captur|pensament|cérebro|cerebro|registr|ideia)\b/.test(t)) return "cerebro";
    return null;
  };

  const openPanelInChat = useCallback((key: FocusPanelKey) => {
    haptic("medium");
    onPanelFocus(key);
    setMessages(prev => {
      // Avoid duplicating the same panel back-to-back
      const last = prev[prev.length - 1];
      if (last?.role === "panel" && last.panelKey === key) return prev;
      return [...prev, { role: "panel", panelKey: key }];
    });
  }, [onPanelFocus]);

  const removePanel = (idx: number) => {
    setMessages(prev => prev.filter((_, i) => i !== idx));
  };

  const send = useCallback(async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || isLoading) return;

    const intent = detectIntent(trimmed);
    if (intent && trimmed.split(/\s+/).length <= 4) {
      openPanelInChat(intent);
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
      const onlyChat = next.filter(m => m.role !== "panel").map(m => ({ role: m.role, content: m.content || "" }));
      const resp = await fetch(CHAT_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ messages: onlyChat }),
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
  }, [messages, isLoading, openPanelInChat]);

  const onTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    e.target.style.height = "44px";
    e.target.style.height = Math.min(e.target.scrollHeight, 160) + "px";
  };

  const empty = messages.length === 0;

  return (
    <div className="h-full w-full flex flex-col" style={{ background: PALETTE.bg, color: PALETTE.text }}>
      {/* Thread (scrollable) */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden focus-thread">
        <div className="mx-auto w-full max-w-[680px] px-4 sm:px-6 py-6 pb-4">
          {empty ? (
            <div className="min-h-[60vh] flex flex-col items-center justify-center text-center">
              <div
                className="w-14 h-14 rounded-2xl flex items-center justify-center mb-5"
                style={{
                  background: PALETTE.surface,
                  border: `1px solid ${PALETTE.primary}55`,
                  boxShadow: `0 0 30px -8px ${PALETTE.primary}55`,
                }}
              >
                <Sparkles size={22} style={{ color: PALETTE.primary }} strokeWidth={2} />
              </div>
              <h2 className="text-[24px] sm:text-[30px] font-bold tracking-tight leading-tight mb-2"
                style={{ color: PALETTE.text }}>
                O que quer fazer agora?
              </h2>
              <p className="text-[13px] mb-7 max-w-md" style={{ color: PALETTE.textDim }}>
                Pergunte, peça uma exegese, ou abra qualquer modo. Tudo flui no mesmo chat.
              </p>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 w-full">
                {QUICK_ACTIONS.map(qa => {
                  const Icon = qa.icon;
                  return (
                    <button
                      key={qa.id}
                      onClick={() => openPanelInChat(qa.id)}
                      className="group flex flex-col items-start gap-2 p-3 rounded-xl text-left transition-all hover:scale-[1.03] active:scale-95"
                      style={{
                        background: PALETTE.surface,
                        border: `1px solid ${PALETTE.border}`,
                      }}
                    >
                      <div
                        className="w-7 h-7 rounded-lg flex items-center justify-center transition-all group-hover:shadow-lg"
                        style={{
                          background: `${PALETTE.primary}14`,
                          border: `1px solid ${PALETTE.primary}33`,
                          color: PALETTE.primary,
                        }}
                      >
                        <Icon size={14} />
                      </div>
                      <div>
                        <p className="text-[12px] font-bold leading-tight" style={{ color: PALETTE.text }}>{qa.label}</p>
                        <p className="text-[10px] leading-tight mt-0.5" style={{ color: PALETTE.textDim }}>{qa.hint}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {messages.map((m, i) => {
                if (m.role === "panel" && m.panelKey) {
                  const meta = PANEL_META[m.panelKey];
                  const Icon = meta.icon;
                  return (
                    <div
                      key={i}
                      className="rounded-2xl overflow-hidden focus-panel-bubble"
                      style={{
                        background: PALETTE.surface,
                        border: `1px solid ${PALETTE.primary}55`,
                        boxShadow: `0 0 0 1px ${PALETTE.primary}11, 0 12px 40px -12px ${PALETTE.primary}33`,
                      }}
                    >
                      <div
                        className="flex items-center gap-2 px-3 py-2 border-b"
                        style={{ borderColor: PALETTE.border, background: `linear-gradient(180deg, ${PALETTE.primary}0a, transparent)` }}
                      >
                        <div
                          className="w-6 h-6 rounded-md flex items-center justify-center shrink-0"
                          style={{ background: `${PALETTE.primary}14`, color: PALETTE.primary, border: `1px solid ${PALETTE.primary}33` }}
                        >
                          <Icon size={12} />
                        </div>
                        <span className="text-[11px] font-bold uppercase tracking-[1.5px] flex-1 truncate" style={{ color: PALETTE.primary }}>
                          {meta.label}
                        </span>
                        <button
                          onClick={() => removePanel(i)}
                          className="w-6 h-6 rounded-md flex items-center justify-center transition-colors"
                          style={{ color: PALETTE.textDim }}
                          aria-label="Fechar painel"
                        >
                          <X size={12} />
                        </button>
                      </div>
                      <div
                        className="bg-background"
                        style={{ height: "min(70vh, 560px)" }}
                        onMouseEnter={() => onPanelFocus(m.panelKey!)}
                      >
                        <div className="h-full w-full overflow-auto">
                          {renderPanel(m.panelKey)}
                        </div>
                      </div>
                    </div>
                  );
                }

                const isUser = m.role === "user";
                return (
                  <div key={i} className={`flex ${isUser ? "justify-end" : "justify-start"} focus-msg-enter`}>
                    <div
                      className="max-w-[85%] px-4 py-3 rounded-2xl text-[14px] leading-relaxed whitespace-pre-wrap"
                      style={{
                        background: isUser ? `${PALETTE.primary}14` : PALETTE.surface,
                        border: isUser ? `1px solid ${PALETTE.primary}44` : `1px solid ${PALETTE.border}`,
                        color: PALETTE.text,
                        fontFamily: !isUser ? "'Crimson Text', Georgia, serif" : undefined,
                      }}
                    >
                      {m.content}
                    </div>
                  </div>
                );
              })}
              {isLoading && messages[messages.length - 1]?.role !== "assistant" && (
                <div className="flex gap-1.5 px-4 py-3 rounded-2xl w-fit" style={{ background: PALETTE.surface, border: `1px solid ${PALETTE.border}` }}>
                  <span className="w-2 h-2 rounded-full animate-bounce" style={{ background: PALETTE.primary, animationDelay: "0ms" }} />
                  <span className="w-2 h-2 rounded-full animate-bounce" style={{ background: PALETTE.primary, animationDelay: "150ms" }} />
                  <span className="w-2 h-2 rounded-full animate-bounce" style={{ background: PALETTE.primary, animationDelay: "300ms" }} />
                </div>
              )}
              <div ref={endRef} />
            </div>
          )}
        </div>
      </div>

      {/* Composer (sticky bottom) */}
      <div
        className="shrink-0 px-3 sm:px-4 pt-2 pb-[max(env(safe-area-inset-bottom),12px)] border-t"
        style={{ background: PALETTE.bg, borderColor: PALETTE.border }}
      >
        <div className="mx-auto w-full max-w-[680px]">
          <div
            className="flex items-end gap-2 p-1.5 rounded-2xl transition-all"
            style={{
              background: PALETTE.surface,
              border: `1px solid ${PALETTE.border}`,
            }}
          >
            <textarea
              ref={taRef}
              value={input}
              onChange={onTextareaChange}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(input); } }}
              placeholder="O que quer fazer? Ex: 'leitura', 'exegese de João 1', 'capturar ideia'…"
              className="flex-1 resize-none bg-transparent border-none outline-none px-3 py-2.5 text-[14px] placeholder:opacity-40"
              style={{
                fontFamily: "'Crimson Text', Georgia, serif",
                color: PALETTE.text,
                height: "44px",
                maxHeight: "160px",
              }}
            />
            <button
              onClick={() => send(input)}
              disabled={isLoading || !input.trim()}
              className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-all hover:scale-105 active:scale-90 disabled:opacity-30 disabled:scale-100"
              style={{
                background: PALETTE.primary,
                color: PALETTE.bg,
                boxShadow: `0 4px 16px -4px ${PALETTE.primary}88`,
              }}
              aria-label="Enviar"
            >
              <ArrowUp size={17} strokeWidth={2.6} />
            </button>
          </div>
          <p className="text-[10px] text-center mt-1.5" style={{ color: PALETTE.textDim }}>
            Enter envia · Shift+Enter quebra linha
          </p>
        </div>
      </div>

      <style>{`
        .focus-thread::-webkit-scrollbar { width: 6px; }
        .focus-thread::-webkit-scrollbar-track { background: transparent; }
        .focus-thread::-webkit-scrollbar-thumb { background: ${PALETTE.border}; border-radius: 3px; }
        .focus-thread { scroll-behavior: smooth; }

        @keyframes focus-msg-in {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .focus-msg-enter { animation: focus-msg-in 0.28s ease-out; }

        @keyframes focus-panel-in {
          from { opacity: 0; transform: translateY(20px) scale(0.97); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        .focus-panel-bubble { animation: focus-panel-in 0.42s cubic-bezier(0.22, 1, 0.36, 1); transform-origin: top center; }
      `}</style>
    </div>
  );
}
