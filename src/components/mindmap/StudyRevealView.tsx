import { useState } from "react";
import { ArrowLeft, Eye, BarChart3, Shuffle } from "lucide-react";
import type { AnalysisResult } from "./types";

const categoryColors: Record<string, { border: string; bg: string; text: string }> = {
  teologia:    { border: "#c9a067", bg: "rgba(201,160,103,0.12)", text: "#c9a067" },
  contexto:    { border: "#8b9e7a", bg: "rgba(139,158,122,0.12)", text: "#8b9e7a" },
  "aplicação": { border: "#7ba3c9", bg: "rgba(123,163,201,0.12)", text: "#7ba3c9" },
  personagem:  { border: "#d4854a", bg: "rgba(212,133,74,0.12)",  text: "#d4854a" },
  lugar:       { border: "#6a9c8a", bg: "rgba(106,156,138,0.12)", text: "#6a9c8a" },
  evento:      { border: "#b08db5", bg: "rgba(176,141,181,0.12)", text: "#b08db5" },
};

interface Props {
  analysis: AnalysisResult;
  onBack: () => void;
}

export default function StudyRevealView({ analysis, onBack }: Props) {
  const concepts = analysis.key_concepts || [];
  const [revealed, setRevealed] = useState<Set<number>>(new Set());
  const [randomOrder, setRandomOrder] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [startTime] = useState(Date.now());

  const orderedIndices = randomOrder
    ? [...Array(concepts.length).keys()].sort(() => Math.random() - 0.5)
    : [...Array(concepts.length).keys()];

  const revealCard = (idx: number) => {
    const next = new Set(revealed);
    next.add(idx);
    setRevealed(next);
    if (next.size === concepts.length) {
      setTimeout(() => setCompleted(true), 500);
    }
  };

  const elapsed = Math.round((Date.now() - startTime) / 1000);
  const minutes = Math.floor(elapsed / 60);
  const seconds = elapsed % 60;

  if (completed) {
    return (
      <div className="flex flex-col items-center justify-center h-full px-4 animate-fade-in">
        <div className="w-full max-w-sm rounded-2xl p-8 text-center"
          style={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }}>
          <p className="text-[10px] tracking-[2px] uppercase text-primary/60 font-ui mb-4">📊 Resultado da Revisão</p>
          <p className="font-display text-2xl font-bold text-foreground mb-1">
            {revealed.size}/{concepts.length}
          </p>
          <p className="text-sm text-muted-foreground font-ui mb-1">cards revisados</p>
          <p className="text-xs text-muted-foreground/50 font-ui mb-6">
            Tempo: {minutes}min {seconds}s
          </p>

          <p className="text-sm font-ui text-foreground mb-4">Como você se saiu?</p>
          <div className="flex justify-center gap-3 mb-6">
            {[
              { emoji: "😓", label: "Preciso revisar" },
              { emoji: "🤔", label: "Quase lá" },
              { emoji: "😎", label: "Dominei" },
            ].map((opt, i) => (
              <button key={i} onClick={() => { setCompleted(false); setRevealed(new Set()); }}
                className="flex flex-col items-center gap-1 px-5 py-3 rounded-xl transition-all active:scale-95"
                style={{ background: "hsl(var(--primary) / 0.06)", border: "1px solid hsl(var(--primary) / 0.15)" }}>
                <span className="text-xl">{opt.emoji}</span>
                <span className="text-[11px] font-ui text-muted-foreground">{opt.label}</span>
              </button>
            ))}
          </div>

          <button onClick={onBack}
            className="w-full py-3 rounded-xl text-sm font-ui font-medium transition-all active:scale-95"
            style={{ background: "hsl(var(--muted))", color: "hsl(var(--muted-foreground))" }}>
            🗺️ Voltar ao Mapa
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 shrink-0"
        style={{ borderBottom: "1px solid hsl(var(--border) / 0.2)" }}>
        <button onClick={onBack} className="flex items-center gap-1.5 text-xs text-muted-foreground font-ui hover:text-foreground transition-colors">
          <ArrowLeft size={14} /> Voltar
        </button>
        <p className="text-sm font-display font-semibold text-foreground">
          {revealed.size}/{concepts.length} revelados
        </p>
        <button onClick={() => setRandomOrder(!randomOrder)}
          className="p-2 rounded-lg text-muted-foreground hover:text-primary transition-colors"
          title={randomOrder ? "Ordem original" : "Ordem aleatória"}>
          <Shuffle size={14} />
        </button>
      </div>

      {/* Cards list */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        <div className="max-w-[640px] mx-auto space-y-3">
          {orderedIndices.map(idx => {
            const concept = concepts[idx];
            const isRevealed = revealed.has(idx);
            const cat = categoryColors[concept.category] || categoryColors.teologia;

            return (
              <div
                key={idx}
                className="rounded-xl transition-all"
                style={{
                  background: "hsl(var(--card))",
                  border: `1px solid ${isRevealed ? cat.border + "40" : "hsl(var(--border))"}`,
                  borderLeft: `4px solid ${cat.border}`,
                }}
              >
                {/* Always visible: title */}
                <div
                  className="flex items-center justify-between px-5 py-4 cursor-pointer"
                  onClick={() => !isRevealed && revealCard(idx)}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-sm">📖</span>
                    <p className="font-display text-[15px] font-semibold text-foreground">{concept.title}</p>
                    {isRevealed && <span className="text-primary text-xs">✅</span>}
                  </div>
                  {!isRevealed && (
                    <button className="p-1.5 rounded-lg transition-all hover:scale-110"
                      style={{ background: `${cat.border}10` }}>
                      <Eye size={16} style={{ color: cat.border }} />
                    </button>
                  )}
                </div>

                {/* Revealed content */}
                {isRevealed && (
                  <div className="px-5 pb-5 animate-fade-in space-y-3">
                    <div className="h-px" style={{ background: `${cat.border}20` }} />

                    {concept.coreIdea && (
                      <div className="py-2 px-3 rounded-r-lg"
                        style={{ background: `${cat.border}08`, borderLeft: `2px solid ${cat.border}40` }}>
                        <p className="font-body text-[13.5px] italic leading-relaxed" style={{ color: "hsl(var(--foreground) / 0.9)" }}>
                          💡 {concept.coreIdea}
                        </p>
                      </div>
                    )}

                    {concept.keyPoints && concept.keyPoints.length > 0 && (
                      <div>
                        <p className="text-[9px] font-ui font-bold tracking-[2px] uppercase mb-1.5"
                          style={{ color: "hsl(var(--muted-foreground) / 0.5)" }}>
                          Pontos Principais
                        </p>
                        <div className="space-y-1">
                          {concept.keyPoints.map((pt, j) => (
                            <p key={j} className="font-ui text-[12.5px] leading-relaxed pl-3 relative"
                              style={{ color: "hsl(var(--foreground) / 0.75)" }}>
                              <span className="absolute left-0" style={{ color: cat.border }}>•</span>
                              {pt}
                            </p>
                          ))}
                        </div>
                      </div>
                    )}

                    {concept.practicalApplication && (
                      <div>
                        <p className="text-[9px] font-ui font-bold tracking-[2px] uppercase mb-1"
                          style={{ color: "hsl(var(--muted-foreground) / 0.5)" }}>
                          ⚡ Aplicação
                        </p>
                        <p className="font-ui text-[12.5px] leading-relaxed" style={{ color: "#8b9e7a" }}>
                          {concept.practicalApplication}
                        </p>
                      </div>
                    )}

                    {concept.bible_refs && concept.bible_refs.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {concept.bible_refs.map((ref, j) => (
                          <span key={j} className="px-2 py-0.5 rounded-md text-[10.5px] italic font-body"
                            style={{ background: `${cat.border}0a`, color: cat.text, border: `1px solid ${cat.border}25` }}>
                            📌 {ref}
                          </span>
                        ))}
                      </div>
                    )}

                    {concept.impactPhrase && (
                      <div className="pt-2" style={{ borderTop: `1px solid ${cat.border}15` }}>
                        <p className="font-body text-[14px] font-semibold text-center leading-snug"
                          style={{ color: cat.border }}>
                          🔥 "{concept.impactPhrase}"
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {/* Hint when not revealed */}
                {!isRevealed && (
                  <p className="px-5 pb-3 text-[11px] text-muted-foreground/40 font-ui italic">
                    Tente lembrar... depois toque para revelar
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Progress bar */}
      <div className="px-4 pb-4 shrink-0">
        <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ background: "hsl(var(--muted))" }}>
          <div className="h-full rounded-full transition-all duration-300"
            style={{ width: `${(revealed.size / concepts.length) * 100}%`, background: "hsl(var(--primary))" }} />
        </div>
      </div>
    </div>
  );
}
