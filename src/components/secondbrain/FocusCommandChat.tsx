import { useState, useRef, useEffect, useCallback } from "react";
import { ArrowUp, BookOpen, Flame, PenLine, Brain, Sparkles } from "lucide-react";
import { haptic } from "@/hooks/useHaptic";
import { toast } from "@/hooks/use-toast";
import { routeIntent, LOADING_MESSAGES, type FocusIntent } from "@/lib/focusIntent";
import ArtifactRenderer from "./artifacts/ArtifactRenderer";
import type { FocusMsg, ArtifactPayload } from "./artifacts/types";
import { computeTodayReading, greetingByHour } from "@/lib/readingPlan";
import { findRecentSession, createSession, updateSession } from "@/lib/focusSession";

export type FocusPanelKey = "leitura" | "devocional" | "anotacoes" | "cerebro";

const QUICK_ACTIONS: { id: string; label: string; icon: any; hint: string; cmd: string; capture?: boolean }[] = [
  { id: "leitura", label: "Leitura", icon: BookOpen, hint: "Plano bíblico", cmd: "leitura de hoje" },
  { id: "devocional", label: "Devocional", icon: Flame, hint: "Meditação", cmd: "devocional do dia" },
  { id: "anotacoes", label: "Caderno", icon: PenLine, hint: "Notas & mapa", cmd: "meus mapas mentais" },
  { id: "cerebro", label: "Capturar", icon: Brain, hint: "Pensamento", cmd: "", capture: true },
];

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

interface DevDay {
  day: string;
  ref: string;
  verseText?: string;
  summary?: string;
}
interface DevWeek {
  period: string;
  days: DevDay[];
}

interface Props {
  userCodeId: string;
  weeks: any[];
  devotionals?: DevWeek[];
}

function findDevotionalForToday(devotionals: DevWeek[] | undefined, dayName: string): (DevDay & { period: string }) | null {
  if (!devotionals || devotionals.length === 0) return null;
  // Try matching by current weekday name first across all weeks (closest period)
  const now = Date.now();
  // Heuristic: pick the week whose period range contains today's date if parseable
  for (const w of devotionals) {
    const m = w.period.match(/(\d{2})\/(\d{2})\s*a\s*(\d{2})\/(\d{2})/);
    if (!m) continue;
    const [_, sd, sm, ed, em] = m;
    const year = new Date().getFullYear();
    const start = new Date(year, parseInt(sm) - 1, parseInt(sd)).getTime();
    const end = new Date(year, parseInt(em) - 1, parseInt(ed), 23, 59).getTime();
    if (now >= start && now <= end) {
      const day = w.days.find((d) => d.day.toLowerCase() === dayName.toLowerCase()) ?? w.days[0];
      return { ...day, period: w.period };
    }
  }
  // Fallback: most recent period's matching weekday
  const last = devotionals[devotionals.length - 1];
  const day = last.days.find((d) => d.day.toLowerCase() === dayName.toLowerCase()) ?? last.days[0];
  return { ...day, period: last.period };
}

let MSG_ID = 0;
const newId = () => `m_${Date.now()}_${++MSG_ID}`;

/**
 * Chat-native artifact hub. Each user message is routed to an intent and
 * responded to with an inline interactive artifact card.
 */
export default function FocusCommandChat({ userCodeId, weeks, devotionals }: Props) {
  const [messages, setMessages] = useState<FocusMsg[]>([]);
  const [input, setInput] = useState("");
  const [captureMode, setCaptureMode] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const taRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages]);

  // Bootstrap: restore recent session (<2h) OR seed welcome + create new session
  const bootstrappedRef = useRef(false);
  useEffect(() => {
    if (bootstrappedRef.current) return;
    if (!userCodeId) return;
    bootstrappedRef.current = true;

    (async () => {
      const recent = await findRecentSession(userCodeId);
      if (recent && Array.isArray(recent.messages) && recent.messages.length > 0) {
        setMessages(recent.messages);
        setSessionId(recent.id);
        return;
      }
      const today = computeTodayReading(weeks);
      const greeting = greetingByHour();
      const reads = today.readings.length ? today.readings.join(", ") : "descanso";
      const initial: FocusMsg[] = [
        {
          id: newId(),
          role: "assistant",
          text: `${greeting}. Sua leitura de hoje é ${reads}. Semana ${today.weekNum}.`,
          artifact: { type: "reading", data: today },
          timestamp: Date.now(),
        },
      ];
      setMessages(initial);
      const newSessionId = await createSession(userCodeId, initial);
      if (newSessionId) setSessionId(newSessionId);
    })();
  }, [userCodeId, weeks]);

  // Debounced persistence: write messages every ~1.2s after change
  useEffect(() => {
    if (!sessionId || messages.length === 0) return;
    const t = setTimeout(() => {
      updateSession(sessionId, messages);
    }, 1200);
    return () => clearTimeout(t);
  }, [sessionId, messages]);

  const replaceArtifact = useCallback((id: string, artifact: ArtifactPayload, text?: string) => {
    setMessages((prev) => prev.map((m) => (m.id === id ? { ...m, artifact, text: text ?? m.text } : m)));
  }, []);

  const handleIntent = useCallback(
    async (raw: string, forceCapture = false) => {
      if (!raw.trim() || isLoading) return;
      haptic("light");

      const userMsg: FocusMsg = { id: newId(), role: "user", text: raw, timestamp: Date.now() };
      setMessages((prev) => [...prev, userMsg]);
      setIsLoading(true);

      try {
        const result = forceCapture
          ? {
              intent: "cerebro" as FocusIntent,
              params: { action: "capture", content: raw },
              response_text: "Registrado.",
            }
          : await routeIntent(raw);

        const placeholderId = newId();
        const loadingArt: ArtifactPayload = {
          type: "loading",
          data: { message: LOADING_MESSAGES[result.intent] || "Processando..." },
        };

        // Resolve final artifact synchronously when possible
        let finalArtifact: ArtifactPayload | null = null;
        let assistantText = result.response_text || "";

        switch (result.intent) {
          case "leitura": {
            const today = computeTodayReading(weeks);
            finalArtifact = { type: "reading", data: today };
            if (!assistantText) assistantText = `Sua leitura de ${today.day}, semana ${today.weekNum}.`;
            break;
          }
          case "cerebro": {
            const content = result.params?.content || raw;
            finalArtifact = {
              type: "brain_capture",
              data: { content, loading: true },
            };
            if (!assistantText) assistantText = "Registrei. Analisando...";
            break;
          }
          case "exegese": {
            const ref = result.params?.reference || raw;
            finalArtifact = {
              type: "exegese",
              data: { reference: ref, loading: true },
            };
            if (!assistantText) assistantText = `Análise de ${ref}.`;
            break;
          }
          case "versiculo": {
            const ref = result.params?.reference || raw;
            finalArtifact = { type: "verse", data: { reference: ref } };
            if (!assistantText) assistantText = `Aqui está ${ref}.`;
            break;
          }
          case "devocional": {
            const today = computeTodayReading(weeks);
            const dev = findDevotionalForToday(devotionals, today.day);
            finalArtifact = {
              type: "devotional_today",
              data: dev
                ? {
                    ref: dev.ref,
                    verseText: dev.verseText,
                    summary: dev.summary,
                    day: dev.day,
                    period: dev.period,
                  }
                : { day: today.day },
            };
            if (!assistantText) assistantText = "Sua reflexão de hoje:";
            break;
          }
          case "nota": {
            const content = result.params?.content || raw;
            finalArtifact = { type: "note_saved", data: { content } };
            if (!assistantText) assistantText = "Salvei sua nota.";
            break;
          }
          case "mapa_mental": {
            const action = result.params?.action;
            const topic = result.params?.topic;
            if (action === "open" || (action === "preview" && topic)) {
              finalArtifact = { type: "mindmap_preview", data: { title: topic } };
              if (!assistantText) assistantText = `Mapa: ${topic ?? "selecionado"}.`;
            } else {
              finalArtifact = { type: "mindmap_list", data: { topic } };
              if (!assistantText) assistantText = "Seus mapas mentais:";
            }
            break;
          }
          case "timer": {
            finalArtifact = { type: "timer", data: { action: result.params?.action ?? "show" } };
            if (!assistantText) assistantText = result.response_text || "Controles do Pomodoro:";
            break;
          }
          case "saudacao": {
            finalArtifact = {
              type: "answer",
              data: {
                question: raw,
                answer:
                  "Olá! Estou aqui para te ajudar com leitura, devocional, exegese, captura de pensamentos e mais. O que vamos estudar?",
              },
            };
            assistantText = "";
            break;
          }
          case "pergunta":
          default: {
            const question = result.params?.question || result.params?.content || raw;
            finalArtifact = { type: "answer", data: { question } };
            if (!assistantText) assistantText = "Refletindo...";
            break;
          }
        }

        // If we have a final artifact, push it directly (artifacts manage their own loading)
        if (finalArtifact) {
          setMessages((prev) => [
            ...prev,
            {
              id: placeholderId,
              role: "assistant",
              text: assistantText,
              artifact: finalArtifact!,
              timestamp: Date.now(),
            },
          ]);
        } else {
          setMessages((prev) => [
            ...prev,
            { id: placeholderId, role: "assistant", text: assistantText, timestamp: Date.now() },
          ]);
        }
      } catch (e: any) {
        console.error("intent handling failed:", e);
        toast({ title: "Erro", description: e?.message ?? "Falhou", variant: "destructive" });
      } finally {
        setIsLoading(false);
      }
    },
    [isLoading, weeks, replaceArtifact],
  );

  const sendAsUser = useCallback(
    (text: string) => {
      // If empty (capture chip), just focus the input with capture mode
      if (!text) {
        setCaptureMode(true);
        taRef.current?.focus();
        return;
      }
      handleIntent(text);
    },
    [handleIntent],
  );

  const submit = useCallback(() => {
    const v = input.trim();
    if (!v) return;
    setInput("");
    if (taRef.current) taRef.current.style.height = "44px";
    handleIntent(v, captureMode);
    setCaptureMode(false);
  }, [input, captureMode, handleIntent]);

  const onTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    e.target.style.height = "44px";
    e.target.style.height = Math.min(e.target.scrollHeight, 160) + "px";
  };

  const placeholder = captureMode
    ? "O que está na sua mente?"
    : "O que quer fazer? Ex: 'leitura', 'exegese de João 1', 'capturar: ...'";

  return (
    <div className="h-full w-full flex flex-col" style={{ background: PALETTE.bg, color: PALETTE.text }}>
      <div className="flex-1 overflow-y-auto overflow-x-hidden focus-thread">
        <div className="mx-auto w-full max-w-[760px] px-4 sm:px-8 py-8 pb-6">
          {/* Quick actions only when there's just the welcome msg */}
          {messages.length <= 1 && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-6">
              {QUICK_ACTIONS.map((qa) => {
                const Icon = qa.icon;
                return (
                  <button
                    key={qa.id}
                    onClick={() => (qa.capture ? sendAsUser("") : sendAsUser(qa.cmd))}
                    className="group flex flex-col items-start gap-2 p-3 rounded-xl text-left transition-all hover:translate-y-[-2px] active:scale-95"
                    style={{ background: PALETTE.surface, border: `1px solid ${PALETTE.borderSoft}` }}
                  >
                    <div
                      className="w-7 h-7 rounded-lg flex items-center justify-center"
                      style={{ background: `${PALETTE.primary}10`, border: `1px solid ${PALETTE.primary}22`, color: PALETTE.primary }}
                    >
                      <Icon size={14} />
                    </div>
                    <div>
                      <p className="text-[12px] font-bold leading-tight" style={{ color: PALETTE.text }}>
                        {qa.label}
                      </p>
                      <p className="text-[10px] leading-tight mt-0.5" style={{ color: PALETTE.textDim }}>
                        {qa.hint}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          <div className="space-y-6">
            {messages.map((m) => {
              if (m.role === "user") {
                return (
                  <div key={m.id} className="flex justify-end focus-msg-enter">
                    <div
                      className="max-w-[85%] px-4 py-2.5 rounded-2xl text-[14px] leading-relaxed whitespace-pre-wrap"
                      style={{
                        background: `${PALETTE.primary}10`,
                        border: `1px solid ${PALETTE.primary}26`,
                        color: PALETTE.text,
                      }}
                    >
                      {m.text}
                    </div>
                  </div>
                );
              }

              return (
                <div key={m.id} className="focus-msg-enter space-y-3">
                  {m.text && (
                    <>
                      <div className="flex items-center gap-2 mb-1.5 px-0.5">
                        <div className="w-4 h-4 rounded-md flex items-center justify-center" style={{ background: `${PALETTE.primary}14`, color: PALETTE.primary }}>
                          <Sparkles size={9} strokeWidth={2.4} />
                        </div>
                        <p className="text-[10px] font-bold uppercase tracking-[1.4px]" style={{ color: PALETTE.textDim }}>
                          Assistente
                        </p>
                      </div>
                      <div
                        className="text-[15px] leading-[1.75] whitespace-pre-wrap pl-6"
                        style={{ color: PALETTE.text, fontFamily: "'Crimson Text', Georgia, serif" }}
                      >
                        {m.text}
                      </div>
                    </>
                  )}
                  {m.artifact && (
                    <div className="pl-6">
                      <ArtifactRenderer artifact={m.artifact} userCodeId={userCodeId} sendAsUser={sendAsUser} />
                    </div>
                  )}
                </div>
              );
            })}
            {isLoading && (
              <div className="flex gap-1.5 pl-6 focus-msg-enter">
                <span className="w-1.5 h-1.5 rounded-full animate-bounce" style={{ background: PALETTE.primary, animationDelay: "0ms" }} />
                <span className="w-1.5 h-1.5 rounded-full animate-bounce" style={{ background: PALETTE.primary, animationDelay: "150ms" }} />
                <span className="w-1.5 h-1.5 rounded-full animate-bounce" style={{ background: PALETTE.primary, animationDelay: "300ms" }} />
              </div>
            )}
            <div ref={endRef} />
          </div>
        </div>
      </div>

      {/* Composer */}
      <div className="shrink-0 px-3 sm:px-6 pt-2 pb-[max(env(safe-area-inset-bottom),12px)]" style={{ background: PALETTE.bg }}>
        <div className="mx-auto w-full max-w-[760px]">
          {captureMode && (
            <div className="mb-1.5 flex items-center gap-2 px-2">
              <Brain size={11} style={{ color: PALETTE.primary }} />
              <p className="text-[10px] font-bold uppercase tracking-[1.5px]" style={{ color: PALETTE.primary }}>
                Modo captura
              </p>
              <button
                onClick={() => setCaptureMode(false)}
                className="text-[10px] underline ml-auto"
                style={{ color: PALETTE.textFaint }}
              >
                cancelar
              </button>
            </div>
          )}
          <div
            className="flex items-end gap-2 p-1.5 rounded-2xl transition-all focus-composer"
            style={{
              background: PALETTE.surface,
              border: `1px solid ${captureMode ? PALETTE.primary + "55" : PALETTE.border}`,
            }}
          >
            <textarea
              ref={taRef}
              value={input}
              onChange={onTextareaChange}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  submit();
                }
              }}
              placeholder={placeholder}
              className="flex-1 resize-none bg-transparent border-none outline-none px-3 py-2.5 text-[14px] placeholder:opacity-40"
              style={{
                fontFamily: "'Crimson Text', Georgia, serif",
                color: PALETTE.text,
                height: "44px",
                maxHeight: "160px",
              }}
            />
            <button
              onClick={submit}
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
            Enter envia · Shift+Enter quebra linha · Tudo flui no chat
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

        @keyframes focusMsgIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        .focus-msg-enter { animation: focusMsgIn 0.32s cubic-bezier(0.22, 1, 0.36, 1); }

        @keyframes focusArtifactIn { from { opacity: 0; transform: translateY(10px) scale(0.985); } to { opacity: 1; transform: translateY(0) scale(1); } }
        .focus-artifact-enter { animation: focusArtifactIn 0.36s cubic-bezier(0.22, 1, 0.36, 1); }
      `}</style>
    </div>
  );
}
