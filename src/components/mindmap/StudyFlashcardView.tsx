import { useState, useCallback, useMemo } from "react";
import { ArrowLeft, Shuffle, RotateCcw } from "lucide-react";
import type { AnalysisResult, KeyConcept } from "./types";

interface StudyFlashcard {
  id: string;
  noteId: string;
  type: "concept" | "verse" | "application";
  front: string;
  back: string;
  difficulty: "easy" | "medium" | "hard";
  interval: number;
  easeFactor: number;
  repetitions: number;
}

const categoryColors: Record<string, string> = {
  teologia: "#c9a067",
  contexto: "#8b9e7a",
  "aplicação": "#7ba3c9",
  personagem: "#d4854a",
  lugar: "#6a9c8a",
  evento: "#b08db5",
};

const typeLabels: Record<string, { label: string; color: string }> = {
  concept: { label: "CONCEITO", color: "#c4a46a" },
  verse: { label: "VERSÍCULO", color: "#7ba3c9" },
  application: { label: "APLICAÇÃO", color: "#8b9e7a" },
};

function generateFlashcards(analysis: AnalysisResult): StudyFlashcard[] {
  const cards: StudyFlashcard[] = [];

  analysis.key_concepts?.forEach((concept, i) => {
    // Type 1: Concept
    const backParts: string[] = [];
    if (concept.coreIdea) backParts.push(concept.coreIdea);
    if (concept.keyPoints?.length) {
      backParts.push(concept.keyPoints.map(p => `• ${p}`).join("\n"));
    }
    cards.push({
      id: `fc-concept-${i}`,
      noteId: concept.id,
      type: "concept",
      front: `O que é ${concept.title}?`,
      back: backParts.join("\n\n") || concept.description,
      difficulty: "medium",
      interval: 1,
      easeFactor: 2.5,
      repetitions: 0,
    });

    // Type 2: Verse (if has bible refs)
    if (concept.bible_refs?.length) {
      const mainRef = concept.bible_refs[0];
      cards.push({
        id: `fc-verse-${i}`,
        noteId: concept.id,
        type: "verse",
        front: `${mainRef} — O que este versículo ensina sobre "${concept.title}"?`,
        back: concept.coreIdea || concept.description,
        difficulty: "medium",
        interval: 1,
        easeFactor: 2.5,
        repetitions: 0,
      });
    }

    // Type 3: Application
    if (concept.practicalApplication) {
      cards.push({
        id: `fc-app-${i}`,
        noteId: concept.id,
        type: "application",
        front: `Como "${concept.title}" se aplica na vida prática?`,
        back: `${concept.practicalApplication}${concept.impactPhrase ? `\n\n🔥 "${concept.impactPhrase}"` : ""}`,
        difficulty: "medium",
        interval: 1,
        easeFactor: 2.5,
        repetitions: 0,
      });
    }
  });

  return cards;
}

function calculateNextReview(
  quality: 0 | 1 | 2,
  repetitions: number,
  interval: number,
  easeFactor: number
): { interval: number; easeFactor: number; repetitions: number } {
  let newInterval: number;
  let newEF = easeFactor;
  let newReps = repetitions;

  if (quality === 0) {
    newInterval = 1;
    newReps = 0;
    newEF = Math.max(1.3, easeFactor - 0.3);
  } else if (quality === 1) {
    if (repetitions === 0) newInterval = 1;
    else if (repetitions === 1) newInterval = 3;
    else newInterval = Math.round(interval * easeFactor * 0.8);
    newReps = repetitions + 1;
    newEF = Math.max(1.3, easeFactor - 0.1);
  } else {
    if (repetitions === 0) newInterval = 3;
    else if (repetitions === 1) newInterval = 7;
    else newInterval = Math.round(interval * easeFactor);
    newReps = repetitions + 1;
    newEF = easeFactor + 0.1;
  }

  return { interval: newInterval, easeFactor: newEF, repetitions: newReps };
}

interface Props {
  analysis: AnalysisResult;
  onBack: () => void;
}

export default function StudyFlashcardView({ analysis, onBack }: Props) {
  const allCards = useMemo(() => generateFlashcards(analysis), [analysis]);
  const [cards, setCards] = useState(allCards);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [showDifficulty, setShowDifficulty] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [stats, setStats] = useState({ easy: 0, medium: 0, hard: 0 });

  const currentCard = cards[currentIndex];

  const shuffle = useCallback(() => {
    setCards(prev => [...prev].sort(() => Math.random() - 0.5));
    setCurrentIndex(0);
    setFlipped(false);
    setShowDifficulty(false);
  }, []);

  const reset = useCallback(() => {
    setCards(allCards);
    setCurrentIndex(0);
    setFlipped(false);
    setShowDifficulty(false);
    setCompleted(false);
    setStats({ easy: 0, medium: 0, hard: 0 });
  }, [allCards]);

  const handleFlip = () => {
    setFlipped(true);
    setShowDifficulty(true);
  };

  const handleDifficulty = (quality: 0 | 1 | 2) => {
    const card = cards[currentIndex];
    const result = calculateNextReview(quality, card.repetitions, card.interval, card.easeFactor);

    // Update card
    setCards(prev => prev.map((c, i) =>
      i === currentIndex
        ? { ...c, interval: result.interval, easeFactor: result.easeFactor, repetitions: result.repetitions }
        : c
    ));

    // Update stats
    const key = quality === 0 ? "hard" : quality === 1 ? "medium" : "easy";
    setStats(prev => ({ ...prev, [key]: prev[key] + 1 }));

    // Next card
    if (currentIndex + 1 >= cards.length) {
      setCompleted(true);
    } else {
      setCurrentIndex(prev => prev + 1);
      setFlipped(false);
      setShowDifficulty(false);
    }
  };

  if (cards.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full px-4">
        <p className="text-muted-foreground font-ui text-sm">Nenhum flashcard disponível</p>
        <button onClick={onBack} className="mt-4 text-xs text-primary font-ui">← Voltar</button>
      </div>
    );
  }

  // Completion screen
  if (completed) {
    const total = stats.easy + stats.medium + stats.hard;
    return (
      <div className="flex flex-col items-center justify-center h-full px-4 animate-fade-in">
        <div className="w-full max-w-sm rounded-2xl p-8 text-center"
          style={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }}>
          <p className="text-[10px] tracking-[2px] uppercase text-primary/60 font-ui mb-4">📊 Resultado</p>
          <p className="font-display text-2xl font-bold text-foreground mb-2">{total}/{cards.length}</p>
          <p className="text-sm text-muted-foreground font-ui mb-6">flashcards revisados</p>

          <div className="flex justify-center gap-6 mb-6">
            <div className="text-center">
              <p className="text-xl font-bold" style={{ color: "#d4854a" }}>{stats.hard}</p>
              <p className="text-[10px] font-ui text-muted-foreground">Difícil</p>
            </div>
            <div className="text-center">
              <p className="text-xl font-bold" style={{ color: "#c4a46a" }}>{stats.medium}</p>
              <p className="text-[10px] font-ui text-muted-foreground">Regular</p>
            </div>
            <div className="text-center">
              <p className="text-xl font-bold" style={{ color: "#8b9e7a" }}>{stats.easy}</p>
              <p className="text-[10px] font-ui text-muted-foreground">Fácil</p>
            </div>
          </div>

          <div className="flex gap-2">
            <button onClick={reset}
              className="flex-1 py-3 rounded-xl text-sm font-ui font-medium transition-all active:scale-95"
              style={{ background: "hsl(var(--primary) / 0.1)", color: "hsl(var(--primary))" }}>
              🔄 Revisar Novamente
            </button>
            <button onClick={onBack}
              className="flex-1 py-3 rounded-xl text-sm font-ui font-medium transition-all active:scale-95"
              style={{ background: "hsl(var(--muted))", color: "hsl(var(--muted-foreground))" }}>
              🗺️ Voltar
            </button>
          </div>
        </div>
      </div>
    );
  }

  const typeInfo = typeLabels[currentCard.type];

  return (
    <div className="flex flex-col h-full animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 shrink-0"
        style={{ borderBottom: "1px solid hsl(var(--border) / 0.2)" }}>
        <button onClick={onBack} className="flex items-center gap-1.5 text-xs text-muted-foreground font-ui hover:text-foreground transition-colors">
          <ArrowLeft size={14} /> Voltar
        </button>
        <p className="text-sm font-display font-semibold text-foreground">
          {currentIndex + 1}/{cards.length}
        </p>
        <div className="flex gap-2">
          <button onClick={shuffle} className="p-2 rounded-lg text-muted-foreground hover:text-primary transition-colors" title="Embaralhar">
            <Shuffle size={14} />
          </button>
          <button onClick={reset} className="p-2 rounded-lg text-muted-foreground hover:text-primary transition-colors" title="Reiniciar">
            <RotateCcw size={14} />
          </button>
        </div>
      </div>

      {/* Card area */}
      <div className="flex-1 flex flex-col items-center justify-center px-4 py-6">
        <div
          className="w-full max-w-[340px] h-[420px] cursor-pointer"
          style={{ perspective: "1000px" }}
          onClick={() => !flipped && handleFlip()}
        >
          <div
            className="relative w-full h-full transition-transform duration-500"
            style={{
              transformStyle: "preserve-3d",
              transform: flipped ? "rotateY(180deg)" : "none",
            }}
          >
            {/* Front */}
            <div className="absolute inset-0 rounded-[20px] flex flex-col items-center justify-center p-8 text-center"
              style={{
                backfaceVisibility: "hidden",
                background: "linear-gradient(145deg, hsl(var(--card)), hsl(var(--background-secondary, var(--card))))",
                border: "1.5px solid hsl(var(--primary) / 0.2)",
                boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
              }}>
              {/* Type badge */}
              <span className="absolute top-4 left-4 text-[9px] font-ui font-bold tracking-[2px] px-2.5 py-1 rounded-md"
                style={{ background: `${typeInfo.color}15`, color: typeInfo.color }}>
                {typeInfo.label}
              </span>
              <p className="font-body text-[22px] font-semibold leading-relaxed" style={{ color: "hsl(var(--foreground))" }}>
                {currentCard.front}
              </p>
              <p className="text-[11px] text-muted-foreground/40 font-ui mt-6">toque para virar</p>
            </div>

            {/* Back */}
            <div className="absolute inset-0 rounded-[20px] flex flex-col items-center justify-center p-8"
              style={{
                backfaceVisibility: "hidden",
                transform: "rotateY(180deg)",
                background: "linear-gradient(145deg, hsl(var(--card)), hsl(var(--background-secondary, var(--card))))",
                border: "1.5px solid hsl(var(--primary) / 0.35)",
                boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
              }}>
              <span className="absolute top-4 left-4 text-[9px] font-ui font-bold tracking-[2px] px-2.5 py-1 rounded-md"
                style={{ background: `${typeInfo.color}15`, color: typeInfo.color }}>
                {typeInfo.label}
              </span>
              <div className="text-left w-full">
                {currentCard.back.split("\n\n").map((block, i) => (
                  <div key={i} className={i > 0 ? "mt-3" : ""}>
                    {block.startsWith("🔥") ? (
                      <p className="font-body text-[14px] font-semibold text-center mt-3 pt-3"
                        style={{ color: "#c4a46a", borderTop: "1px solid hsl(var(--primary) / 0.15)" }}>
                        {block}
                      </p>
                    ) : block.includes("\n•") || block.startsWith("•") ? (
                      <div className="space-y-1">
                        {block.split("\n").map((line, j) => (
                          <p key={j} className="font-ui text-[13px] leading-relaxed"
                            style={{ color: "hsl(var(--foreground) / 0.8)" }}>
                            {line}
                          </p>
                        ))}
                      </div>
                    ) : (
                      <p className="font-body text-[17px] leading-relaxed" style={{ color: "hsl(var(--foreground))" }}>
                        {block}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Difficulty buttons - only after flip */}
        {showDifficulty && (
          <div className="flex gap-3 mt-6 animate-fade-in">
            {[
              { emoji: "😓", label: "Difícil", interval: "1 dia", quality: 0 as const, color: "#d4854a" },
              { emoji: "🤔", label: "Regular", interval: "3 dias", quality: 1 as const, color: "#c4a46a" },
              { emoji: "😎", label: "Fácil", interval: "7 dias", quality: 2 as const, color: "#8b9e7a" },
            ].map(btn => (
              <button
                key={btn.quality}
                onClick={() => handleDifficulty(btn.quality)}
                className="flex flex-col items-center gap-1 px-6 py-3 rounded-[14px] transition-all active:scale-95 hover:scale-[1.02] min-w-[90px]"
                style={{
                  background: `${btn.color}08`,
                  border: `1px solid ${btn.color}25`,
                }}
              >
                <span className="text-xl">{btn.emoji}</span>
                <span className="text-[12px] font-ui font-semibold" style={{ color: btn.color }}>{btn.label}</span>
                <span className="text-[10px] font-ui text-muted-foreground/50">{btn.interval}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Progress bar */}
      <div className="px-4 pb-4 shrink-0">
        <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ background: "hsl(var(--muted))" }}>
          <div className="h-full rounded-full transition-all duration-300"
            style={{ width: `${((currentIndex) / cards.length) * 100}%`, background: "hsl(var(--primary))" }} />
        </div>
        <p className="text-[10px] text-muted-foreground/50 font-ui text-center mt-1">
          {currentIndex}/{cards.length}
        </p>
      </div>
    </div>
  );
}
