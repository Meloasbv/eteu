import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import ReactMarkdown from "react-markdown";
import {
  X, Check, ChevronUp, Volume2, VolumeX, Maximize2, Minimize2,
  BookOpen, Sparkles, Loader2,
} from "lucide-react";

interface Props {
  weekIdx: number;
  dayIdx: number;
  dayName: string;
  readings: string[];
  isDone: boolean;
  onToggleDone: () => void;
  onClose: () => void;
  contextText?: string;
  onFetchContext?: () => void;
  contextLoading?: boolean;
}

export default function ReadingFocusView({
  weekIdx, dayIdx, dayName, readings, isDone, onToggleDone, onClose,
  contextText, onFetchContext, contextLoading,
}: Props) {
  const [bibleText, setBibleText] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [speaking, setSpeaking] = useState(false);
  const [ttsSpeed, setTtsSpeed] = useState(1);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [showContext, setShowContext] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);

  // Fetch Bible text via edge function
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    setBibleText("");

    (async () => {
      try {
        const { data, error: fnError } = await supabase.functions.invoke("fetch-reading-text", {
          body: { readings },
        });
        if (cancelled) return;
        if (fnError) throw fnError;
        if (data?.error) {
          setError(data.error);
        } else {
          setBibleText(data?.result || "Texto não disponível.");
        }
      } catch (e: any) {
        if (!cancelled) setError(e?.message || "Erro ao carregar texto bíblico.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [readings]);

  // Track scroll progress
  useEffect(() => {
    const el = contentRef.current;
    if (!el) return;
    const onScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = el;
      setScrollProgress(scrollHeight > clientHeight ? scrollTop / (scrollHeight - clientHeight) : 0);
    };
    el.addEventListener("scroll", onScroll);
    return () => el.removeEventListener("scroll", onScroll);
  }, []);

  // TTS
  const toggleSpeak = useCallback(() => {
    if (speaking) {
      window.speechSynthesis.cancel();
      setSpeaking(false);
    } else if (bibleText) {
      const chunks = bibleText.replace(/[#*_\-]/g, "").split(/\n\n+/);
      let idx = 0;
      const speakNext = () => {
        if (idx >= chunks.length) { setSpeaking(false); return; }
        const utt = new SpeechSynthesisUtterance(chunks[idx]);
        utt.lang = "pt-BR";
        utt.rate = ttsSpeed;
        utt.onend = () => { idx++; speakNext(); };
        window.speechSynthesis.speak(utt);
      };
      setSpeaking(true);
      speakNext();
    }
  }, [speaking, bibleText, ttsSpeed]);

  useEffect(() => () => { window.speechSynthesis.cancel(); }, []);

  return (
    <div className="fixed inset-0 z-50 bg-background flex flex-col animate-slide-up">
      {/* Progress bar */}
      <div className="h-0.5 bg-border/20 relative">
        <div
          className="h-full bg-primary/50 transition-all duration-150"
          style={{ width: `${scrollProgress * 100}%` }}
        />
      </div>

      {/* Header */}
      <header className="flex items-center justify-between px-4 lg:px-6 py-3 border-b border-border/20 bg-background/95 backdrop-blur-sm">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors shrink-0"
          >
            <X size={18} />
          </button>
          <div className="min-w-0">
            <p className="text-[9px] tracking-[2px] uppercase text-muted-foreground font-ui">
              Semana {weekIdx + 1} · {dayName}
            </p>
            <p className="text-sm font-medium text-foreground truncate">
              {readings.join(" · ")}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {/* TTS + Speed */}
          <div className="flex items-center gap-1">
            <button
              onClick={toggleSpeak}
              className={`w-9 h-9 rounded-full flex items-center justify-center transition-colors
                ${speaking ? "text-primary bg-primary/10" : "text-muted-foreground hover:text-foreground"}`}
            >
              {speaking ? <VolumeX size={16} /> : <Volume2 size={16} />}
            </button>
            <button
              onClick={() => setTtsSpeed(s => { const speeds = [0.75, 1, 1.25, 1.5]; const i = speeds.indexOf(s); return speeds[(i + 1) % speeds.length]; })}
              className="h-7 px-2 rounded-full text-[10px] font-bold font-ui text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors"
            >
              {ttsSpeed}x
            </button>
          </div>

          {/* Context */}
          {onFetchContext && (
            <button
              onClick={() => {
                if (!contextText && !contextLoading) onFetchContext();
                setShowContext(!showContext);
              }}
              className={`w-9 h-9 rounded-full flex items-center justify-center transition-colors
                ${showContext ? "text-primary bg-primary/10" : "text-muted-foreground hover:text-foreground"}`}
            >
              <Sparkles size={16} />
            </button>
          )}

          {/* Mark done */}
          <button
            onClick={onToggleDone}
            className="w-9 h-9 rounded-full flex items-center justify-center transition-all"
            style={{
              background: isDone ? 'hsl(var(--success))' : 'transparent',
              border: isDone ? 'none' : '2px solid hsl(var(--border))',
            }}
          >
            {isDone && <Check size={16} className="text-white" strokeWidth={3} />}
          </button>
        </div>
      </header>

      {/* Context panel (collapsible) */}
      {showContext && (
        <div className="px-5 lg:px-8 py-4 bg-card/50 border-b border-border/20 animate-fade-in">
          <p className="text-[9px] tracking-[2px] uppercase text-primary/60 font-ui mb-2">
            <Sparkles size={10} className="inline mr-1" />
            Contexto da Leitura
          </p>
          {contextLoading ? (
            <div className="flex items-center gap-2 text-muted-foreground text-xs">
              <Loader2 size={14} className="animate-spin" /> Carregando contexto...
            </div>
          ) : contextText ? (
            <p className="text-[13px] leading-relaxed text-muted-foreground italic font-body">
              {contextText}
            </p>
          ) : (
            <p className="text-xs text-muted-foreground/50 italic">Clique novamente para carregar.</p>
          )}
        </div>
      )}

      {/* Main content */}
      <div ref={contentRef} className="flex-1 overflow-y-auto no-scrollbar">
        <div className="max-w-2xl mx-auto px-5 lg:px-8 py-6 lg:py-10">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
              <div className="w-10 h-10 border-2 border-primary/20 border-t-primary/60 rounded-full animate-spin" />
              <p className="text-sm text-muted-foreground font-ui animate-pulse">
                Carregando texto bíblico...
              </p>
              <div className="flex gap-2 mt-2 flex-wrap justify-center">
                {readings.map((r, i) => (
                  <span key={i} className="px-2.5 py-1 rounded-lg text-[11px] bg-primary/8 text-primary/60 font-ui">
                    {r}
                  </span>
                ))}
              </div>
            </div>
          ) : error ? (
            <div className="text-center py-20">
              <p className="text-muted-foreground text-sm mb-3">{error}</p>
              <button onClick={onClose} className="text-primary text-sm underline">Voltar</button>
            </div>
          ) : (
            <article className="prose-bible">
              <ReactMarkdown
                components={{
                  h1: ({ children }) => (
                    <h1 className="text-[22px] font-bold text-foreground font-display mt-10 mb-4 first:mt-0">
                      {children}
                    </h1>
                  ),
                  h2: ({ children }) => (
                    <h2 className="text-[19px] font-bold text-primary font-display mt-8 mb-3">
                      {children}
                    </h2>
                  ),
                  h3: ({ children }) => (
                    <h3 className="text-[16px] font-semibold text-foreground/80 font-display mt-6 mb-2">
                      {children}
                    </h3>
                  ),
                  p: ({ children }) => (
                    <p className="text-[15px] leading-[2] text-foreground/80 font-serif mb-4">
                      {children}
                    </p>
                  ),
                  strong: ({ children }) => (
                    <strong className="text-foreground font-bold">{children}</strong>
                  ),
                  em: ({ children }) => (
                    <em className="text-primary/70">{children}</em>
                  ),
                  hr: () => (
                    <div className="my-8 flex items-center justify-center gap-3">
                      <div className="h-px flex-1 bg-border/30" />
                      <BookOpen size={14} className="text-primary/30" />
                      <div className="h-px flex-1 bg-border/30" />
                    </div>
                  ),
                  blockquote: ({ children }) => (
                    <blockquote className="border-l-3 border-primary/30 pl-4 py-2 my-4 bg-primary/5 rounded-r-lg italic text-foreground/70">
                      {children}
                    </blockquote>
                  ),
                }}
              >
                {bibleText}
              </ReactMarkdown>
            </article>
          )}
        </div>
      </div>

      {/* Bottom bar */}
      <div className="px-4 lg:px-6 py-3 border-t border-border/20 bg-background/95 backdrop-blur-sm flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BookOpen size={14} className="text-primary/50" />
          <span className="text-[11px] text-muted-foreground font-ui">
            {readings.length} {readings.length === 1 ? "leitura" : "leituras"}
          </span>
        </div>

        <button
          onClick={() => {
            if (!isDone) onToggleDone();
            onClose();
          }}
          className="flex items-center gap-2 px-5 py-2.5 rounded-full text-[11px] tracking-[1.5px] uppercase font-ui font-medium transition-all active:scale-95"
          style={{
            background: isDone ? 'hsl(var(--success)/0.12)' : 'hsl(var(--primary))',
            color: isDone ? 'hsl(var(--success))' : 'hsl(var(--primary-foreground))',
            border: isDone ? '1px solid hsl(var(--success)/0.3)' : 'none',
          }}
        >
          <Check size={14} />
          {isDone ? "Concluído" : "Marcar como lido"}
        </button>
      </div>
    </div>
  );
}
