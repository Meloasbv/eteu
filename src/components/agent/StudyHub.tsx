import { useState } from "react";
import { ArrowLeft, FileText, ScrollText, Sparkles, Mic, Share2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import StudyGuide from "@/components/study-guide/StudyGuide";
import type { StudySessionRow, StudyFlowType } from "./types";
import TranscriptTab from "./TranscriptTab";
import FlowSelector from "./FlowSelector";
import FlowRunner from "./FlowRunner";
import AgentChat from "./AgentChat";
import ShareStudyDialog from "./ShareStudyDialog";

interface Props {
  session: StudySessionRow;
  userCodeId: string;
  onBack: () => void;
  onUpdate: (s: StudySessionRow) => void;
  onResume?: (s: StudySessionRow) => void;
}

type Tab = "notes" | "transcript";

export default function StudyHub({ session, userCodeId, onBack, onUpdate, onResume }: Props) {
  const [tab, setTab] = useState<Tab>("notes");
  const [activeFlow, setActiveFlow] = useState<StudyFlowType | null>(null);
  const [showFlowSelector, setShowFlowSelector] = useState(!session.study_flow_progress?.last);
  const [showChat, setShowChat] = useState(false);
  const [showShare, setShowShare] = useState(false);
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
        {onResume && (
          <button
            onClick={() => onResume(session)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-ui font-bold transition-all"
            style={{
              background: "linear-gradient(135deg, hsl(var(--primary) / 0.2), hsl(var(--primary) / 0.05))",
              border: "1px solid hsl(var(--primary) / 0.4)",
              color: "hsl(var(--primary))",
            }}
            title="Continuar gravando esta sessão"
          >
            <Mic size={12} /> Continuar gravando
          </button>
        )}
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
        <TabBtn active={tab === "transcript"} onClick={() => setTab("transcript")} icon={<ScrollText size={13} />} label="Transcrição" />
      </nav>

      {/* Content */}
      <main className="flex-1 lg:overflow-y-auto">
        {!study && tab === "notes" && (
          <div className="text-center py-16 text-muted-foreground text-sm">
            Esta sessão não tem material gerado.
          </div>
        )}
        {study && tab === "notes" && (
          <StudyGuide analysis={study} onBack={onBack} />
        )}
        {tab === "transcript" && (
          <TranscriptTab session={session} onUpdate={onUpdate} />
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

