import { useState, useEffect, useCallback, useMemo } from "react";
import { X, ChevronLeft, ChevronRight, BookOpen, Map, CheckCircle2, XCircle } from "lucide-react";
import type { AnalysisResult, KeyConcept } from "./types";
import { getCategoryColor, getCategoryName } from "./types";

interface QuizQuestion {
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

function generateTopicQuiz(concept: KeyConcept, allTopics: KeyConcept[]): QuizQuestion | null {
  const note = concept.expanded_note;
  const coreIdea = note?.core_idea || concept.coreIdea || concept.description;
  if (!coreIdea) return null;

  const distractors = allTopics
    .filter(c => c.id !== concept.id)
    .map(c => c.expanded_note?.core_idea || c.coreIdea || c.description)
    .filter(Boolean)
    .sort(() => Math.random() - 0.5)
    .slice(0, 3);

  if (distractors.length < 2) return null;

  const options = [...distractors.slice(0, 3), coreIdea].sort(() => Math.random() - 0.5);
  return {
    question: `Qual é a ideia central de "${concept.title}"?`,
    options,
    correctIndex: options.indexOf(coreIdea),
    explanation: coreIdea,
  };
}

interface PresentationModeProps {
  analysis: AnalysisResult;
  onExit: () => void;
}

// Slide types: "cover" | "topic" | "quiz"
type SlideType = { kind: "cover" } | { kind: "topic"; topicIndex: number } | { kind: "quiz"; topicIndex: number; quiz: QuizQuestion };

export default function PresentationMode({ analysis, onExit }: PresentationModeProps) {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [direction, setDirection] = useState<"next" | "prev">("next");
  const [showMiniMap, setShowMiniMap] = useState(false);

  // Quiz state per slide
  const [quizSelected, setQuizSelected] = useState<number | null>(null);
  const [quizAnswered, setQuizAnswered] = useState(false);
  const [quizScore, setQuizScore] = useState(0);
  const [quizTotal, setQuizTotal] = useState(0);

  const topics = useMemo(
    () => (analysis.key_concepts || []).filter(c => !c.type || c.type === "topic"),
    [analysis]
  );

  // Build slide sequence: cover, then for each topic: topic slide + quiz slide
  const slides = useMemo(() => {
    const s: SlideType[] = [{ kind: "cover" }];
    topics.forEach((concept, i) => {
      s.push({ kind: "topic", topicIndex: i });
      const quiz = generateTopicQuiz(concept, topics);
      if (quiz) {
        s.push({ kind: "quiz", topicIndex: i, quiz });
      }
    });
    return s;
  }, [topics]);

  const totalSlides = slides.length;
  const current = slides[currentSlide];

  const resetQuizState = useCallback(() => {
    setQuizSelected(null);
    setQuizAnswered(false);
  }, []);

  const goNext = useCallback(() => {
    if (currentSlide < totalSlides - 1) {
      // Block advancing from unanswered quiz
      if (current?.kind === "quiz" && !quizAnswered) return;
      setDirection("next");
      setCurrentSlide(s => s + 1);
      resetQuizState();
    }
  }, [currentSlide, totalSlides, current, quizAnswered, resetQuizState]);

  const goPrev = useCallback(() => {
    if (currentSlide > 0) {
      setDirection("prev");
      setCurrentSlide(s => s - 1);
      resetQuizState();
    }
  }, [currentSlide, resetQuizState]);

  // Keyboard + click
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onExit();
      if (e.key === "ArrowRight" || e.key === " ") { e.preventDefault(); goNext(); }
      if (e.key === "ArrowLeft") goPrev();
      if (e.key === "m" || e.key === "M") setShowMiniMap(s => !s);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [goNext, goPrev, onExit]);

  // Fullscreen
  useEffect(() => {
    document.documentElement.requestFullscreen?.().catch(() => {});
    return () => { document.exitFullscreen?.().catch(() => {}); };
  }, []);

  // Touch swipe
  const touchRef = { startX: 0 };
  const onTouchStart = (e: React.TouchEvent) => { touchRef.startX = e.touches[0].clientX; };
  const onTouchEnd = (e: React.TouchEvent) => {
    const dx = e.changedTouches[0].clientX - touchRef.startX;
    if (Math.abs(dx) > 60) { dx < 0 ? goNext() : goPrev(); }
  };

  const handleClick = (e: React.MouseEvent) => {
    // Don't navigate by click on quiz slides
    if (current?.kind === "quiz") return;
    const x = e.clientX / window.innerWidth;
    if (x > 0.5) goNext(); else goPrev();
  };

  const handleQuizSelect = (idx: number) => {
    if (quizAnswered || current?.kind !== "quiz") return;
    setQuizSelected(idx);
    setQuizAnswered(true);
    setQuizTotal(t => t + 1);
    if (idx === current.quiz.correctIndex) setQuizScore(s => s + 1);
  };

  // ── Slide renderers ──

  const renderCoverSlide = () => (
    <div className="flex flex-col items-center justify-center h-full px-8">
      <h1
        className="font-display font-bold text-center uppercase tracking-[2px] mb-6"
        style={{ color: "#ede4d3", fontSize: "clamp(32px, 5vw, 56px)", lineHeight: 1.15 }}
      >
        {analysis.main_theme || analysis.hierarchy?.root?.label}
      </h1>
      <div className="w-[60px] h-[2px] mb-6" style={{ background: "#c4a46a" }} />
      {analysis.summary && (
        <p
          className="font-body text-center italic max-w-[600px]"
          style={{ color: "#c4b89e", fontSize: "clamp(16px, 2vw, 22px)", lineHeight: 1.6 }}
        >
          {analysis.summary}
        </p>
      )}
      <p className="mt-10 text-[12px] font-sans tracking-[3px] uppercase" style={{ color: "#5c5347" }}>
        {topics.length} tópicos · {quizTotal > 0 ? `${quizScore}/${quizTotal} quiz` : "com quiz interativo"}
      </p>
    </div>
  );

  const renderTopicSlide = (concept: KeyConcept) => {
    const note = concept.expanded_note;
    const coreIdea = note?.core_idea || concept.coreIdea || "";
    const affirmations = note?.affirmations || concept.keyPoints || [];
    const verses = note?.verses || concept.bible_refs || [];
    const impactPhrase = note?.impact_phrase || concept.impactPhrase || "";
    const catColor = getCategoryColor(concept.category);

    return (
      <div className="flex flex-col justify-center h-full px-8 max-w-[720px] mx-auto">
        <span className="text-[10px] font-sans font-bold tracking-[2px] uppercase mb-4 self-start" style={{ color: catColor }}>
          {getCategoryName(concept.category)}
        </span>
        <h2 className="font-display font-bold mb-4" style={{ color: "#ede4d3", fontSize: "clamp(28px, 4vw, 48px)", lineHeight: 1.15 }}>
          {concept.title}
        </h2>
        <div className="w-[60px] h-[2px] mb-6" style={{ background: catColor }} />

        {coreIdea && (
          <p className="font-body italic mb-8" style={{ color: "#d4b87a", fontSize: "clamp(16px, 2vw, 24px)", lineHeight: 1.5 }}>
            "{coreIdea}"
          </p>
        )}

        {affirmations.length > 0 && (
          <ul className="space-y-3 mb-8">
            {affirmations.slice(0, 5).map((a, i) => (
              <li key={i} className="flex items-start gap-3">
                <span className="mt-2 w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: catColor }} />
                <span className="font-body" style={{ color: "#c4b89e", fontSize: "clamp(14px, 1.5vw, 20px)", lineHeight: 1.6 }}>{a}</span>
              </li>
            ))}
          </ul>
        )}

        {verses.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-8">
            {verses.map((v, i) => (
              <span key={i} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full"
                style={{ background: "rgba(123,163,201,0.08)", border: "1px solid rgba(123,163,201,0.25)" }}>
                <BookOpen size={12} style={{ color: "#7ba3c9" }} />
                <span className="font-body italic text-[13px]" style={{ color: "#7ba3c9" }}>{v}</span>
              </span>
            ))}
          </div>
        )}

        {impactPhrase && (
          <div className="mt-4 pt-4" style={{ borderTop: "1px solid rgba(196,164,106,0.1)" }}>
            <p className="font-body font-semibold text-center italic" style={{ color: "#d4b87a", fontSize: "clamp(14px, 1.5vw, 18px)" }}>
              "{impactPhrase}"
            </p>
          </div>
        )}
      </div>
    );
  };

  const renderQuizSlide = (topicIndex: number, quiz: QuizQuestion) => {
    const concept = topics[topicIndex];
    const catColor = getCategoryColor(concept?.category);

    return (
      <div className="flex flex-col justify-center h-full px-8 max-w-[560px] mx-auto" onClick={e => e.stopPropagation()}>
        {/* Badge */}
        <div className="flex items-center gap-2 mb-6">
          <span className="px-2.5 py-1 rounded-md text-[9px] font-sans font-bold tracking-[1.5px] uppercase"
            style={{ background: `${catColor}15`, color: catColor }}>
            🧠 QUIZ
          </span>
          <span className="text-[11px] font-sans" style={{ color: "#8a7d6a" }}>{concept?.title}</span>
        </div>

        <h3 className="font-display text-xl font-bold leading-snug mb-8" style={{ color: "#ede4d3", fontSize: "clamp(20px, 3vw, 32px)" }}>
          {quiz.question}
        </h3>

        <div className="space-y-3">
          {quiz.options.map((opt, idx) => {
            const isSelected = quizSelected === idx;
            const isCorrect = idx === quiz.correctIndex;
            let borderColor = "rgba(196,164,106,0.15)";
            let bgColor = "rgba(22,19,15,0.8)";
            let textColor = "#c4b89e";
            let icon = null;

            if (quizAnswered) {
              if (isCorrect) {
                borderColor = "#8b9e7a";
                bgColor = "rgba(139,158,122,0.1)";
                textColor = "#8b9e7a";
                icon = <CheckCircle2 size={18} style={{ color: "#8b9e7a" }} />;
              } else if (isSelected && !isCorrect) {
                borderColor = "#d4854a";
                bgColor = "rgba(212,133,74,0.1)";
                textColor = "#d4854a";
                icon = <XCircle size={18} style={{ color: "#d4854a" }} />;
              } else {
                textColor = "#5c5347";
              }
            }

            return (
              <button
                key={idx}
                onClick={() => handleQuizSelect(idx)}
                disabled={quizAnswered}
                className="w-full text-left px-5 py-4 rounded-xl flex items-center gap-3 transition-all active:scale-[0.98]"
                style={{ background: bgColor, border: `1.5px solid ${borderColor}`, cursor: quizAnswered ? "default" : "pointer" }}
              >
                <span className="w-8 h-8 rounded-lg flex items-center justify-center text-[13px] font-sans font-bold shrink-0"
                  style={{ background: quizAnswered && isCorrect ? "rgba(139,158,122,0.2)" : "rgba(196,164,106,0.08)", color: quizAnswered && isCorrect ? "#8b9e7a" : "#8a7d6a" }}>
                  {String.fromCharCode(65 + idx)}
                </span>
                <span className="flex-1 text-[15px] font-sans leading-relaxed" style={{ color: textColor }}>{opt}</span>
                {icon}
              </button>
            );
          })}
        </div>

        {quizAnswered && (
          <div className="mt-6 animate-fade-in">
            <div className="rounded-xl p-4" style={{ background: "rgba(196,164,106,0.04)", borderLeft: "3px solid rgba(196,164,106,0.3)" }}>
              <p className="text-[10px] font-sans font-bold tracking-[1.5px] uppercase mb-2" style={{ color: "#8a7d6a" }}>Explicação</p>
              <p className="text-[14px] font-body italic leading-relaxed" style={{ color: "#c4b89e" }}>{quiz.explanation}</p>
            </div>
            <button onClick={goNext}
              className="w-full mt-4 py-3 rounded-xl text-sm font-sans font-semibold transition-all active:scale-95"
              style={{ background: "rgba(196,164,106,0.12)", color: "#c4a46a", border: "1px solid rgba(196,164,106,0.2)" }}>
              {currentSlide + 1 >= totalSlides ? "Finalizar" : "Próximo →"}
            </button>
          </div>
        )}
      </div>
    );
  };

  // Progress (topic-based, not counting quiz slides)
  const topicSlideIndices = slides.map((s, i) => s.kind === "topic" ? i : -1).filter(i => i >= 0);
  const currentTopicProgress = topicSlideIndices.filter(i => i <= currentSlide).length;

  return (
    <div
      className="fixed inset-0 z-[200] flex flex-col select-none"
      style={{ background: "#0f0d0a", cursor: current?.kind === "quiz" ? "default" : "none" }}
      onClick={handleClick}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      {/* Progress bar */}
      <div className="h-1 w-full shrink-0" style={{ background: "rgba(196,164,106,0.06)" }}>
        <div className="h-full transition-all duration-500" style={{
          width: `${(currentTopicProgress / topics.length) * 100}%`,
          background: "linear-gradient(90deg, #c4a46a, #d4b87a)",
        }} />
      </div>

      {/* Slide content */}
      <div className="flex-1 relative overflow-hidden">
        <div
          key={currentSlide}
          className="absolute inset-0"
          style={{ animation: `presentation-${direction === "next" ? "enter" : "enter-prev"} 0.4s cubic-bezier(0.4, 0, 0.2, 1)` }}
        >
          {current?.kind === "cover" && renderCoverSlide()}
          {current?.kind === "topic" && renderTopicSlide(topics[current.topicIndex])}
          {current?.kind === "quiz" && renderQuizSlide(current.topicIndex, current.quiz)}
        </div>
      </div>

      {/* Bottom bar */}
      <div className="flex items-center justify-between px-6 py-3 shrink-0"
        style={{ background: "rgba(15,13,10,0.8)" }}
        onClick={e => e.stopPropagation()}>
        <button onClick={goPrev} disabled={currentSlide === 0}
          className="p-2 rounded-lg transition-opacity disabled:opacity-10" style={{ color: "#c4a46a" }}>
          <ChevronLeft size={24} />
        </button>

        <div className="flex items-center gap-4">
          {quizTotal > 0 && (
            <span className="text-[12px] font-sans font-semibold" style={{ color: "#8b9e7a" }}>
              ✅ {quizScore}/{quizTotal}
            </span>
          )}
          <button onClick={() => setShowMiniMap(s => !s)}
            className="p-2 rounded-lg transition-colors hover:bg-white/5"
            style={{ color: showMiniMap ? "#c4a46a" : "#5c5347" }}>
            <Map size={16} />
          </button>
          <span className="text-[14px] font-sans" style={{ color: "#5c5347" }}>
            {currentSlide + 1} / {totalSlides}
          </span>
          <button onClick={onExit} className="p-2 rounded-lg transition-colors hover:bg-white/5" style={{ color: "#8a7d6a" }}>
            <X size={16} />
          </button>
        </div>

        <button onClick={goNext}
          disabled={currentSlide === totalSlides - 1 || (current?.kind === "quiz" && !quizAnswered)}
          className="p-2 rounded-lg transition-opacity disabled:opacity-10" style={{ color: "#c4a46a" }}>
          <ChevronRight size={24} />
        </button>
      </div>

      {/* Mini-map */}
      {showMiniMap && (
        <div className="absolute bottom-16 right-4 rounded-xl overflow-hidden"
          style={{ background: "rgba(30,26,20,0.95)", border: "1px solid rgba(196,164,106,0.15)", width: 200, padding: 12 }}
          onClick={e => e.stopPropagation()}>
          <p className="text-[9px] font-sans uppercase tracking-[1.5px] mb-2" style={{ color: "#5c5347" }}>Tópicos</p>
          <div className="space-y-1">
            {topics.map((t, i) => {
              const slideIdx = slides.findIndex(s => s.kind === "topic" && s.topicIndex === i);
              const isCurrent = current?.kind === "topic" && current.topicIndex === i;
              const isQuizCurrent = current?.kind === "quiz" && current.topicIndex === i;
              return (
                <button key={i}
                  onClick={() => { setDirection(slideIdx > currentSlide ? "next" : "prev"); setCurrentSlide(slideIdx); resetQuizState(); }}
                  className="w-full text-left px-2 py-1 rounded text-[10px] font-sans truncate transition-colors"
                  style={{
                    color: (isCurrent || isQuizCurrent) ? "#c4a46a" : "#8a7d6a",
                    background: (isCurrent || isQuizCurrent) ? "rgba(196,164,106,0.1)" : "transparent",
                  }}>
                  {i + 1}. {t.title}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
