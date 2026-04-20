import { useState, useCallback, useMemo } from "react";
import { ArrowLeft, Shuffle, RotateCcw, CheckCircle2, XCircle, Trophy } from "lucide-react";
import type { AnalysisResult, KeyConcept } from "./types";
import { getCategoryColor, getCategoryName, verseRefList } from "./types";

interface QuizQuestion {
  id: string;
  conceptId: string;
  conceptTitle: string;
  category: string;
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

function generateQuiz(analysis: AnalysisResult): QuizQuestion[] {
  const questions: QuizQuestion[] = [];
  const topics = (analysis.key_concepts || []).filter(c => !c.type || c.type === "topic");

  topics.forEach((concept, i) => {
    const note = concept.expanded_note;
    const coreIdea = note?.core_idea || concept.coreIdea || concept.description;
    const affirmations = note?.affirmations || [];
    const application = note?.application || concept.practicalApplication || "";
    const impactPhrase = note?.impact_phrase || concept.impactPhrase || "";
    const verses = verseRefList(note?.verses) .length > 0 ? verseRefList(note?.verses) : (concept.bible_refs || []);

    // Q1: "O que é [título]?" → core_idea correct, distractors from other concepts
    if (coreIdea) {
      const distractors = topics
        .filter((_, j) => j !== i)
        .map(c => c.expanded_note?.core_idea || c.coreIdea || c.description)
        .filter(Boolean)
        .sort(() => Math.random() - 0.5)
        .slice(0, 3);

      if (distractors.length >= 2) {
        const options = [...distractors.slice(0, 3), coreIdea].sort(() => Math.random() - 0.5);
        questions.push({
          id: `q-core-${i}`,
          conceptId: concept.id,
          conceptTitle: concept.title,
          category: concept.category,
          question: `Qual é a ideia central de "${concept.title}"?`,
          options,
          correctIndex: options.indexOf(coreIdea),
          explanation: coreIdea,
        });
      }
    }

    // Q2: Affirmation true/false style as multiple choice
    if (affirmations.length > 0) {
      const correct = affirmations[0];
      const wrongAffirmations = topics
        .filter((_, j) => j !== i)
        .flatMap(c => c.expanded_note?.affirmations || [])
        .filter(Boolean)
        .sort(() => Math.random() - 0.5)
        .slice(0, 3);

      if (wrongAffirmations.length >= 2) {
        const options = [...wrongAffirmations.slice(0, 3), correct].sort(() => Math.random() - 0.5);
        questions.push({
          id: `q-affirm-${i}`,
          conceptId: concept.id,
          conceptTitle: concept.title,
          category: concept.category,
          question: `Qual afirmação pertence ao tema "${concept.title}"?`,
          options,
          correctIndex: options.indexOf(correct),
          explanation: correct,
        });
      }
    }

    // Q3: Verse association
    if (verses.length > 0) {
      const correctVerse = verses[0];
      const wrongVerses = topics
        .filter((_, j) => j !== i)
        .flatMap(c => verseRefList(c.expanded_note?.verses).length > 0 ? verseRefList(c.expanded_note?.verses) : (c.bible_refs || []))
        .filter(Boolean)
        .sort(() => Math.random() - 0.5)
        .slice(0, 3);

      if (wrongVerses.length >= 2) {
        const options = [...wrongVerses.slice(0, 3), correctVerse].sort(() => Math.random() - 0.5);
        questions.push({
          id: `q-verse-${i}`,
          conceptId: concept.id,
          conceptTitle: concept.title,
          category: concept.category,
          question: `Qual versículo está diretamente ligado a "${concept.title}"?`,
          options,
          correctIndex: options.indexOf(correctVerse),
          explanation: `${correctVerse} — ${coreIdea || concept.description}`,
        });
      }
    }

    // Q4: Impact phrase
    if (impactPhrase) {
      const wrongPhrases = topics
        .filter((_, j) => j !== i)
        .map(c => c.expanded_note?.impact_phrase || c.impactPhrase || "")
        .filter(p => p.length > 5)
        .sort(() => Math.random() - 0.5)
        .slice(0, 3);

      if (wrongPhrases.length >= 2) {
        const options = [...wrongPhrases.slice(0, 3), impactPhrase].sort(() => Math.random() - 0.5);
        questions.push({
          id: `q-impact-${i}`,
          conceptId: concept.id,
          conceptTitle: concept.title,
          category: concept.category,
          question: `Qual frase de impacto resume "${concept.title}"?`,
          options,
          correctIndex: options.indexOf(impactPhrase),
          explanation: impactPhrase,
        });
      }
    }
  });

  return questions.sort(() => Math.random() - 0.5);
}

interface Props {
  analysis: AnalysisResult;
  onBack: () => void;
  filterConceptId?: string | null;
}

export default function MindMapQuizView({ analysis, onBack, filterConceptId }: Props) {
  const allQuestions = useMemo(() => {
    const qs = generateQuiz(analysis);
    if (filterConceptId) return qs.filter(q => q.conceptId === filterConceptId);
    return qs;
  }, [analysis, filterConceptId]);

  const [questions, setQuestions] = useState(allQuestions);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [answered, setAnswered] = useState(false);
  const [score, setScore] = useState(0);
  const [completed, setCompleted] = useState(false);
  const [answers, setAnswers] = useState<boolean[]>([]);

  const currentQ = questions[currentIndex];

  const shuffle = useCallback(() => {
    setQuestions([...allQuestions].sort(() => Math.random() - 0.5));
    setCurrentIndex(0);
    setSelectedOption(null);
    setAnswered(false);
    setScore(0);
    setCompleted(false);
    setAnswers([]);
  }, [allQuestions]);

  const reset = useCallback(() => {
    setQuestions(allQuestions);
    setCurrentIndex(0);
    setSelectedOption(null);
    setAnswered(false);
    setScore(0);
    setCompleted(false);
    setAnswers([]);
  }, [allQuestions]);

  const handleSelect = (idx: number) => {
    if (answered) return;
    setSelectedOption(idx);
    setAnswered(true);
    const isCorrect = idx === currentQ.correctIndex;
    if (isCorrect) setScore(s => s + 1);
    setAnswers(prev => [...prev, isCorrect]);
  };

  const handleNext = () => {
    if (currentIndex + 1 >= questions.length) {
      setCompleted(true);
    } else {
      setCurrentIndex(prev => prev + 1);
      setSelectedOption(null);
      setAnswered(false);
    }
  };

  if (questions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full px-4">
        <p className="text-muted-foreground font-sans text-sm">Nenhuma questão disponível</p>
        <button onClick={onBack} className="mt-4 text-xs font-sans" style={{ color: "#c4a46a" }}>← Voltar</button>
      </div>
    );
  }

  // Completion screen
  if (completed) {
    const pct = Math.round((score / questions.length) * 100);
    const stars = pct >= 90 ? 3 : pct >= 60 ? 2 : pct >= 30 ? 1 : 0;
    return (
      <div className="flex flex-col items-center justify-center h-full px-4 animate-fade-in">
        <div className="w-full max-w-sm rounded-2xl p-8 text-center"
          style={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }}>
          <Trophy size={40} className="mx-auto mb-4" style={{ color: "#c4a46a" }} />
          <p className="text-[10px] tracking-[2px] uppercase font-sans mb-2" style={{ color: "hsl(var(--muted-foreground) / 0.5)" }}>
            Resultado
          </p>
          <p className="font-display text-3xl font-bold mb-1" style={{ color: "hsl(var(--foreground))" }}>
            {score}/{questions.length}
          </p>
          <p className="text-sm font-sans mb-2" style={{ color: "hsl(var(--muted-foreground))" }}>
            {pct}% de acerto
          </p>
          <div className="flex justify-center gap-1 mb-6">
            {[1, 2, 3].map(s => (
              <span key={s} className="text-2xl">{s <= stars ? "⭐" : "☆"}</span>
            ))}
          </div>

          {/* Per-question breakdown */}
          <div className="flex flex-wrap justify-center gap-1.5 mb-6">
            {answers.map((correct, i) => (
              <div
                key={i}
                className="w-7 h-7 rounded-lg flex items-center justify-center text-[11px] font-sans font-bold"
                style={{
                  background: correct ? "rgba(139,158,122,0.15)" : "rgba(212,133,74,0.15)",
                  color: correct ? "#8b9e7a" : "#d4854a",
                  border: `1px solid ${correct ? "rgba(139,158,122,0.3)" : "rgba(212,133,74,0.3)"}`,
                }}
              >
                {i + 1}
              </div>
            ))}
          </div>

          <div className="flex gap-2">
            <button onClick={reset}
              className="flex-1 py-3 rounded-xl text-sm font-sans font-medium transition-all active:scale-95"
              style={{ background: "rgba(196,164,106,0.1)", color: "#c4a46a" }}>
              🔄 Tentar Novamente
            </button>
            <button onClick={onBack}
              className="flex-1 py-3 rounded-xl text-sm font-sans font-medium transition-all active:scale-95"
              style={{ background: "hsl(var(--muted))", color: "hsl(var(--muted-foreground))" }}>
              🗺️ Voltar
            </button>
          </div>
        </div>
      </div>
    );
  }

  const catColor = getCategoryColor(currentQ.category);
  const catName = getCategoryName(currentQ.category);

  return (
    <div className="flex flex-col h-full animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 shrink-0"
        style={{ borderBottom: "1px solid hsl(var(--border) / 0.2)" }}>
        <button onClick={onBack} className="flex items-center gap-1.5 text-xs font-sans hover:text-foreground transition-colors" style={{ color: "#8a7d6a" }}>
          <ArrowLeft size={14} /> Voltar
        </button>
        <p className="text-sm font-display font-semibold" style={{ color: "hsl(var(--foreground))" }}>
          {currentIndex + 1}/{questions.length}
        </p>
        <div className="flex gap-2">
          <button onClick={shuffle} className="p-2 rounded-lg transition-colors" style={{ color: "#8a7d6a" }} title="Embaralhar">
            <Shuffle size={14} />
          </button>
          <button onClick={reset} className="p-2 rounded-lg transition-colors" style={{ color: "#8a7d6a" }} title="Reiniciar">
            <RotateCcw size={14} />
          </button>
        </div>
      </div>

      {/* Question area */}
      <div className="flex-1 overflow-y-auto px-4 py-6">
        <div className="max-w-[480px] mx-auto">
          {/* Category + concept badge */}
          <div className="flex items-center gap-2 mb-4">
            <span
              className="px-2.5 py-1 rounded-md text-[9px] font-sans font-bold tracking-[1.5px] uppercase"
              style={{ background: `${catColor}15`, color: catColor }}
            >
              {catName}
            </span>
            <span className="text-[11px] font-sans" style={{ color: "#8a7d6a" }}>
              {currentQ.conceptTitle}
            </span>
          </div>

          {/* Question */}
          <h3 className="font-display text-xl font-bold leading-snug mb-6" style={{ color: "hsl(var(--foreground))" }}>
            {currentQ.question}
          </h3>

          {/* Options */}
          <div className="space-y-3">
            {currentQ.options.map((opt, idx) => {
              const isSelected = selectedOption === idx;
              const isCorrect = idx === currentQ.correctIndex;
              let borderColor = "hsl(var(--border))";
              let bgColor = "hsl(var(--card))";
              let textColor = "hsl(var(--foreground))";
              let icon = null;

              if (answered) {
                if (isCorrect) {
                  borderColor = "#8b9e7a";
                  bgColor = "rgba(139,158,122,0.08)";
                  icon = <CheckCircle2 size={18} style={{ color: "#8b9e7a" }} />;
                } else if (isSelected && !isCorrect) {
                  borderColor = "#d4854a";
                  bgColor = "rgba(212,133,74,0.08)";
                  textColor = "#d4854a";
                  icon = <XCircle size={18} style={{ color: "#d4854a" }} />;
                } else {
                  bgColor = "hsl(var(--card) / 0.5)";
                  textColor = "hsl(var(--muted-foreground) / 0.4)";
                }
              } else if (isSelected) {
                borderColor = "#c4a46a";
                bgColor = "rgba(196,164,106,0.06)";
              }

              return (
                <button
                  key={idx}
                  onClick={() => handleSelect(idx)}
                  disabled={answered}
                  className="w-full text-left px-4 py-3.5 rounded-xl flex items-center gap-3 transition-all active:scale-[0.98]"
                  style={{
                    background: bgColor,
                    border: `1.5px solid ${borderColor}`,
                    cursor: answered ? "default" : "pointer",
                  }}
                >
                  {/* Letter badge */}
                  <span
                    className="w-7 h-7 rounded-lg flex items-center justify-center text-[12px] font-sans font-bold shrink-0"
                    style={{
                      background: answered && isCorrect ? "rgba(139,158,122,0.2)" : "hsl(var(--muted))",
                      color: answered && isCorrect ? "#8b9e7a" : "hsl(var(--muted-foreground))",
                    }}
                  >
                    {String.fromCharCode(65 + idx)}
                  </span>
                  <span className="flex-1 text-[14px] font-sans leading-relaxed" style={{ color: textColor }}>
                    {opt}
                  </span>
                  {icon}
                </button>
              );
            })}
          </div>

          {/* Explanation after answering */}
          {answered && (
            <div className="mt-5 animate-fade-in">
              <div className="rounded-xl p-4" style={{
                background: "rgba(196,164,106,0.04)",
                borderLeft: `3px solid rgba(196,164,106,0.3)`,
              }}>
                <p className="text-[10px] font-sans font-bold tracking-[1.5px] uppercase mb-2" style={{ color: "#8a7d6a" }}>
                  Explicação
                </p>
                <p className="text-[13px] font-body italic leading-relaxed" style={{ color: "hsl(var(--foreground) / 0.85)" }}>
                  {currentQ.explanation}
                </p>
              </div>

              <button
                onClick={handleNext}
                className="w-full mt-4 py-3.5 rounded-xl text-sm font-sans font-semibold transition-all active:scale-95"
                style={{ background: "rgba(196,164,106,0.12)", color: "#c4a46a", border: "1px solid rgba(196,164,106,0.2)" }}
              >
                {currentIndex + 1 >= questions.length ? "Ver Resultado" : "Próxima →"}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Progress bar */}
      <div className="px-4 pb-4 shrink-0">
        <div className="flex items-center gap-2 mb-1">
          <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: "hsl(var(--muted))" }}>
            <div className="h-full rounded-full transition-all duration-300"
              style={{ width: `${((currentIndex) / questions.length) * 100}%`, background: "#c4a46a" }} />
          </div>
          <span className="text-[10px] font-sans" style={{ color: "#8a7d6a" }}>
            ✅ {score}
          </span>
        </div>
      </div>
    </div>
  );
}
