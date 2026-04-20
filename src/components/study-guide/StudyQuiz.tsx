import { useState } from "react";
import { Check, X, Trophy, RotateCcw } from "lucide-react";
import type { QuizQuestion } from "@/components/mindmap/types";

export default function StudyQuiz({ questions }: { questions: QuizQuestion[] }) {
  const [idx, setIdx] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [score, setScore] = useState(0);
  const [done, setDone] = useState(false);

  if (!questions || questions.length === 0) return null;
  const q = questions[idx];

  const choose = (i: number) => {
    if (revealed) return;
    setSelected(i);
  };

  const verify = () => {
    if (selected === null) return;
    setRevealed(true);
    if (q.answer_index !== null && q.answer_index !== undefined && selected === q.answer_index) {
      setScore(s => s + 1);
    }
  };

  const next = () => {
    if (idx + 1 >= questions.length) {
      setDone(true);
      return;
    }
    setIdx(i => i + 1);
    setSelected(null);
    setRevealed(false);
  };

  const restart = () => {
    setIdx(0);
    setSelected(null);
    setRevealed(false);
    setScore(0);
    setDone(false);
  };

  if (done) {
    const pct = Math.round((score / questions.length) * 100);
    return (
      <div
        className="rounded-2xl p-6 text-center my-4"
        style={{ background: "hsl(var(--primary) / 0.06)", border: "1px solid hsl(var(--primary) / 0.2)" }}
      >
        <Trophy className="mx-auto mb-3 text-primary" size={36} />
        <p className="font-display text-2xl font-bold text-foreground mb-1">
          {score} / {questions.length}
        </p>
        <p className="text-sm font-body text-muted-foreground mb-4">
          Você acertou {pct}% das perguntas
        </p>
        <button
          onClick={restart}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-ui font-semibold transition-all hover:scale-105"
          style={{ background: "hsl(var(--primary))", color: "hsl(var(--primary-foreground))" }}
        >
          <RotateCcw size={14} /> Refazer
        </button>
      </div>
    );
  }

  return (
    <div
      className="rounded-2xl p-5 my-4"
      style={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }}
    >
      <div className="flex items-center justify-between mb-3">
        <span className="text-[10px] tracking-[2px] uppercase text-primary/70 font-ui">
          Fixando o conteúdo
        </span>
        <span className="text-xs text-muted-foreground font-ui">
          {idx + 1} / {questions.length}
        </span>
      </div>
      <p className="font-display text-base font-semibold text-foreground mb-4 leading-snug">
        {q.question}
      </p>
      <div className="space-y-2 mb-4">
        {q.options.map((opt, i) => {
          const isCorrect = revealed && i === q.answer_index;
          const isWrong = revealed && i === selected && i !== q.answer_index;
          const isSelected = selected === i;
          return (
            <button
              key={i}
              onClick={() => choose(i)}
              disabled={revealed}
              className="w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-left text-[14px] font-body transition-all disabled:cursor-default"
              style={{
                background: isCorrect
                  ? "hsl(142 70% 45% / 0.12)"
                  : isWrong
                  ? "hsl(var(--destructive) / 0.12)"
                  : isSelected
                  ? "hsl(var(--primary) / 0.08)"
                  : "hsl(var(--muted) / 0.4)",
                border: isCorrect
                  ? "1px solid hsl(142 70% 45% / 0.4)"
                  : isWrong
                  ? "1px solid hsl(var(--destructive) / 0.4)"
                  : isSelected
                  ? "1px solid hsl(var(--primary) / 0.4)"
                  : "1px solid hsl(var(--border))",
                color: "hsl(var(--foreground))",
              }}
            >
              <span
                className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 text-[11px] font-ui"
                style={{
                  background: isSelected || isCorrect ? "hsl(var(--primary) / 0.15)" : "transparent",
                  border: "1px solid hsl(var(--border))",
                }}
              >
                {isCorrect ? <Check size={11} /> : isWrong ? <X size={11} /> : String.fromCharCode(65 + i)}
              </span>
              <span className="flex-1">{opt}</span>
            </button>
          );
        })}
      </div>
      {!revealed ? (
        <button
          onClick={verify}
          disabled={selected === null}
          className="w-full py-2.5 rounded-xl text-sm font-ui font-semibold transition-all disabled:opacity-40"
          style={{ background: "hsl(var(--primary))", color: "hsl(var(--primary-foreground))" }}
        >
          Verificar
        </button>
      ) : (
        <button
          onClick={next}
          className="w-full py-2.5 rounded-xl text-sm font-ui font-semibold transition-all"
          style={{ background: "hsl(var(--primary))", color: "hsl(var(--primary-foreground))" }}
        >
          {idx + 1 >= questions.length ? "Ver resultado" : "Próxima"}
        </button>
      )}
    </div>
  );
}
