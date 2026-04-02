import { useState, useEffect, useCallback, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { quizQuestions, quizStages, motivationalPhrases } from "@/data/quizData";
import type { QuizQuestion } from "@/data/quizData";

interface QuizProps {
  userCodeId: string;
}

interface StageProgress {
  stage_id: number;
  best_score: number;
  stars: number;
  completed: boolean;
  attempts: number;
}

// ── Helpers ──

function shuffleArray<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function getStars(score: number, total: number): number {
  const pct = score / total;
  if (pct >= 0.9) return 3;
  if (pct >= 0.75) return 2;
  if (pct >= 0.6) return 1;
  return 0;
}

const QUIZ_STORAGE_KEY = "quiz-progress-local";

export default function Quiz({ userCodeId }: QuizProps) {
  const [screen, setScreen] = useState<"trail" | "playing" | "result" | "complete">("trail");
  const [progress, setProgress] = useState<StageProgress[]>([]);
  const [currentStage, setCurrentStage] = useState(1);
  const [questions, setQuestions] = useState<(QuizQuestion & { shuffledOptions: string[]; originalCorrectIndex: number })[]>([]);
  const [currentQ, setCurrentQ] = useState(0);
  const [score, setScore] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [showExplanation, setShowExplanation] = useState(false);
  const [loading, setLoading] = useState(true);

  // ── Load progress ──
  const loadProgress = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await supabase
        .from("quiz_progress")
        .select("stage_id, best_score, stars, completed, attempts")
        .eq("user_code_id", userCodeId);
      if (data && data.length > 0) {
        setProgress(data as StageProgress[]);
        localStorage.setItem(QUIZ_STORAGE_KEY, JSON.stringify(data));
      } else {
        // Try localStorage fallback
        const local = localStorage.getItem(QUIZ_STORAGE_KEY);
        if (local) setProgress(JSON.parse(local));
      }
    } catch {
      const local = localStorage.getItem(QUIZ_STORAGE_KEY);
      if (local) setProgress(JSON.parse(local));
    }
    setLoading(false);
  }, [userCodeId]);

  useEffect(() => { loadProgress(); }, [loadProgress]);

  // ── Save progress ──
  const saveProgress = useCallback(async (stageId: number, newScore: number) => {
    const existing = progress.find(p => p.stage_id === stageId);
    const bestScore = Math.max(newScore, existing?.best_score ?? 0);
    const stars = getStars(bestScore, 15);
    const completed = bestScore >= 9; // 60%
    const attempts = (existing?.attempts ?? 0) + 1;

    const updated: StageProgress = { stage_id: stageId, best_score: bestScore, stars, completed, attempts };

    const newProgress = [...progress.filter(p => p.stage_id !== stageId), updated];
    setProgress(newProgress);
    localStorage.setItem(QUIZ_STORAGE_KEY, JSON.stringify(newProgress));

    try {
      await supabase.from("quiz_progress").upsert({
        user_code_id: userCodeId,
        stage_id: stageId,
        best_score: bestScore,
        stars,
        completed,
        attempts,
        total_questions: 15,
        last_attempt_at: new Date().toISOString(),
      }, { onConflict: "user_code_id,stage_id" });
    } catch (e) {
      console.error("Failed to save quiz progress:", e);
    }
  }, [progress, userCodeId]);

  // ── Stage status helpers ──
  const getStageStatus = useCallback((stageId: number): "locked" | "available" | "completed" => {
    if (stageId === 1) {
      const p = progress.find(s => s.stage_id === 1);
      return p?.completed ? "completed" : "available";
    }
    const prev = progress.find(s => s.stage_id === stageId - 1);
    if (!prev?.completed) return "locked";
    const current = progress.find(s => s.stage_id === stageId);
    return current?.completed ? "completed" : "available";
  }, [progress]);

  // ── Start quiz ──
  const startQuiz = useCallback((stageId: number) => {
    const stageQuestions = quizQuestions.filter(q => q.stageId === stageId);
    const shuffled = shuffleArray(stageQuestions).map(q => {
      // Shuffle options and track correct answer
      const correctAnswer = q.options[q.correctIndex];
      const shuffledOptions = shuffleArray(q.options);
      const newCorrectIndex = shuffledOptions.indexOf(correctAnswer);
      return { ...q, shuffledOptions, originalCorrectIndex: newCorrectIndex };
    });
    setQuestions(shuffled);
    setCurrentStage(stageId);
    setCurrentQ(0);
    setScore(0);
    setSelectedAnswer(null);
    setShowExplanation(false);
    setScreen("playing");
  }, []);

  // ── Handle answer ──
  const handleAnswer = useCallback((idx: number) => {
    if (selectedAnswer !== null) return;
    setSelectedAnswer(idx);
    const isCorrect = idx === questions[currentQ].originalCorrectIndex;
    if (isCorrect) setScore(s => s + 1);
    setShowExplanation(true);
  }, [selectedAnswer, questions, currentQ]);

  // ── Next question ──
  const nextQuestion = useCallback(async () => {
    if (currentQ + 1 >= questions.length) {
      const finalScore = score + (selectedAnswer === questions[currentQ].originalCorrectIndex ? 0 : 0);
      // score was already incremented in handleAnswer
      await saveProgress(currentStage, score);

      // Check if all stages completed
      const allCompleted = quizStages.every(s => {
        if (s.id === currentStage) return score >= 9;
        const p = progress.find(pr => pr.stage_id === s.id);
        return p?.completed;
      });

      setScreen(allCompleted ? "complete" : "result");
    } else {
      setCurrentQ(c => c + 1);
      setSelectedAnswer(null);
      setShowExplanation(false);
    }
  }, [currentQ, questions, score, saveProgress, currentStage, progress, selectedAnswer]);

  const completedCount = useMemo(() => progress.filter(p => p.completed).length, [progress]);
  const totalStars = useMemo(() => progress.reduce((sum, p) => sum + p.stars, 0), [progress]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // ══════════════════════════════════════════════════════════════════
  // ── TRAIL SCREEN ──
  // ══════════════════════════════════════════════════════════════════
  if (screen === "trail") {
    return (
      <div className="px-4 py-6 max-w-lg mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="font-display text-2xl font-bold text-foreground tracking-wide">
            Quiz Pneumatologia
          </h1>
          <p className="font-body text-sm text-muted-foreground italic mt-1">
            Teste seu conhecimento sobre o Espírito Santo
          </p>
          <div className="mt-3 inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-card border border-border">
            <span className="text-xs text-primary font-display font-semibold tracking-wider uppercase">
              {completedCount}/6 etapas
            </span>
            {totalStars > 0 && (
              <span className="text-xs text-primary">⭐ {totalStars}/18</span>
            )}
          </div>
        </div>

        {/* Trail */}
        <div className="relative flex flex-col items-center gap-4">
          {/* Connecting line */}
          <div className="absolute top-0 bottom-0 w-px left-1/2 -translate-x-1/2"
            style={{ background: "linear-gradient(180deg, hsl(var(--primary)/0.3), hsl(var(--primary)/0.05))" }} />

          {quizStages.map((stage, i) => {
            const status = getStageStatus(stage.id);
            const stageProgress = progress.find(p => p.stage_id === stage.id);
            const isEven = i % 2 === 0;

            return (
              <div key={stage.id}
                className={`relative z-10 flex items-center gap-4 w-full ${isEven ? "justify-start pl-[10%]" : "justify-end pr-[10%]"}`}
                style={{ animationDelay: `${i * 100}ms` }}>
                <div className="flex flex-col items-center gap-1.5">
                  {/* Circle */}
                  <button
                    onClick={() => status !== "locked" && startQuiz(stage.id)}
                    disabled={status === "locked"}
                    className={`w-[72px] h-[72px] rounded-full flex items-center justify-center text-2xl font-display font-bold
                      border-2 transition-all duration-300 relative
                      ${status === "locked"
                        ? "bg-muted/30 border-border/30 opacity-40 cursor-not-allowed"
                        : status === "completed"
                          ? "bg-primary border-primary text-primary-foreground cursor-pointer shadow-[0_0_20px_hsl(var(--primary)/0.3)]"
                          : "bg-card border-primary cursor-pointer shadow-[0_0_15px_hsl(var(--primary)/0.2)] animate-pulse"
                      }`}
                  >
                    {status === "locked" ? "🔒" : status === "completed" ? "✓" : stage.icon}
                  </button>

                  {/* Stage name */}
                  <span className={`text-[11px] font-display font-semibold tracking-wider text-center max-w-[120px] leading-tight
                    ${status === "locked" ? "text-muted-foreground/40" : "text-foreground"}`}>
                    {stage.name}
                  </span>

                  {/* Stars */}
                  {stageProgress && stageProgress.stars > 0 && (
                    <div className="flex gap-0.5">
                      {[1, 2, 3].map(s => (
                        <span key={s} className={`text-sm ${s <= stageProgress.stars ? "opacity-100" : "opacity-20"}`}>
                          ⭐
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // ══════════════════════════════════════════════════════════════════
  // ── PLAYING SCREEN ──
  // ══════════════════════════════════════════════════════════════════
  if (screen === "playing") {
    const q = questions[currentQ];
    const stage = quizStages.find(s => s.id === currentStage);

    return (
      <div className="px-4 py-4 max-w-lg mx-auto min-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <button onClick={() => setScreen("trail")}
            className="text-muted-foreground text-sm font-display hover:text-foreground transition-colors">
            ← Sair
          </button>
          <span className="text-xs font-display text-muted-foreground tracking-wider uppercase">
            {stage?.icon} Etapa {currentStage}
          </span>
        </div>

        {/* Progress bar */}
        <div className="mb-6">
          <div className="flex justify-between items-center mb-1.5">
            <span className="text-xs text-muted-foreground font-display">{currentQ + 1} de {questions.length}</span>
            <span className="text-xs text-primary font-display font-semibold">{score} acertos</span>
          </div>
          <div className="h-2 rounded-full bg-muted overflow-hidden">
            <div className="h-full rounded-full transition-all duration-500 ease-out"
              style={{
                width: `${((currentQ + 1) / questions.length) * 100}%`,
                background: "linear-gradient(90deg, hsl(var(--primary)), hsl(var(--primary)/0.7))"
              }} />
          </div>
        </div>

        {/* Question */}
        <div className="mb-6 animate-fade-in">
          <h2 className="font-display text-lg font-semibold text-foreground leading-relaxed">
            {q.question}
          </h2>
        </div>

        {/* Options */}
        <div className="flex flex-col gap-3 mb-6">
          {q.shuffledOptions.map((option, idx) => {
            const isSelected = selectedAnswer === idx;
            const isCorrect = idx === q.originalCorrectIndex;
            const isAnswered = selectedAnswer !== null;

            let cardClass = "bg-card border-border hover:border-primary/40";
            if (isAnswered) {
              if (isCorrect) {
                cardClass = "bg-[#1a2e1a] border-[#4ade80]";
              } else if (isSelected && !isCorrect) {
                cardClass = "bg-[#2e1a1a] border-[#ef4444] animate-[shake_0.3s_ease]";
              } else {
                cardClass = "bg-card/50 border-border/50 opacity-60";
              }
            }

            return (
              <button
                key={idx}
                onClick={() => handleAnswer(idx)}
                disabled={isAnswered}
                className={`w-full text-left px-5 py-4 rounded-[14px] border-2 transition-all duration-300
                  font-body text-[15px] leading-relaxed
                  ${cardClass}
                  ${!isAnswered ? "cursor-pointer active:scale-[0.98]" : "cursor-default"}`}
                style={{ animationDelay: `${idx * 80}ms` }}
              >
                <div className="flex items-start gap-3">
                  <span className="shrink-0 mt-0.5">
                    {isAnswered && isCorrect ? "✓" : isAnswered && isSelected && !isCorrect ? "✗" : ""}
                  </span>
                  <span className={isAnswered && isCorrect ? "text-[#4ade80] font-semibold" : isAnswered && isSelected && !isCorrect ? "text-[#ef4444]" : "text-foreground"}>
                    {option}
                  </span>
                </div>
              </button>
            );
          })}
        </div>

        {/* Explanation card */}
        {showExplanation && (
          <div className="mb-6 p-4 rounded-xl bg-[#252525] border-l-[3px] border-l-primary animate-fade-in">
            <p className="font-body text-[14px] leading-relaxed text-text-secondary">
              {q.explanation}
            </p>
          </div>
        )}

        {/* Next button */}
        {showExplanation && (
          <div className="mt-auto pb-4">
            <button onClick={nextQuestion}
              className="w-full py-3.5 rounded-xl bg-primary text-primary-foreground font-display font-semibold
                text-sm tracking-wider uppercase transition-all duration-200 hover:opacity-90 active:scale-[0.98]">
              {currentQ + 1 >= questions.length ? "Ver Resultado" : "Próxima"}
            </button>
          </div>
        )}
      </div>
    );
  }

  // ══════════════════════════════════════════════════════════════════
  // ── RESULT SCREEN ──
  // ══════════════════════════════════════════════════════════════════
  if (screen === "result") {
    const stars = getStars(score, 15);
    const passed = stars >= 1;
    const phrase = motivationalPhrases[Math.floor(Math.random() * motivationalPhrases.length)];

    return (
      <div className="px-4 py-8 max-w-lg mx-auto text-center animate-fade-in">
        {/* Score */}
        <div className="mb-6">
          <div className="text-6xl font-display font-bold text-primary mb-2">
            {score}
          </div>
          <div className="text-lg text-muted-foreground font-body">
            de {questions.length} acertos
          </div>
        </div>

        {/* Stars */}
        <div className="flex justify-center gap-2 mb-6">
          {[1, 2, 3].map(s => (
            <span key={s}
              className={`text-4xl transition-all duration-500 ${s <= stars ? "scale-100 opacity-100" : "scale-75 opacity-20"}`}
              style={{ animationDelay: `${s * 300}ms`, transitionDelay: `${s * 300}ms` }}>
              ⭐
            </span>
          ))}
        </div>

        {/* Message */}
        <p className={`text-sm font-display font-semibold mb-2 ${passed ? "text-[#4ade80]" : "text-[#ef4444]"}`}>
          {passed ? "Etapa concluída!" : "Tente novamente para desbloquear a próxima etapa"}
        </p>
        <p className="text-sm text-muted-foreground font-body italic mb-8 max-w-xs mx-auto">
          "{phrase}"
        </p>

        {/* Buttons */}
        <div className="flex flex-col gap-3">
          <button onClick={() => startQuiz(currentStage)}
            className="w-full py-3 rounded-xl bg-card border border-border text-foreground font-display
              text-sm tracking-wider uppercase hover:border-primary/40 transition-all duration-200">
            Tentar Novamente
          </button>
          <button onClick={() => { setScreen("trail"); loadProgress(); }}
            className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-display font-semibold
              text-sm tracking-wider uppercase hover:opacity-90 transition-all duration-200">
            Voltar à Trilha
          </button>
        </div>
      </div>
    );
  }

  // ══════════════════════════════════════════════════════════════════
  // ── COMPLETION SCREEN ──
  // ══════════════════════════════════════════════════════════════════
  if (screen === "complete") {
    return (
      <div className="px-4 py-8 max-w-lg mx-auto text-center animate-fade-in">
        <div className="text-6xl mb-4">👑</div>
        <h2 className="font-display text-xl font-bold text-foreground mb-2">
          Parabéns!
        </h2>
        <p className="font-body text-muted-foreground mb-2">
          Você completou o estudo de Pneumatologia.
        </p>
        <p className="font-body text-sm text-muted-foreground italic mb-6">
          "Que o Espírito Santo continue iluminando seu caminho."
        </p>
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-card border border-primary/30 mb-8">
          <span className="text-primary font-display font-semibold">⭐ {totalStars}/18 estrelas</span>
        </div>
        <button onClick={() => { setScreen("trail"); loadProgress(); }}
          className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-display font-semibold
            text-sm tracking-wider uppercase hover:opacity-90 transition-all duration-200">
          Voltar à Trilha
        </button>
      </div>
    );
  }

  return null;
}
