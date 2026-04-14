import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";

import {
  X, Check, Play, Pause, SkipBack, SkipForward, Repeat,
  Volume2, ChevronDown, Sparkles, Loader2, Heart,
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
  userCodeId: string;
}

interface ParsedVerse {
  header?: string; // e.g. "Gênesis 1"
  number: string;  // e.g. "1" or "1:3"
  text: string;
}

function parseBibleText(raw: string): ParsedVerse[] {
  const verses: ParsedVerse[] = [];
  let currentHeader = "";

  const lines = raw.split("\n");
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed === "---") continue;

    // Detect headers like "**Gênesis 1**" or "## Gênesis 1"
    const headerMatch = trimmed.match(/^(?:\*\*|#{1,3}\s*)(.+?)(?:\*\*|)$/);
    if (headerMatch && !/^\d/.test(headerMatch[1].trim())) {
      currentHeader = headerMatch[1].trim();
      continue;
    }

    // Detect verse lines: "1 No princípio..." or "**1** No princípio..."
    const verseMatch = trimmed.match(/^(?:\*\*)?(\d+(?::\d+)?)\s*(?:\*\*)?\s*[-–—.]?\s*(.+)/);
    if (verseMatch) {
      verses.push({
        header: currentHeader || undefined,
        number: verseMatch[1],
        text: verseMatch[2].replace(/\*\*/g, "").trim(),
      });
    } else if (verses.length > 0 && trimmed.length > 10) {
      // Continuation of previous verse
      verses[verses.length - 1].text += " " + trimmed.replace(/\*\*/g, "").trim();
    }
  }

  return verses;
}

export default function ReadingFocusView({
  weekIdx, dayIdx, dayName, readings, isDone, onToggleDone, onClose,
  contextText, onFetchContext, contextLoading, userCodeId,
}: Props) {
  const [bibleText, setBibleText] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [currentIdx, setCurrentIdx] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [showSpeedMenu, setShowSpeedMenu] = useState(false);
  const [showContext, setShowContext] = useState(false);

  const uttRef = useRef<SpeechSynthesisUtterance | null>(null);
  const touchStartX = useRef(0);
  const touchStartY = useRef(0);

  // Fetch with retry
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    setBibleText("");
    setCurrentIdx(0);

    const fetchText = async (attempt = 0): Promise<void> => {
      try {
        // Use direct fetch for better error handling
        const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/fetch-reading-text`;
        const res = await fetch(url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "apikey": import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
            "Authorization": `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({ readings }),
        });

        if (cancelled) return;

        const data = await res.json();

        if (!res.ok || data?.error) {
          const msg = data?.error || `Erro ${res.status}`;
          // Retry once on server errors
          if (attempt < 1 && res.status >= 500) {
            await new Promise(r => setTimeout(r, 2000));
            if (!cancelled) return fetchText(attempt + 1);
            return;
          }
          setError(msg);
          return;
        }

        setBibleText(data?.result || "");
      } catch (e: any) {
        if (cancelled) return;
        // Retry once on network errors
        if (attempt < 1) {
          await new Promise(r => setTimeout(r, 2000));
          if (!cancelled) return fetchText(attempt + 1);
          return;
        }
        setError("Erro de conexão. Verifique sua internet e tente novamente.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchText();
    return () => { cancelled = true; };
  }, [readings]);

  const verses = useMemo(() => parseBibleText(bibleText), [bibleText]);
  const currentVerse = verses[currentIdx];
  const progress = verses.length ? ((currentIdx + 1) / verses.length) * 100 : 0;

  // TTS
  const speakVerse = useCallback((idx: number) => {
    window.speechSynthesis.cancel();
    if (idx >= verses.length) { setIsPlaying(false); return; }
    const utt = new SpeechSynthesisUtterance(verses[idx].text);
    utt.lang = "pt-BR";
    utt.rate = speed;
    utt.onend = () => {
      if (idx < verses.length - 1) {
        setCurrentIdx(idx + 1);
        speakVerse(idx + 1);
      } else {
        setIsPlaying(false);
      }
    };
    uttRef.current = utt;
    window.speechSynthesis.speak(utt);
  }, [verses, speed]);

  const play = useCallback(() => { setIsPlaying(true); speakVerse(currentIdx); }, [currentIdx, speakVerse]);
  const pause = useCallback(() => { window.speechSynthesis.cancel(); setIsPlaying(false); }, []);

  const goTo = useCallback((idx: number) => {
    if (idx < 0 || idx >= verses.length) return;
    setCurrentIdx(idx);
    if (isPlaying) { window.speechSynthesis.cancel(); speakVerse(idx); }
  }, [verses.length, isPlaying, speakVerse]);

  const repeatVerse = useCallback(() => {
    window.speechSynthesis.cancel();
    setIsPlaying(true);
    const utt = new SpeechSynthesisUtterance(verses[currentIdx]?.text || "");
    utt.lang = "pt-BR";
    utt.rate = speed;
    utt.onend = () => setIsPlaying(false);
    window.speechSynthesis.speak(utt);
  }, [currentIdx, verses, speed]);

  useEffect(() => () => { window.speechSynthesis.cancel(); }, []);

  // Swipe handling
  const onTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  };

  const onTouchEnd = (e: React.TouchEvent) => {
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    const dy = e.changedTouches[0].clientY - touchStartY.current;
    if (Math.abs(dx) < 50 || Math.abs(dy) > Math.abs(dx)) return;
    if (dx < 0) goTo(currentIdx + 1);
    else goTo(currentIdx - 1);
  };

  // Determine if we're on a new chapter header
  const showHeader = currentVerse?.header && (currentIdx === 0 || verses[currentIdx - 1]?.header !== currentVerse.header);

  const speeds = [0.75, 1, 1.25, 1.5];

  return (
    <div className="fixed inset-0 z-50 bg-background flex flex-col animate-fade-in">
      {/* Progress bar */}
      <div className="h-0.5 bg-border/20">
        <div className="h-full bg-primary/50 transition-all duration-300" style={{ width: `${progress}%` }} />
      </div>

      {/* Header */}
      <header className="flex items-center justify-between px-4 py-3 border-b border-border/20">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <button onClick={() => { window.speechSynthesis.cancel(); onClose(); }}
            className="w-9 h-9 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors shrink-0">
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
          {onFetchContext && (
            <button onClick={() => { if (!contextText && !contextLoading) onFetchContext?.(); setShowContext(!showContext); }}
              className={`w-9 h-9 rounded-full flex items-center justify-center transition-colors
                ${showContext ? "text-primary bg-primary/10" : "text-muted-foreground hover:text-foreground"}`}>
              <Sparkles size={16} />
            </button>
          )}
          <button onClick={onToggleDone}
            className="w-9 h-9 rounded-full flex items-center justify-center transition-all"
            style={{
              background: isDone ? 'hsl(var(--success))' : 'transparent',
              border: isDone ? 'none' : '2px solid hsl(var(--border))',
            }}>
            {isDone && <Check size={16} className="text-white" strokeWidth={3} />}
          </button>
        </div>
      </header>

      {/* Context panel */}
      {showContext && (
        <div className="px-5 py-4 bg-card/50 border-b border-border/20 animate-fade-in">
          <p className="text-[9px] tracking-[2px] uppercase text-primary/60 font-ui mb-2">
            <Sparkles size={10} className="inline mr-1" />Contexto da Leitura
          </p>
          {contextLoading ? (
            <div className="flex items-center gap-2 text-muted-foreground text-xs">
              <Loader2 size={14} className="animate-spin" /> Carregando...
            </div>
          ) : contextText ? (
            <p className="text-[13px] leading-relaxed text-muted-foreground italic font-body">{contextText}</p>
          ) : (
            <p className="text-xs text-muted-foreground/50 italic">Clique novamente para carregar.</p>
          )}
        </div>
      )}

      {/* Main verse area — swipeable */}
      <div
        className="flex-1 flex flex-col items-center justify-center px-6 lg:px-12 select-none"
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
      >
        {loading ? (
          <div className="flex flex-col items-center gap-4">
            <div className="w-10 h-10 border-2 border-primary/20 border-t-primary/60 rounded-full animate-spin" />
            <p className="text-sm text-muted-foreground font-ui animate-pulse">Carregando texto bíblico...</p>
            <p className="text-[11px] text-muted-foreground/50 font-ui text-center max-w-[240px]">
              Pode demorar até 60 segundos dependendo da quantidade de capítulos.
            </p>
            <div className="flex gap-2 mt-2 flex-wrap justify-center">
              {readings.map((r, i) => (
                <span key={i} className="px-2.5 py-1 rounded-lg text-[11px] bg-primary/8 text-primary/60 font-ui">{r}</span>
              ))}
            </div>
          </div>
        ) : error ? (
          <div className="text-center">
            <p className="text-muted-foreground text-sm mb-3">{error}</p>
            <button onClick={onClose} className="text-primary text-sm underline">Voltar</button>
          </div>
        ) : currentVerse ? (
          <div className="max-w-lg w-full text-center animate-fade-in" key={currentIdx}>
            {/* Chapter header */}
            {showHeader && (
              <p className="text-[10px] tracking-[2px] uppercase text-primary/60 font-ui mb-4">
                {currentVerse.header}
              </p>
            )}

            {/* Verse badge */}
            <span className="inline-block px-3 py-1 rounded-full bg-primary/10 text-primary text-[11px] font-bold font-ui mb-6">
              Versículo {currentVerse.number}
            </span>

            {/* Verse text */}
            <blockquote className="font-serif text-[22px] lg:text-[26px] leading-[2] text-foreground/85 italic tracking-wide">
              {currentVerse.text}
            </blockquote>

            {/* Counter */}
            <p className="text-[11px] text-muted-foreground mt-8 font-ui">
              {currentIdx + 1} de {verses.length}
            </p>

            {/* Swipe hint on mobile */}
            {currentIdx === 0 && (
              <p className="text-[10px] text-muted-foreground/40 mt-3 font-ui lg:hidden">
                ← Arraste para navegar →
              </p>
            )}
          </div>
        ) : (
          <p className="text-muted-foreground text-sm">Nenhum versículo encontrado.</p>
        )}
      </div>

      {/* Controls */}
      {!loading && !error && verses.length > 0 && (
        <div className="px-6 py-4 border-t border-border/20 bg-background/95 backdrop-blur-sm">
          {/* Speed */}
          <div className="relative flex justify-center mb-3">
            <button
              onClick={() => setShowSpeedMenu(!showSpeedMenu)}
              className="flex items-center gap-1 px-3 py-1 rounded-full text-[10px] font-ui text-muted-foreground border border-border/30 hover:border-primary/20 transition-all"
            >
              <Volume2 size={12} /> {speed}x <ChevronDown size={10} />
            </button>
            {showSpeedMenu && (
              <div className="absolute bottom-full mb-2 bg-card border border-border rounded-xl shadow-lg p-1 animate-fade-in z-10">
                {speeds.map(s => (
                  <button key={s}
                    onClick={() => { setSpeed(s); setShowSpeedMenu(false); }}
                    className={`block w-full px-4 py-1.5 rounded-lg text-[11px] text-left transition-colors
                      ${s === speed ? "bg-primary/10 text-primary" : "text-foreground/70 hover:bg-muted"}`}>
                    {s}x
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Playback buttons */}
          <div className="flex items-center justify-center gap-6">
            <button onClick={() => goTo(currentIdx - 1)} disabled={currentIdx === 0}
              className="p-3 rounded-full text-muted-foreground hover:text-foreground disabled:opacity-20 transition-all active:scale-90">
              <SkipBack size={20} />
            </button>

            <button onClick={isPlaying ? pause : play}
              className="w-14 h-14 rounded-full bg-primary flex items-center justify-center text-primary-foreground shadow-lg transition-all active:scale-95">
              {isPlaying ? <Pause size={22} /> : <Play size={22} className="ml-0.5" />}
            </button>

            <button onClick={() => goTo(currentIdx + 1)} disabled={currentIdx >= verses.length - 1}
              className="p-3 rounded-full text-muted-foreground hover:text-foreground disabled:opacity-20 transition-all active:scale-90">
              <SkipForward size={20} />
            </button>

            <button onClick={repeatVerse}
              className="p-3 rounded-full text-muted-foreground hover:text-primary transition-all active:scale-90">
              <Repeat size={18} />
            </button>
          </div>

          {/* Verse dots */}
          <div className="flex justify-center gap-1 mt-3 flex-wrap max-w-xs mx-auto">
            {verses.slice(0, 40).map((_, i) => (
              <button key={i} onClick={() => goTo(i)}
                className={`w-2 h-2 rounded-full transition-all ${i === currentIdx ? "bg-primary scale-125" : i < currentIdx ? "bg-primary/30" : "bg-border"}`} />
            ))}
            {verses.length > 40 && <span className="text-[9px] text-muted-foreground self-center ml-1">+{verses.length - 40}</span>}
          </div>

          {/* Mark done */}
          <div className="flex justify-center mt-4">
            <button
              onClick={() => { if (!isDone) onToggleDone(); onClose(); }}
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
      )}
    </div>
  );
}
