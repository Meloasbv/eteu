import { useState, useEffect, useCallback, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";

type Flashcard = {
  id: string;
  question: string;
  answer: string;
  note_id: string | null;
  next_review: string;
  interval: number;
  ease_factor: number;
  created_at: string;
};

// Leitner-inspired SRS: ease_factor adjusts interval
function calculateNext(card: Flashcard, quality: "easy" | "good" | "hard" | "again"): Partial<Flashcard> {
  let { interval, ease_factor } = card;

  switch (quality) {
    case "again":
      interval = 1;
      ease_factor = Math.max(1.3, ease_factor - 0.2);
      break;
    case "hard":
      interval = Math.max(1, Math.round(interval * 1.2));
      ease_factor = Math.max(1.3, ease_factor - 0.15);
      break;
    case "good":
      interval = interval === 0 ? 1 : Math.round(interval * ease_factor);
      ease_factor = ease_factor + 0.05;
      break;
    case "easy":
      interval = interval === 0 ? 4 : Math.round(interval * ease_factor * 1.3);
      ease_factor = ease_factor + 0.15;
      break;
  }

  const next = new Date();
  next.setDate(next.getDate() + interval);

  return {
    interval,
    ease_factor,
    next_review: next.toISOString(),
  };
}

export default function Flashcards({ userCodeId }: { userCodeId: string }) {
  const [cards, setCards] = useState<Flashcard[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAnswer, setShowAnswer] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [mode, setMode] = useState<"review" | "all" | "create">("review");
  const [toast, setToast] = useState("");

  // Create form
  const [newQuestion, setNewQuestion] = useState("");
  const [newAnswer, setNewAnswer] = useState("");

  // Generate from note
  const [generating, setGenerating] = useState(false);
  const [noteText, setNoteText] = useState("");

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(""), 2000);
  }, []);

  // Load cards
  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const { data, error } = await (supabase as any)
        .from("flashcards")
        .select("*")
        .eq("user_code_id", userCodeId)
        .order("next_review", { ascending: true });

      if (!error && data) setCards(data);
      setLoading(false);
    };
    load();
  }, [userCodeId]);

  // Cards due for review
  const dueCards = useMemo(() => {
    const now = new Date().toISOString();
    return cards.filter(c => c.next_review <= now);
  }, [cards]);

  const reviewCards = mode === "review" ? dueCards : cards;
  const currentCard = reviewCards[currentIndex];

  const answerCard = useCallback(async (quality: "easy" | "good" | "hard" | "again") => {
    if (!currentCard) return;
    const updates = calculateNext(currentCard, quality);

    // Update locally
    setCards(prev => prev.map(c => c.id === currentCard.id ? { ...c, ...updates } : c));
    setShowAnswer(false);

    // Move to next
    if (currentIndex >= reviewCards.length - 1) {
      setCurrentIndex(0);
      showToast("Revisão concluída! 🎉");
    } else {
      setCurrentIndex(i => i + 1);
    }

    // Persist
    await (supabase as any)
      .from("flashcards")
      .update(updates)
      .eq("id", currentCard.id);
  }, [currentCard, currentIndex, reviewCards.length, showToast]);

  const createCard = useCallback(async () => {
    if (!newQuestion.trim() || !newAnswer.trim()) return;

    const { data, error } = await (supabase as any)
      .from("flashcards")
      .insert({
        user_code_id: userCodeId,
        question: newQuestion.trim(),
        answer: newAnswer.trim(),
        next_review: new Date().toISOString(),
        interval: 0,
        ease_factor: 2.5,
      })
      .select()
      .maybeSingle();

    if (!error && data) {
      setCards(prev => [data, ...prev]);
      setNewQuestion("");
      setNewAnswer("");
      showToast("Flashcard criado!");
    }
  }, [newQuestion, newAnswer, userCodeId, showToast]);

  const deleteCard = useCallback(async (id: string) => {
    setCards(prev => prev.filter(c => c.id !== id));
    await (supabase as any).from("flashcards").delete().eq("id", id);
    showToast("Flashcard removido");
  }, [showToast]);

  const generateFromText = useCallback(async () => {
    if (!noteText.trim()) return;
    setGenerating(true);

    try {
      const { data, error } = await supabase.functions.invoke("generate-flashcards", {
        body: { text: noteText.trim() },
      });

      if (error || data?.error) {
        showToast(data?.error || "Erro ao gerar flashcards");
        setGenerating(false);
        return;
      }

      const generated = data?.flashcards || [];
      if (generated.length === 0) {
        showToast("Nenhum flashcard gerado");
        setGenerating(false);
        return;
      }

      // Insert all
      const rows = generated.map((f: any) => ({
        user_code_id: userCodeId,
        question: f.question,
        answer: f.answer,
        next_review: new Date().toISOString(),
        interval: 0,
        ease_factor: 2.5,
      }));

      const { data: inserted, error: insertErr } = await (supabase as any)
        .from("flashcards")
        .insert(rows)
        .select();

      if (!insertErr && inserted) {
        setCards(prev => [...inserted, ...prev]);
        setNoteText("");
        showToast(`${inserted.length} flashcards gerados!`);
      }
    } catch {
      showToast("Erro de conexão");
    }
    setGenerating(false);
  }, [noteText, userCodeId, showToast]);

  return (
    <div className="px-4 pt-5 pb-12 max-w-2xl mx-auto">
      {/* Header */}
      <div className="mb-5">
        <p className="font-display text-[10px] tracking-[3px] uppercase text-muted-foreground font-semibold mb-1">
          🃏 Flashcards
        </p>
        <p className="text-[13px] text-muted-foreground leading-relaxed">
          Revisão espaçada para memorizar seus estudos
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-2 mb-5">
        <div className="rounded-xl border border-border bg-card/50 p-3 text-center">
          <div className="text-xl font-bold text-foreground">{cards.length}</div>
          <div className="text-[11px] text-muted-foreground">Total</div>
        </div>
        <div className="rounded-xl border border-primary/30 bg-primary/5 p-3 text-center">
          <div className="text-xl font-bold text-primary">{dueCards.length}</div>
          <div className="text-[11px] text-primary/70">Para revisar</div>
        </div>
        <div className="rounded-xl border border-success/30 bg-success/5 p-3 text-center">
          <div className="text-xl font-bold text-success">{cards.length - dueCards.length}</div>
          <div className="text-[11px] text-success/70">Em dia</div>
        </div>
      </div>

      {/* Mode tabs */}
      <div className="flex gap-2 mb-5">
        {([
          { key: "review" as const, label: `Revisar (${dueCards.length})`, icon: "📝" },
          { key: "all" as const, label: "Todos", icon: "📋" },
          { key: "create" as const, label: "Criar", icon: "➕" },
        ]).map(m => (
          <button
            key={m.key}
            onClick={() => { setMode(m.key); setCurrentIndex(0); setShowAnswer(false); }}
            className={`px-3 py-2 rounded-xl text-[12px] font-medium border cursor-pointer transition-all flex-1
              ${mode === m.key ? "border-primary/40 bg-primary/10 text-primary" : "border-border bg-card/50 text-muted-foreground"}`}
          >
            {m.icon} {m.label}
          </button>
        ))}
      </div>

      {/* Review mode */}
      {(mode === "review" || mode === "all") && (
        <>
          {loading ? (
            <div className="h-48 rounded-2xl bg-card/50 border border-border animate-pulse" />
          ) : reviewCards.length === 0 ? (
            <div className="text-center py-16">
              <div className="text-4xl mb-3">{mode === "review" ? "🎉" : "📭"}</div>
              <p className="text-muted-foreground text-[14px]">
                {mode === "review" ? "Nenhum flashcard para revisar!" : "Nenhum flashcard criado"}
              </p>
              {mode === "review" && cards.length > 0 && (
                <p className="text-[12px] text-muted-foreground mt-1">
                  Todos os {cards.length} flashcards estão em dia
                </p>
              )}
            </div>
          ) : (
            <>
              {/* Card */}
              {currentCard && (
                <div className="mb-4">
                  <div className="text-[12px] text-muted-foreground mb-2 text-center">
                    {currentIndex + 1} / {reviewCards.length}
                  </div>

                  <div
                    onClick={() => setShowAnswer(!showAnswer)}
                    className="rounded-2xl border border-border bg-card p-6 min-h-[200px] flex flex-col
                      items-center justify-center cursor-pointer transition-all duration-300
                      hover:border-primary/30 hover:shadow-lg relative overflow-hidden"
                  >
                    <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-primary to-transparent opacity-50" />

                    {!showAnswer ? (
                      <>
                        <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-3">
                          Pergunta
                        </div>
                        <p className="text-[17px] text-foreground text-center leading-relaxed font-medium">
                          {currentCard.question}
                        </p>
                        <p className="text-[12px] text-primary/60 mt-4">Toque para ver a resposta</p>
                      </>
                    ) : (
                      <>
                        <div className="text-[10px] text-primary uppercase tracking-wider mb-3">
                          Resposta
                        </div>
                        <p className="text-[16px] text-foreground text-center leading-relaxed">
                          {currentCard.answer}
                        </p>
                      </>
                    )}
                  </div>

                  {/* Answer buttons */}
                  {showAnswer && mode === "review" && (
                    <div className="grid grid-cols-4 gap-2 mt-3">
                      <button onClick={() => answerCard("again")}
                        className="py-2.5 rounded-xl border border-destructive/30 bg-destructive/10 text-destructive text-[12px] font-medium cursor-pointer">
                        Errei
                      </button>
                      <button onClick={() => answerCard("hard")}
                        className="py-2.5 rounded-xl border border-orange-400/30 bg-orange-400/10 text-orange-400 text-[12px] font-medium cursor-pointer">
                        Difícil
                      </button>
                      <button onClick={() => answerCard("good")}
                        className="py-2.5 rounded-xl border border-primary/30 bg-primary/10 text-primary text-[12px] font-medium cursor-pointer">
                        Bom
                      </button>
                      <button onClick={() => answerCard("easy")}
                        className="py-2.5 rounded-xl border border-success/30 bg-success/10 text-success text-[12px] font-medium cursor-pointer">
                        Fácil
                      </button>
                    </div>
                  )}

                  {/* Navigation for "all" mode */}
                  {mode === "all" && (
                    <div className="flex gap-2 mt-3 justify-center">
                      <button onClick={() => { setCurrentIndex(i => Math.max(0, i - 1)); setShowAnswer(false); }}
                        disabled={currentIndex === 0}
                        className="px-4 py-2 rounded-xl border border-border bg-card/50 text-muted-foreground cursor-pointer disabled:opacity-30">
                        ← Anterior
                      </button>
                      <button onClick={() => deleteCard(currentCard.id)}
                        className="px-4 py-2 rounded-xl border border-destructive/30 bg-destructive/10 text-destructive cursor-pointer text-[12px]">
                        🗑 Excluir
                      </button>
                      <button onClick={() => { setCurrentIndex(i => Math.min(reviewCards.length - 1, i + 1)); setShowAnswer(false); }}
                        disabled={currentIndex >= reviewCards.length - 1}
                        className="px-4 py-2 rounded-xl border border-border bg-card/50 text-muted-foreground cursor-pointer disabled:opacity-30">
                        Próximo →
                      </button>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </>
      )}

      {/* Create mode */}
      {mode === "create" && (
        <div className="space-y-5">
          {/* Manual create */}
          <div className="rounded-2xl border border-border bg-card p-5">
            <p className="font-display text-[10px] tracking-[2px] uppercase text-muted-foreground font-semibold mb-4">
              Criar manualmente
            </p>
            <div className="space-y-3">
              <div>
                <label className="text-[12px] text-muted-foreground mb-1 block">Pergunta</label>
                <textarea
                  value={newQuestion}
                  onChange={e => setNewQuestion(e.target.value)}
                  placeholder="Digite a pergunta..."
                  className="w-full p-3 rounded-xl border border-border bg-input text-foreground text-[14px]
                    placeholder:text-muted-foreground resize-none h-20 focus:outline-none focus:border-primary/40"
                />
              </div>
              <div>
                <label className="text-[12px] text-muted-foreground mb-1 block">Resposta</label>
                <textarea
                  value={newAnswer}
                  onChange={e => setNewAnswer(e.target.value)}
                  placeholder="Digite a resposta..."
                  className="w-full p-3 rounded-xl border border-border bg-input text-foreground text-[14px]
                    placeholder:text-muted-foreground resize-none h-20 focus:outline-none focus:border-primary/40"
                />
              </div>
              <button
                onClick={createCard}
                disabled={!newQuestion.trim() || !newAnswer.trim()}
                className="w-full py-3 rounded-xl border border-primary/40 bg-primary/10 text-primary
                  font-display text-[11px] tracking-[2px] uppercase cursor-pointer disabled:opacity-40
                  hover:bg-primary/15 transition-all"
              >
                ✦ Criar Flashcard
              </button>
            </div>
          </div>

          {/* Generate from text with AI */}
          <div className="rounded-2xl border border-border bg-card p-5">
            <p className="font-display text-[10px] tracking-[2px] uppercase text-muted-foreground font-semibold mb-2">
              ✨ Gerar com IA
            </p>
            <p className="text-[12px] text-muted-foreground mb-3">
              Cole o conteúdo de um estudo e a IA criará flashcards automaticamente
            </p>
            <textarea
              value={noteText}
              onChange={e => setNoteText(e.target.value)}
              placeholder="Cole aqui o texto do seu estudo..."
              className="w-full p-3 rounded-xl border border-border bg-input text-foreground text-[14px]
                placeholder:text-muted-foreground resize-none h-32 focus:outline-none focus:border-primary/40"
            />
            <button
              onClick={generateFromText}
              disabled={!noteText.trim() || generating}
              className="w-full py-3 mt-3 rounded-xl border border-accent/40 bg-accent/10 text-accent
                font-display text-[11px] tracking-[2px] uppercase cursor-pointer disabled:opacity-40
                hover:bg-accent/15 transition-all"
            >
              {generating ? "⏳ Gerando..." : "✨ Gerar Flashcards com IA"}
            </button>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-5 right-5 bg-primary text-primary-foreground py-2.5 px-4 rounded-lg text-[13px] z-50 shadow-lg animate-fade-in">
          {toast}
        </div>
      )}
    </div>
  );
}
