import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import {
  BookOpen,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Pause,
  Play,
  PenLine,
  Search,
} from "lucide-react";
import { ArtifactShell, ArtifactAction } from "./ArtifactShell";
import { FOCUS_PALETTE as P } from "./types";
import { useFocusTTS, focusTTS } from "@/hooks/useFocusTTS";
import { haptic } from "@/hooks/useHaptic";

interface ParsedVerse {
  number: string;
  text: string;
}

interface Props {
  data: { reference: string; readings?: string[] };
  sendAsUser: (text: string) => void;
}

function parseBibleText(raw: string): ParsedVerse[] {
  const verses: ParsedVerse[] = [];
  const lines = raw.split("\n");
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed === "---") continue;
    // Skip headers like "**Gênesis 1**" or "## Gênesis 1"
    const headerMatch = trimmed.match(/^(?:\*\*|#{1,3}\s*)(.+?)(?:\*\*|)$/);
    if (headerMatch && !/^\d/.test(headerMatch[1].trim())) continue;
    const verseMatch = trimmed.match(/^(?:\*\*)?(\d+(?::\d+)?)\s*(?:\*\*)?\s*[-–—.]?\s*(.+)/);
    if (verseMatch) {
      verses.push({
        number: verseMatch[1],
        text: verseMatch[2].replace(/\*\*/g, "").trim(),
      });
    } else if (verses.length > 0 && trimmed.length > 10) {
      verses[verses.length - 1].text += " " + trimmed.replace(/\*\*/g, "").trim();
    }
  }
  return verses;
}

/**
 * Verse-by-verse reader inside the Focus chat.
 * Loads the chapter (or passage) from bible-api.com and lets the user
 * read sequentially with arrows, swipe and per-verse TTS — same pattern
 * as the old ReadingFocusView, but compact.
 */
export default function VerseReaderArtifact({ data, sendAsUser }: Props) {
  const [verses, setVerses] = useState<ParsedVerse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [idx, setIdx] = useState(0);
  const tts = useFocusTTS();

  const ttsId = useMemo(
    () => `versereader-${data.reference}-${idx}`,
    [data.reference, idx],
  );
  const isThis = tts.playingId === ttsId;
  const isPlaying = isThis && !tts.isPaused;
  const isPaused = isThis && tts.isPaused;

  const touchStartX = useRef(0);
  const touchStartY = useRef(0);

  // Fetch chapter text using the SAME backend as ReadingFocusView (fetch-reading-text)
  // with bible-api.com as fallback.
  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError(null);
    setIdx(0);

    const refs = data.readings && data.readings.length > 0 ? data.readings : [data.reference];

    const tryEdgeFunction = async (): Promise<ParsedVerse[]> => {
      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/fetch-reading-text`;
      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ readings: refs }),
      });
      const j = await res.json();
      if (!res.ok || j?.error) throw new Error(j?.error || `Erro ${res.status}`);
      return parseBibleText(j?.result || "");
    };

    const tryBibleApi = async (): Promise<ParsedVerse[]> => {
      const ref = encodeURIComponent(refs[0]);
      const r = await fetch(`https://bible-api.com/${ref}?translation=almeida`);
      const j = await r.json();
      const list: ParsedVerse[] = Array.isArray(j?.verses)
        ? j.verses.map((v: any) => ({
            number: String(v.verse ?? ""),
            text: String(v.text ?? "").trim(),
          }))
        : [];
      return list;
    };

    (async () => {
      try {
        let list = await tryEdgeFunction();
        if (list.length === 0) list = await tryBibleApi();
        if (!alive) return;
        if (list.length === 0) setError("Não foi possível carregar este texto.");
        else setVerses(list);
      } catch {
        try {
          const list = await tryBibleApi();
          if (!alive) return;
          if (list.length === 0) setError("Não foi possível carregar este texto.");
          else setVerses(list);
        } catch {
          if (alive) setError("Erro de conexão. Tente novamente.");
        }
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => {
      alive = false;
      if (focusTTS.getState().playingId?.startsWith(`versereader-${data.reference}`)) {
        focusTTS.stop();
      }
    };
  }, [data.reference, data.readings]);

  const current = verses[idx];
  const total = verses.length;
  const progress = total ? ((idx + 1) / total) * 100 : 0;

  const goTo = useCallback(
    (i: number) => {
      if (i < 0 || i >= verses.length) return;
      haptic("light");
      const wasPlaying =
        focusTTS.getState().playingId?.startsWith(`versereader-${data.reference}`) ?? false;
      // Always stop current utterance before switching
      if (wasPlaying) {
        wasPlayingRef.current = false; // prevent auto-advance handler from firing
        focusTTS.stop();
      }
      setIdx(i);
      // If user was listening, continue reading the new verse automatically
      if (wasPlaying) {
        const v = verses[i];
        if (v) {
          // Defer to next tick so state.playingId reset propagates
          setTimeout(() => {
            focusTTS.speak(
              `versereader-${data.reference}-${i}`,
              v.text,
              { label: `${data.reference}:${v.number}` },
            );
          }, 0);
        }
      }
    },
    [verses, data.reference],
  );

  const togglePlay = () => {
    if (!current) return;
    haptic("light");
    if (isThis) {
      if (isPaused) focusTTS.resume();
      else focusTTS.pause();
      return;
    }
    focusTTS.speak(ttsId, current.text, {
      label: `${data.reference}:${current.number}`,
    });
  };

  // Auto-advance when TTS finishes the current verse
  useEffect(() => {
    if (!isThis) return;
    // when totalSentences becomes 0 and progress hits 1, hook resets playingId.
    // The effect below catches the moment: if playingId became null AND we were just playing this verse, advance.
  }, [isThis]);

  // Listen for end-of-utterance: when our id stops being active, advance to next
  const wasPlayingRef = useRef(false);
  useEffect(() => {
    if (isPlaying) {
      wasPlayingRef.current = true;
      return;
    }
    // Just finished
    if (wasPlayingRef.current && tts.playingId === null && idx < verses.length - 1) {
      wasPlayingRef.current = false;
      const next = idx + 1;
      setIdx(next);
      const v = verses[next];
      if (v) {
        focusTTS.speak(
          `versereader-${data.reference}-${next}`,
          `Versículo ${v.number}. ${v.text}`,
          { label: `${data.reference}:${v.number}` },
        );
      }
    } else if (!isPlaying && !isPaused) {
      wasPlayingRef.current = false;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPlaying, tts.playingId]);

  const onTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    const dy = e.changedTouches[0].clientY - touchStartY.current;
    if (Math.abs(dx) < 50 || Math.abs(dy) > Math.abs(dx)) return;
    if (dx < 0) goTo(idx + 1);
    else goTo(idx - 1);
  };

  return (
    <ArtifactShell
      icon={<BookOpen size={13} />}
      label={data.reference}
      badge={total ? `${idx + 1}/${total}` : "Almeida"}
    >
      {/* Progress bar */}
      <div
        className="h-[2px] rounded-full mb-4 overflow-hidden"
        style={{ background: `${P.primary}1a` }}
      >
        <div
          className="h-full transition-all duration-300"
          style={{ width: `${progress}%`, background: P.primary }}
        />
      </div>

      {loading ? (
        <div
          className="flex items-center gap-2 py-6 justify-center text-[13px]"
          style={{ color: P.textDim }}
        >
          <Loader2 size={14} className="animate-spin" /> Carregando texto...
        </div>
      ) : error ? (
        <p className="text-[13px] py-3" style={{ color: "#ff7a7a" }}>
          {error}
        </p>
      ) : current ? (
        <div
          className="select-none"
          onTouchStart={onTouchStart}
          onTouchEnd={onTouchEnd}
        >
          <div className="flex items-center justify-between mb-3">
            <span
              className="text-[10.5px] font-bold uppercase tracking-[1.6px] px-2 py-1 rounded-md"
              style={{ background: `${P.primary}1f`, color: P.primary }}
            >
              v. {current.number}
            </span>
            <span
              className="text-[10.5px] font-bold uppercase tracking-[1.6px]"
              style={{ color: P.textFaint }}
            >
              {idx + 1} de {total}
            </span>
          </div>

          <p
            key={idx}
            className="text-[16.5px] leading-[1.85] mb-5 animate-fade-in"
            style={{
              color: P.text,
              fontFamily: "'Crimson Text', Georgia, serif",
            }}
          >
            {current.text}
          </p>

          {/* Verse navigation */}
          <div className="flex items-center justify-center gap-3 mb-3">
            <button
              onClick={() => goTo(idx - 1)}
              disabled={idx === 0}
              aria-label="Versículo anterior"
              className="w-9 h-9 rounded-full flex items-center justify-center transition-all hover:scale-110 active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed"
              style={{
                background: `${P.surfaceLight}`,
                border: `1px solid ${P.border}`,
                color: P.text,
              }}
            >
              <ChevronLeft size={16} />
            </button>

            <button
              onClick={togglePlay}
              aria-label={isPlaying ? "Pausar" : "Ouvir versículo"}
              className="w-11 h-11 rounded-full flex items-center justify-center transition-all hover:scale-110 active:scale-95"
              style={{
                background: P.primary,
                color: P.bg,
                boxShadow: `0 0 22px ${P.primary}55`,
              }}
            >
              {isPlaying ? (
                <Pause size={17} strokeWidth={2.6} />
              ) : (
                <Play size={17} strokeWidth={2.6} className="ml-0.5" />
              )}
            </button>

            <button
              onClick={() => goTo(idx + 1)}
              disabled={idx >= total - 1}
              aria-label="Próximo versículo"
              className="w-9 h-9 rounded-full flex items-center justify-center transition-all hover:scale-110 active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed"
              style={{
                background: `${P.surfaceLight}`,
                border: `1px solid ${P.border}`,
                color: P.text,
              }}
            >
              <ChevronRight size={16} />
            </button>
          </div>

          {/* Verse dots (max 30 for compactness) */}
          {total > 1 && total <= 30 && (
            <div className="flex justify-center gap-1 flex-wrap mb-4">
              {verses.map((_, i) => (
                <button
                  key={i}
                  onClick={() => goTo(i)}
                  aria-label={`Ir para versículo ${i + 1}`}
                  className="w-1.5 h-1.5 rounded-full transition-all"
                  style={{
                    background:
                      i === idx
                        ? P.primary
                        : i < idx
                        ? `${P.primary}55`
                        : P.border,
                    transform: i === idx ? "scale(1.6)" : "scale(1)",
                  }}
                />
              ))}
            </div>
          )}

          {/* Quick actions */}
          <div className="flex flex-wrap gap-2">
            <ArtifactAction
              onClick={() =>
                sendAsUser(`exegese de ${data.reference}:${current.number}`)
              }
              variant="primary"
            >
              <Search size={11} /> Exegese
            </ArtifactAction>
            <ArtifactAction
              onClick={() =>
                sendAsUser(
                  `anotar: "${current.text}" — ${data.reference}:${current.number}`,
                )
              }
            >
              <PenLine size={11} /> Anotar
            </ArtifactAction>
          </div>
        </div>
      ) : (
        <p className="text-[13px]" style={{ color: P.textDim }}>
          Nenhum versículo encontrado.
        </p>
      )}
    </ArtifactShell>
  );
}
