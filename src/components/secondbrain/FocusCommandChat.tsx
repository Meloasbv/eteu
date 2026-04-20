import { useState, useRef, useEffect, useCallback, ReactNode } from "react";
import { ArrowUp, BookOpen, Flame, PenLine, Brain, Sparkles, X, Maximize2, Minimize2 } from "lucide-react";
import { haptic } from "@/hooks/useHaptic";
import { toast } from "@/hooks/use-toast";

type Role = "user" | "assistant" | "tool";
interface Msg {
  role: Role;
  content?: string;
  panelKey?: FocusPanelKey;
  expanded?: boolean;
}

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/study-chat`;

export type FocusPanelKey = "leitura" | "devocional" | "anotacoes" | "cerebro";

const QUICK_ACTIONS: { id: FocusPanelKey; label: string; icon: any; hint: string }[] = [
  { id: "leitura", label: "Leitura", icon: BookOpen, hint: "Plano bíblico" },
  { id: "devocional", label: "Devocional", icon: Flame, hint: "Meditação" },
  { id: "anotacoes", label: "Caderno", icon: PenLine, hint: "Notas & mapa" },
  { id: "cerebro", label: "Capturar", icon: Brain, hint: "Pensamento" },
];

const PANEL_META: Record<FocusPanelKey, { label: string; icon: any; subtitle: string }> = {
  leitura: { label: "Leitura do dia", icon: BookOpen, subtitle: "Plano bíblico ativo" },
  devocional: { label: "Devocional", icon: Flame, subtitle: "Meditação guiada" },
  anotacoes: { label: "Caderno & Mapa", icon: PenLine, subtitle: "Workspace de estudo" },
  cerebro: { label: "Segundo Cérebro", icon: Brain, subtitle: "Captura de pensamentos" },
};

interface Props {
  /** Render the actual platform tab inline inside the conversation flow */
  renderPanel: (key: FocusPanelKey) => ReactNode;
  /** Notify parent which panel is currently focused so it can switch the underlying tab */
  onPanelFocus: (key: FocusPanelKey) => void;
}

const PALETTE = {
  bg: "#0B0F14",
  surface: "#11161D",
  surfaceLight: "#1A2129",
  border: "#1F2730",
  borderSoft: "#161C24",
  primary: "#00FF94",
  primarySoft: "#1DB954",
  text: "#E6EDF3",
  textDim: "#7A8A99",
  textFaint: "#4A5868",
};

/**
 * Chat-native spiritual workspace.
 * Tools open as inline artifact blocks in the conversation stream — never as
 * detached cards or modals. Two states per tool: compact / expanded.
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

  const openToolInChat = useCallback((key: FocusPanelKey) => {
    haptic("medium");
    onPanelFocus(key);
    setMessages(prev => {
      const last = prev[prev.length - 1];
      if (last?.role === "tool" && last.panelKey === key) return prev;
      return [...prev, { role: "tool", panelKey: key, expanded: false }];
    });
  }, [onPanelFocus]);

  const removeTool = (idx: number) => {
    setMessages(prev => prev.filter((_, i) => i !== idx));
  };

  const toggleExpand = (idx: number) => {
    haptic("light");
    setMessages(prev => prev.map((m, i) => i === idx ? { ...m, expanded: !m.expanded } : m));
  };

  const send = useCallback(async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || isLoading) return;

    const intent = detectIntent(trimmed);
    if (intent && trimmed.split(/\s+/).length <= 4) {
      openToolInChat(intent);
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
      const onlyChat = next.filter(m => m.role !== "tool").map(m => ({ role: m.role, content: m.content || "" }));
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
  }, [messages, isLoading, openToolInChat]);

  const onTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    e.target.style.height = "44px";
    e.target.style.height = Math.min(e.target.scrollHeight, 160) + "px";
  };

  const empty = messages.length === 0;

  return (
    <div className="h-full w-full flex flex-col" style={{ background: PALETTE.bg, color: PALETTE.text }}>
      {/* Conversation stream (scrollable) */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden focus-thread">
        <div className="mx-auto w-full max-w-[760px] px-4 sm:px-8 py-8 pb-6">
          {empty ? (
            <div className="min-h-[60vh] flex flex-col items-center justify-center text-center">
              <div
                className="w-12 h-12 rounded-2xl flex items-center justify-center mb-6"
                style={{
                  background: PALETTE.surface,
                  border: `1px solid ${PALETTE.primary}33`,
                  boxShadow: `0 0 24px -10px ${PALETTE.primary}66`,
                }}
              >
                <Sparkles size={20} style={{ color: PALETTE.primary }} strokeWidth={2} />
              </div>
              <h2 className="text-[26px] sm:text-[32px] font-bold tracking-tight leading-tight mb-2"
                style={{ color: PALETTE.text, fontFamily: "'Crimson Text', Georgia, serif" }}>
                O que quer fazer agora?
              </h2>
              <p className="text-[13px] mb-8 max-w-md leading-relaxed" style={{ color: PALETTE.textDim }}>
                Pergunte, peça uma exegese, ou abra qualquer ferramenta — tudo flui inline neste mesmo espaço.
              </p>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 w-full">
                {QUICK_ACTIONS.map(qa => {
                  const Icon = qa.icon;
                  return (
                    <button
                      key={qa.id}
                      onClick={() => openToolInChat(qa.id)}
                      className="group flex flex-col items-start gap-2 p-3 rounded-xl text-left transition-all hover:translate-y-[-2px] active:scale-95"
                      style={{
                        background: PALETTE.surface,
                        border: `1px solid ${PALETTE.borderSoft}`,
                      }}
                    >
                      <div
                        className="w-7 h-7 rounded-lg flex items-center justify-center transition-all group-hover:shadow-lg"
                        style={{
                          background: `${PALETTE.primary}10`,
                          border: `1px solid ${PALETTE.primary}22`,
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
            <div className="space-y-6">
              {messages.map((m, i) => {
                /* ── INLINE TOOL ARTIFACT ─────────────────────────────────
                   Renders flush with the conversation stream. No bubble
                   chrome, no centered card, no detached panel.            */
                if (m.role === "tool" && m.panelKey) {
                  const meta = PANEL_META[m.panelKey];
                  const Icon = meta.icon;
                  const expanded = !!m.expanded;
                  return (
                    <div key={i} className="focus-tool-enter" onMouseEnter={() => onPanelFocus(m.panelKey!)}>
                      {/* Slim header strip — no card, just a label row */}
                      <div className="flex items-center gap-2.5 mb-2 px-1">
                        <div
                          className="w-5 h-5 rounded-md flex items-center justify-center shrink-0"
                          style={{ background: `${PALETTE.primary}10`, color: PALETTE.primary }}
                        >
                          <Icon size={11} strokeWidth={2.2} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[11px] font-bold uppercase tracking-[1.5px] leading-none" style={{ color: PALETTE.primary }}>
                            {meta.label}
                          </p>
                          <p className="text-[10px] mt-0.5 leading-none" style={{ color: PALETTE.textFaint }}>
                            {meta.subtitle}
                          </p>
                        </div>
                        <button
                          onClick={() => toggleExpand(i)}
                          className="w-7 h-7 rounded-md flex items-center justify-center transition-colors hover:bg-white/5"
                          style={{ color: PALETTE.textDim }}
                          aria-label={expanded ? "Recolher" : "Expandir"}
                          title={expanded ? "Modo compacto" : "Expandir workspace"}
                        >
                          {expanded ? <Minimize2 size={12} /> : <Maximize2 size={12} />}
                        </button>
                        <button
                          onClick={() => removeTool(i)}
                          className="w-7 h-7 rounded-md flex items-center justify-center transition-colors hover:bg-white/5"
                          style={{ color: PALETTE.textDim }}
                          aria-label="Fechar ferramenta"
                        >
                          <X size={12} />
                        </button>
                      </div>

                      {/* Tool body — flush, native, no border, smooth height transition */}
                      <div
                        className="rounded-xl overflow-hidden bg-background focus-tool-body"
                        style={{
                          height: expanded ? "min(82vh, 720px)" : "min(48vh, 420px)",
                          border: `1px solid ${PALETTE.borderSoft}`,
                          transition: "height 0.42s cubic-bezier(0.22, 1, 0.36, 1)",
                        }}
                      >
                        <div className="h-full w-full overflow-auto">
                          {renderPanel(m.panelKey)}
                        </div>
                      </div>
                    </div>
                  );
                }

                /* ── CHAT MESSAGE ──────────────────────────────────────── */
                const isUser = m.role === "user";
                if (isUser) {
                  return (
                    <div key={i} className="flex justify-end focus-msg-enter">
                      <div
                        className="max-w-[85%] px-4 py-2.5 rounded-2xl text-[14px] leading-relaxed whitespace-pre-wrap"
                        style={{
                          background: `${PALETTE.primary}10`,
                          border: `1px solid ${PALETTE.primary}26`,
                          color: PALETTE.text,
                        }}
                      >
                        {m.content}
                      </div>
                    </div>
                  );
                }
                /* Assistant — flush text, no bubble chrome, native to the stream */
                return (
                  <div key={i} className="focus-msg-enter">
                    <div className="flex items-center gap-2 mb-1.5 px-0.5">
                      <div className="w-4 h-4 rounded-md flex items-center justify-center" style={{ background: `${PALETTE.primary}14`, color: PALETTE.primary }}>
                        <Sparkles size={9} strokeWidth={2.4} />
                      </div>
                      <p className="text-[10px] font-bold uppercase tracking-[1.4px]" style={{ color: PALETTE.textDim }}>Assistente</p>
                    </div>
                    <div
                      className="text-[15px] leading-[1.75] whitespace-pre-wrap pl-6"
                      style={{ color: PALETTE.text, fontFamily: "'Crimson Text', Georgia, serif" }}
                    >
                      {m.content}
                    </div>
                  </div>
                );
              })}
              {isLoading && messages[messages.length - 1]?.role !== "assistant" && (
                <div className="flex gap-1.5 pl-6 focus-msg-enter">
                  <span className="w-1.5 h-1.5 rounded-full animate-bounce" style={{ background: PALETTE.primary, animationDelay: "0ms" }} />
                  <span className="w-1.5 h-1.5 rounded-full animate-bounce" style={{ background: PALETTE.primary, animationDelay: "150ms" }} />
                  <span className="w-1.5 h-1.5 rounded-full animate-bounce" style={{ background: PALETTE.primary, animationDelay: "300ms" }} />
                </div>
              )}
              <div ref={endRef} />
            </div>
          )}
        </div>
      </div>

      {/* Composer (sticky bottom) */}
      <div
        className="shrink-0 px-3 sm:px-6 pt-2 pb-[max(env(safe-area-inset-bottom),12px)]"
        style={{ background: PALETTE.bg }}
      >
        <div className="mx-auto w-full max-w-[760px]">
          <div
            className="flex items-end gap-2 p-1.5 rounded-2xl transition-all focus-composer"
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
          <p className="text-[10px] text-center mt-1.5" style={{ color: PALETTE.textFaint }}>
            Enter envia · Shift+Enter quebra linha · Tudo abre inline
          </p>
        </div>
      </div>

      <style>{`
        .focus-thread::-webkit-scrollbar { width: 6px; }
        .focus-thread::-webkit-scrollbar-track { background: transparent; }
        .focus-thread::-webkit-scrollbar-thumb { background: ${PALETTE.border}; border-radius: 3px; }
        .focus-thread { scroll-behavior: smooth; }

        .focus-composer:focus-within {
          border-color: ${PALETTE.primary}55 !important;
          box-shadow: 0 0 0 3px ${PALETTE.primary}11;
        }

        @keyframes focus-msg-in {
          from { opacity: 0; transform: translateY(6px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .focus-msg-enter { animation: focus-msg-in 0.32s cubic-bezier(0.22, 1, 0.36, 1); }

        @keyframes focus-tool-in {
          from { opacity: 0; transform: translateY(14px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .focus-tool-enter { animation: focus-tool-in 0.48s cubic-bezier(0.22, 1, 0.36, 1); }
      `}</style>
    </div>
  );
}
