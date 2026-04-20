import { useState, useEffect } from "react";
import { BookOpen, Check, ChevronRight, Headphones, Loader2, Pause, Play } from "lucide-react";
import { ArtifactShell, ArtifactAction } from "./ArtifactShell";
import { FOCUS_PALETTE as P } from "./types";
import { haptic } from "@/hooks/useHaptic";
import { useFocusTTS, focusTTS } from "@/hooks/useFocusTTS";

const READING_KEY = "bible-plan-progress";

interface ReadingData {
  weekIdx: number;
  weekNum: number;
  dates: string;
  dayIdx: number;
  day: string;
  readings: string[];
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

export default function ReadingArtifact({ data, sendAsUser }: Props) {
  const [progress, setProgress] = useState<Progress>(() => loadProgress());

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === READING_KEY) setProgress(loadProgress());
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const toggle = (ridx: number) => {
    haptic("light");
    const k = readingKey(data.weekIdx, data.dayIdx, ridx);
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
      data.readings.forEach((_, ridx) => {
        next[readingKey(data.weekIdx, data.dayIdx, ridx)] = true;
      });
      saveProgress(next);
      return next;
    });
  };

  const allDone = data.readings.every((_, i) => progress[readingKey(data.weekIdx, data.dayIdx, i)]);
  const doneCount = data.readings.filter((_, i) => progress[readingKey(data.weekIdx, data.dayIdx, i)]).length;

  return (
    <ArtifactShell
      icon={<BookOpen size={12} strokeWidth={2.4} />}
      label="Leitura do dia"
      badge={`${data.day} · Sem ${data.weekNum}`}
    >
      {data.readings.length === 0 ? (
        <p className="text-[13px]" style={{ color: P.textDim }}>
          Hoje é dia de descanso na leitura — aproveite para revisar.
        </p>
      ) : (
        <>
          <div className="space-y-2 mb-4">
            {data.readings.map((r, i) => {
              const done = !!progress[readingKey(data.weekIdx, data.dayIdx, i)];
              return (
                <button
                  key={i}
                  onClick={() => toggle(i)}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all hover:translate-x-0.5"
                  style={{
                    background: done ? `${P.primary}10` : `${P.surfaceLight}66`,
                    border: `1px solid ${done ? P.primary + "33" : P.border}`,
                  }}
                >
                  <div
                    className="w-5 h-5 rounded-md flex items-center justify-center shrink-0 transition-all"
                    style={{
                      background: done ? P.primary : "transparent",
                      border: `1.5px solid ${done ? P.primary : P.textFaint}`,
                    }}
                  >
                    {done && <Check size={11} strokeWidth={3} style={{ color: P.bg }} />}
                  </div>
                  <span
                    className="flex-1 text-[13.5px] font-semibold"
                    style={{
                      color: done ? P.primary : P.text,
                      textDecoration: done ? "line-through" : "none",
                      textDecorationColor: `${P.primary}66`,
                    }}
                  >
                    {r}
                  </span>
                  <ChevronRight size={14} style={{ color: P.textFaint }} />
                </button>
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
              {doneCount}/{data.readings.length}
            </span>
          </div>
        </>
      )}
    </ArtifactShell>
  );
}
