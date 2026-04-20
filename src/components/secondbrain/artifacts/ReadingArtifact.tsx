import { useState, useEffect, useMemo } from "react";
import { BookOpen, Calendar as CalendarIcon, Check, ChevronRight, Headphones, Loader2, Pause, Play } from "lucide-react";
import { ArtifactShell, ArtifactAction } from "./ArtifactShell";
import { FOCUS_PALETTE as P } from "./types";
import { haptic } from "@/hooks/useHaptic";
import { useFocusTTS, focusTTS } from "@/hooks/useFocusTTS";
import { computeReadingForDate } from "@/lib/readingPlan";

const READING_KEY = "bible-plan-progress";

interface ReadingData {
  weekIdx: number;
  weekNum: number;
  dates: string;
  dayIdx: number;
  day: string;
  readings: string[];
  weeks?: any[];
}

interface Props {
  data: ReadingData;
  sendAsUser: (text: string) => void;
}

type Progress = Record<string, boolean>;

function loadProgress(): Progress {
  try {
    return JSON.parse(localStorage.getItem(READING_KEY) || "{}");
  } catch {
    return {};
  }
}

function saveProgress(p: Progress) {
  try {
    localStorage.setItem(READING_KEY, JSON.stringify(p));
  } catch {}
}

function readingKey(weekIdx: number, dayIdx: number, ridx: number) {
  return `${weekIdx}-${dayIdx}-${ridx}`;
}

async function fetchVerseText(ref: string): Promise<string> {
  try {
    const r = await fetch(`https://bible-api.com/${encodeURIComponent(ref)}?translation=almeida`);
    if (r.ok) {
      const d = await r.json();
      if (d?.text) return String(d.text).trim();
    }
  } catch {}
  return "";
}

function dateFromOffset(offset: number): Date {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  d.setHours(0, 0, 0, 0);
  return d;
}

const SHORT_DAYS = ["D", "S", "T", "Q", "Q", "S", "S"];

export default function ReadingArtifact({ data, sendAsUser }: Props) {
  const [progress, setProgress] = useState<Progress>(() => loadProgress());
  const [loadingIdx, setLoadingIdx] = useState<number | null>(null);
  const [showCalendar, setShowCalendar] = useState(false);
  const [dayOffset, setDayOffset] = useState(0); // 0 = today, -6..0
  const tts = useFocusTTS();

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === READING_KEY) setProgress(loadProgress());
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  // Compute the 7-day window (last 7 days ending today)
  const week = useMemo(() => {
    if (!data.weeks) return [];
    return Array.from({ length: 7 }, (_, i) => {
      const offset = i - 6; // -6..0
      const date = dateFromOffset(offset);
      const reading = computeReadingForDate(data.weeks!, date);
      return { offset, date, reading };
    });
  }, [data.weeks]);

  // Active reading: from offset, falls back to data
  const active = useMemo(() => {
    if (dayOffset === 0) return data;
    const found = week.find((w) => w.offset === dayOffset)?.reading;
    return found ?? data;
  }, [dayOffset, week, data]);

  const toggle = (ridx: number) => {
    haptic("light");
    const k = readingKey(active.weekIdx, active.dayIdx, ridx);
    setProgress((prev) => {
      const next = { ...prev, [k]: !prev[k] };
      saveProgress(next);
      return next;
    });
  };

  const markAll = () => {
    haptic("medium");
    setProgress((prev) => {
      const next = { ...prev };
      active.readings.forEach((_, ridx) => {
        next[readingKey(active.weekIdx, active.dayIdx, ridx)] = true;
      });
      saveProgress(next);
      return next;
    });
  };

  const ttsId = (ridx: number) => `reading-${active.weekIdx}-${active.dayIdx}-${ridx}`;

  const handleListen = async (ridx: number, ref: string) => {
    haptic("light");
    const id = ttsId(ridx);
    const isThis = tts.playingId === id;
    if (isThis) {
      if (tts.isPaused) focusTTS.resume();
      else focusTTS.pause();
      return;
    }
    setLoadingIdx(ridx);
    const text = await fetchVerseText(ref);
    setLoadingIdx(null);
    if (!text) {
      sendAsUser(`ler ${ref}`);
      return;
    }
    focusTTS.speak(id, `${ref}. ${text}`, { label: ref });
  };

  const dayProgress = (weekIdx: number, dayIdx: number, total: number) => {
    if (total === 0) return 0;
    let done = 0;
    for (let i = 0; i < total; i++) {
      if (progress[readingKey(weekIdx, dayIdx, i)]) done++;
    }
    return done / total;
  };

  const allDone = active.readings.length > 0 && active.readings.every((_, i) => progress[readingKey(active.weekIdx, active.dayIdx, i)]);
  const doneCount = active.readings.filter((_, i) => progress[readingKey(active.weekIdx, active.dayIdx, i)]).length;

  const isToday = dayOffset === 0;
  const headerLabel = isToday ? "Leitura do dia" : "Leitura anterior";

  return (
    <ArtifactShell
      icon={<BookOpen size={12} strokeWidth={2.4} />}
      label={headerLabel}
      badge={`${active.day} · Sem ${active.weekNum}`}
    >
      {/* Week calendar strip */}
      {data.weeks && week.length > 0 && (
        <div className="mb-3">
          <button
            onClick={() => {
              haptic("light");
              setShowCalendar((s) => !s);
            }}
            className="flex items-center gap-1.5 mb-2 text-[10.5px] font-bold uppercase tracking-wider transition-opacity hover:opacity-80"
            style={{ color: P.textDim }}
          >
            <CalendarIcon size={11} strokeWidth={2.6} />
            {showCalendar ? "Ocultar últimos 7 dias" : "Ver últimos 7 dias"}
          </button>

          {showCalendar && (
            <div
              className="grid grid-cols-7 gap-1 p-2 rounded-xl mb-2"
              style={{ background: `${P.surfaceLight}66`, border: `1px solid ${P.border}` }}
            >
              {week.map(({ offset, date, reading }) => {
                const isSel = offset === dayOffset;
                const isToday = offset === 0;
                const total = reading?.readings.length ?? 0;
                const ratio = reading ? dayProgress(reading.weekIdx, reading.dayIdx, total) : 0;
                const dayLetter = SHORT_DAYS[date.getDay()];
                const disabled = !reading;
                return (
                  <button
                    key={offset}
                    disabled={disabled}
                    onClick={() => {
                      haptic("light");
                      setDayOffset(offset);
                    }}
                    className="flex flex-col items-center gap-1 py-2 px-1 rounded-lg transition-all hover:scale-[1.04] disabled:opacity-30 disabled:hover:scale-100"
                    style={{
                      background: isSel ? `${P.primary}26` : "transparent",
                      border: `1px solid ${isSel ? P.primary + "66" : "transparent"}`,
                    }}
                    aria-label={`${dayLetter} ${date.getDate()}`}
                  >
                    <span
                      className="text-[9px] font-bold uppercase tracking-wider"
                      style={{ color: isSel ? P.primary : P.textFaint }}
                    >
                      {dayLetter}
                    </span>
                    <span
                      className="text-[13px] font-bold leading-none"
                      style={{ color: isSel ? P.primary : isToday ? P.text : P.textDim }}
                    >
                      {date.getDate()}
                    </span>
                    <span
                      className="block w-5 h-[3px] rounded-full overflow-hidden"
                      style={{ background: `${P.border}` }}
                    >
                      <span
                        className="block h-full transition-all"
                        style={{
                          width: `${Math.round(ratio * 100)}%`,
                          background: ratio >= 1 ? P.primary : ratio > 0 ? P.primarySoft : "transparent",
                        }}
                      />
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      {active.readings.length === 0 ? (
        <p className="text-[13px]" style={{ color: P.textDim }}>
          {isToday ? "Hoje é dia de descanso na leitura — aproveite para revisar." : "Sem leitura nesse dia."}
        </p>
      ) : (
        <>
          <div className="space-y-2 mb-4">
            {active.readings.map((r, i) => {
              const done = !!progress[readingKey(active.weekIdx, active.dayIdx, i)];
              const id = ttsId(i);
              const isThis = tts.playingId === id;
              const isPlaying = isThis && !tts.isPaused;
              const isPaused = isThis && tts.isPaused;
              const isLoading = loadingIdx === i;
              return (
                <div
                  key={i}
                  className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl transition-all"
                  style={{
                    background: isThis
                      ? `${P.primary}1a`
                      : done
                      ? `${P.primary}10`
                      : `${P.surfaceLight}66`,
                    border: `1px solid ${isThis ? P.primary + "55" : done ? P.primary + "33" : P.border}`,
                  }}
                >
                  <button
                    onClick={() => toggle(i)}
                    aria-label={done ? "Desmarcar leitura" : "Marcar como lida"}
                    className="w-5 h-5 rounded-md flex items-center justify-center shrink-0 transition-all hover:scale-110"
                    style={{
                      background: done ? P.primary : "transparent",
                      border: `1.5px solid ${done ? P.primary : P.textFaint}`,
                    }}
                  >
                    {done && <Check size={11} strokeWidth={3} style={{ color: P.bg }} />}
                  </button>

                  <button
                    onClick={() => toggle(i)}
                    className="flex-1 text-left text-[13.5px] font-semibold transition-all hover:translate-x-0.5"
                    style={{
                      color: isThis ? P.primary : done ? P.primary : P.text,
                      textDecoration: done && !isThis ? "line-through" : "none",
                      textDecorationColor: `${P.primary}66`,
                    }}
                  >
                    {r}
                  </button>

                  {isPlaying && <SoundWave />}

                  <button
                    onClick={() => handleListen(i, r)}
                    aria-label={
                      isPlaying ? "Pausar leitura" : isPaused ? "Continuar leitura" : "Ouvir leitura"
                    }
                    disabled={isLoading}
                    className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-all hover:scale-110 active:scale-95 disabled:opacity-50"
                    style={{
                      background: isThis ? `${P.primary}33` : "transparent",
                      border: `1px solid ${isThis ? P.primary + "66" : P.border}`,
                      color: isThis ? P.primary : P.textDim,
                    }}
                  >
                    {isLoading ? (
                      <Loader2 size={12} className="animate-spin" />
                    ) : isPlaying ? (
                      <Pause size={12} strokeWidth={2.6} />
                    ) : isPaused ? (
                      <Play size={12} strokeWidth={2.6} />
                    ) : (
                      <Headphones size={12} strokeWidth={2.4} />
                    )}
                  </button>

                  <ChevronRight size={14} style={{ color: P.textFaint }} />
                </div>
              );
            })}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {!allDone && (
              <ArtifactAction onClick={markAll} variant="primary">
                <Check size={12} strokeWidth={2.6} /> Marcar tudo
              </ArtifactAction>
            )}
            <ArtifactAction
              onClick={() => sendAsUser(`devocional do dia`)}
            >
              <BookOpen size={12} /> Devocional
            </ArtifactAction>
            <span
              className="ml-auto text-[10.5px] font-bold uppercase tracking-wider"
              style={{ color: allDone ? P.primary : P.textFaint }}
            >
              {doneCount}/{active.readings.length}
            </span>
          </div>
        </>
      )}
    </ArtifactShell>
  );
}

function SoundWave() {
  return (
    <span className="inline-flex items-end gap-[2px] h-3 shrink-0" aria-hidden>
      <span className="rd-bar rd-bar-1" />
      <span className="rd-bar rd-bar-2" />
      <span className="rd-bar rd-bar-3" />
      <style>{`
        .rd-bar { display:inline-block; width:2px; background:${P.primary}; border-radius:1px; }
        .rd-bar-1 { animation: rdWave 0.9s ease-in-out infinite; height:6px; }
        .rd-bar-2 { animation: rdWave 0.9s ease-in-out infinite; animation-delay:.15s; height:10px; }
        .rd-bar-3 { animation: rdWave 0.9s ease-in-out infinite; animation-delay:.3s; height:7px; }
        @keyframes rdWave {
          0%,100% { transform: scaleY(0.55); }
          50% { transform: scaleY(1); }
        }
        @media (prefers-reduced-motion: reduce) {
          .rd-bar { animation: none !important; }
        }
      `}</style>
    </span>
  );
}
