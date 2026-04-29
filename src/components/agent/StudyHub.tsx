import { useState, useRef, useEffect } from "react";
import { ArrowLeft, FileText, Network, Layers, Target, ScrollText, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import StudyGuide from "@/components/study-guide/StudyGuide";
import type { StudySessionRow, StudyFlowType } from "./types";
import TranscriptTab from "./TranscriptTab";
import FlowSelector from "./FlowSelector";
import FlowRunner from "./FlowRunner";
import AgentChat from "./AgentChat";

interface Props {
  session: StudySessionRow;
  userCodeId: string;
  onBack: () => void;
  onUpdate: (s: StudySessionRow) => void;
}

type Tab = "notes" | "map" | "flash" | "quiz" | "transcript";

export default function StudyHub({ session, userCodeId, onBack, onUpdate }: Props) {
  const [tab, setTab] = useState<Tab>("notes");
  const [activeFlow, setActiveFlow] = useState<StudyFlowType | null>(null);
  const [showFlowSelector, setShowFlowSelector] = useState(!session.study_flow_progress?.last);
  const [showChat, setShowChat] = useState(false);
  const study = session.generated_study;

  const persistFlowProgress = async (flow: StudyFlowType, step: number, total: number) => {
    const next = {
      ...(session.study_flow_progress || {}),
      last: { flow, currentStep: step, totalSteps: total, startedAt: new Date().toISOString() },
    };
    await supabase.from("study_sessions").update({ study_flow_progress: next as any }).eq("id", session.id);
    onUpdate({ ...session, study_flow_progress: next as any });
  };

  if (activeFlow && study) {
    return (
      <FlowRunner
        flow={activeFlow}
        analysis={study}
        onExit={() => setActiveFlow(null)}
        onProgress={(step, total) => persistFlowProgress(activeFlow, step, total)}
      />
    );
  }

  return (
    <div className="min-h-screen lg:h-screen lg:overflow-hidden flex flex-col">
      {/* Header */}
      <header className="px-4 lg:px-6 py-3 border-b border-border/40 flex items-center gap-3 shrink-0">
        <button onClick={onBack} className="text-muted-foreground hover:text-foreground" aria-label="Voltar">
          <ArrowLeft size={18} />
        </button>
        <div className="flex-1 min-w-0">
          <h2 className="font-display text-base text-foreground truncate">{session.title}</h2>
          <p className="text-[11px] text-muted-foreground">
            {Math.floor(session.duration_seconds / 60)}min · {(session.topics || []).length} tópicos · {study?.quiz_questions?.length || 0} questões
          </p>
        </div>
        <button
          onClick={() => setShowFlowSelector(true)}
          className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-ui font-bold transition-all"
          style={{
            background: "linear-gradient(135deg, hsl(var(--primary) / 0.2), hsl(var(--primary) / 0.05))",
            border: "1px solid hsl(var(--primary) / 0.4)",
            color: "hsl(var(--primary))",
          }}
        >
          <Sparkles size={12} /> Fluxo guiado
        </button>
      </header>

      {/* Tabs */}
      <nav className="px-2 lg:px-6 py-2 border-b border-border/30 flex gap-1 overflow-x-auto shrink-0">
        <TabBtn active={tab === "notes"} onClick={() => setTab("notes")} icon={<FileText size={13} />} label="Notas" />
        <TabBtn active={tab === "map"} onClick={() => setTab("map")} icon={<Network size={13} />} label="Mapa" />
        <TabBtn active={tab === "flash"} onClick={() => setTab("flash")} icon={<Layers size={13} />} label="Flash" />
        <TabBtn active={tab === "quiz"} onClick={() => setTab("quiz")} icon={<Target size={13} />} label="Quiz" />
        <TabBtn active={tab === "transcript"} onClick={() => setTab("transcript")} icon={<ScrollText size={13} />} label="Transcrição" />
      </nav>

      {/* Content */}
      <main className="flex-1 lg:overflow-y-auto">
        {!study && (
          <div className="text-center py-16 text-muted-foreground text-sm">
            Esta sessão não tem material gerado.
          </div>
        )}
        {study && tab === "notes" && (
          <StudyGuide analysis={study} onBack={onBack} />
        )}
        {study && tab === "map" && (
          <div className="text-center py-16 text-muted-foreground text-sm px-6">
            <p>Visualização do mapa mental disponível em "Estudo Guiado".</p>
            <p className="text-xs mt-2">Os tópicos extraídos estão disponíveis na aba <strong>Notas</strong> com toda a estrutura hierárquica.</p>
          </div>
        )}
        {study && tab === "flash" && (
          <FlashcardsView analysis={study} />
        )}
        {study && tab === "quiz" && (
          <QuizView analysis={study} />
        )}
        {tab === "transcript" && (
          <TranscriptTab session={session} />
        )}
      </main>

      {/* Floating chat button */}
      <button
        onClick={() => setShowChat(true)}
        className="fixed bottom-20 right-4 lg:bottom-8 lg:right-8 w-12 h-12 rounded-full flex items-center justify-center z-40"
        style={{
          background: "linear-gradient(135deg, hsl(var(--primary)), hsl(var(--primary) / 0.8))",
          color: "hsl(var(--primary-foreground))",
          boxShadow: "0 12px 30px -8px hsl(var(--primary) / 0.7)",
        }}
        aria-label="Chat com agente"
      >
        <Sparkles size={18} />
      </button>

      {showChat && (
        <AgentChat session={session} onClose={() => setShowChat(false)} />
      )}

      {showFlowSelector && (
        <FlowSelector
          onPick={(f) => { setActiveFlow(f); setShowFlowSelector(false); }}
          onClose={() => setShowFlowSelector(false)}
        />
      )}
    </div>
  );
}

function TabBtn({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string }) {
  return (
    <button
      onClick={onClick}
      className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-ui transition-all ${
        active ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground hover:bg-muted/30"
      }`}
    >
      {icon}{label}
    </button>
  );
}

// ── Flashcards inline (simple flip) ──
function FlashcardsView({ analysis }: { analysis: any }) {
  const cards = (analysis.key_concepts || []).flatMap((c: any) => {
    const out: { front: string; back: string }[] = [];
    if (c.title && c.expanded_note?.core_idea) out.push({ front: c.title, back: c.expanded_note.core_idea });
    (c.expanded_note?.key_points || []).slice(0, 2).forEach((p: string) => {
      out.push({ front: c.title, back: p });
    });
    return out;
  }).slice(0, 30);
  const [idx, setIdx] = useState(0);
  const [flipped, setFlipped] = useState(false);
  if (!cards.length) return <div className="text-center py-16 text-muted-foreground text-sm">Sem flashcards para esta sessão.</div>;
  const card = cards[idx];
  return (
    <div className="max-w-xl mx-auto px-6 py-10">
      <p className="text-xs text-muted-foreground text-center mb-6">{idx + 1} / {cards.length}</p>
      <div
        onClick={() => setFlipped((f) => !f)}
        className="rounded-2xl border border-border/40 bg-card/40 p-8 min-h-[200px] flex items-center justify-center text-center cursor-pointer hover:border-primary/40 transition-all"
      >
        <p className="font-display text-lg text-foreground leading-relaxed">
          {flipped ? card.back : card.front}
        </p>
      </div>
      <p className="text-center text-xs text-muted-foreground mt-3">{flipped ? "Resposta" : "Toque para revelar"}</p>
      <div className="flex justify-between mt-6">
        <button
          onClick={() => { setIdx((i) => Math.max(0, i - 1)); setFlipped(false); }}
          className="px-4 py-2 rounded-full text-sm border border-border/50 text-muted-foreground hover:text-foreground"
          disabled={idx === 0}
        >Anterior</button>
        <button
          onClick={() => { setIdx((i) => Math.min(cards.length - 1, i + 1)); setFlipped(false); }}
          className="px-4 py-2 rounded-full text-sm font-bold"
          style={{ background: "hsl(var(--primary))", color: "hsl(var(--primary-foreground))" }}
          disabled={idx === cards.length - 1}
        >Próximo</button>
      </div>
    </div>
  );
}

// ── Quiz inline ──
function QuizView({ analysis }: { analysis: any }) {
  const qs = (analysis.quiz_questions || []) as { question: string; options: string[]; answer_index?: number }[];
  const [idx, setIdx] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  if (!qs.length) return <div className="text-center py-16 text-muted-foreground text-sm">Sem quiz para esta sessão.</div>;
  const q = qs[idx];
  const correct = q.answer_index;
  return (
    <div className="max-w-xl mx-auto px-6 py-10">
      <p className="text-xs text-muted-foreground mb-3">Pergunta {idx + 1} de {qs.length}</p>
      <h3 className="font-display text-lg text-foreground mb-5">{q.question}</h3>
      <div className="space-y-2">
        {q.options.map((opt, i) => {
          const isCorrect = picked !== null && i === correct;
          const isWrong = picked === i && i !== correct;
          return (
            <button
              key={i}
              disabled={picked !== null}
              onClick={() => setPicked(i)}
              className={`w-full text-left p-3 rounded-lg border text-sm transition-all ${
                isCorrect ? "border-green-500/60 bg-green-500/10 text-green-400" :
                isWrong ? "border-destructive/60 bg-destructive/10 text-destructive" :
                picked !== null && i === correct ? "border-green-500/60" :
                "border-border/40 hover:border-primary/40 text-foreground"
              }`}
            >
              {opt}
            </button>
          );
        })}
      </div>
      {picked !== null && (
        <button
          onClick={() => { setIdx((i) => Math.min(qs.length - 1, i + 1)); setPicked(null); }}
          className="mt-6 w-full px-4 py-2.5 rounded-full text-sm font-bold"
          style={{ background: "hsl(var(--primary))", color: "hsl(var(--primary-foreground))" }}
          disabled={idx === qs.length - 1}
        >
          {idx === qs.length - 1 ? "Concluído" : "Próxima"}
        </button>
      )}
    </div>
  );
}
