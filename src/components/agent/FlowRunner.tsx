import { useMemo, useState } from "react";
import { ArrowLeft, ChevronLeft, ChevronRight } from "lucide-react";
import type { AnalysisResult, KeyConcept } from "@/components/mindmap/types";
import { FLOW_META, type StudyFlowType } from "./types";

interface Props {
  flow: StudyFlowType;
  analysis: AnalysisResult;
  onExit: () => void;
  onProgress: (step: number, total: number) => void;
}

export default function FlowRunner({ flow, analysis, onExit, onProgress }: Props) {
  const meta = FLOW_META[flow];
  const steps = useMemo(() => buildSteps(flow, analysis), [flow, analysis]);
  const [idx, setIdx] = useState(0);
  const total = steps.length;
  const current = steps[idx];

  const go = (delta: number) => {
    const next = Math.max(0, Math.min(total - 1, idx + delta));
    setIdx(next);
    onProgress(next + 1, total);
  };

  return (
    <div className="min-h-screen lg:h-screen lg:overflow-hidden flex flex-col">
      <header className="px-4 lg:px-6 py-3 border-b border-border/40 flex items-center gap-3 shrink-0">
        <button onClick={onExit} className="text-muted-foreground hover:text-foreground"><ArrowLeft size={18} /></button>
        <div className="flex-1">
          <p className="font-ui text-xs text-muted-foreground">{meta.icon} {meta.title}</p>
          <p className="text-[11px] text-muted-foreground/70">Etapa {idx + 1} / {total}</p>
        </div>
      </header>
      <div className="h-1 bg-muted">
        <div className="h-full bg-primary transition-all" style={{ width: `${((idx + 1) / total) * 100}%` }} />
      </div>

      <main className="flex-1 lg:overflow-y-auto px-4 lg:px-8 py-6">
        <div className="max-w-2xl mx-auto">
          <p className="text-[10px] tracking-[2px] uppercase text-muted-foreground/70 font-ui mb-2">{current.section}</p>
          <h2 className="font-display text-xl text-foreground mb-4">{current.title}</h2>
          <div className="text-sm text-foreground/85 space-y-3" style={{ fontFamily: "'Crimson Text', Georgia, serif", fontSize: 16, lineHeight: 1.75 }}>
            {current.body}
          </div>
        </div>
      </main>

      <footer className="px-4 lg:px-6 py-3 border-t border-border/40 flex items-center justify-between shrink-0">
        <button
          onClick={() => go(-1)}
          disabled={idx === 0}
          className="px-4 py-2 rounded-full text-sm border border-border/50 text-muted-foreground hover:text-foreground disabled:opacity-40 flex items-center gap-1"
        >
          <ChevronLeft size={14} /> Anterior
        </button>
        <button
          onClick={() => idx === total - 1 ? onExit() : go(1)}
          className="px-5 py-2 rounded-full text-sm font-bold flex items-center gap-1"
          style={{ background: "hsl(var(--primary))", color: "hsl(var(--primary-foreground))" }}
        >
          {idx === total - 1 ? "Concluir" : <>Próxima <ChevronRight size={14} /></>}
        </button>
      </footer>
    </div>
  );
}

interface Step { section: string; title: string; body: React.ReactNode }

function buildSteps(flow: StudyFlowType, a: AnalysisResult): Step[] {
  const concepts = a.key_concepts || [];
  const verses = Array.from(new Set(concepts.flatMap((c) => (c.expanded_note?.verses || []).map((v) => typeof v === "string" ? v : v.ref))));
  const phrases = concepts.flatMap((c) => c.expanded_note?.impact_phrase ? [c.expanded_note.impact_phrase] : []);

  if (flow === "first_pass") {
    return [
      { section: "Tema central", title: a.main_theme, body: <p>{a.summary}</p> },
      ...concepts.slice(0, 4).map((c) => ({
        section: "Tópico",
        title: c.title,
        body: (
          <>
            <p className="font-ui text-foreground">{c.expanded_note?.core_idea}</p>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              {(c.expanded_note?.key_points || []).slice(0, 4).map((p, i) => <li key={i}>{p}</li>)}
            </ul>
            {(c.expanded_note?.verses || []).length > 0 && (
              <p className="text-xs text-primary mt-3 font-mono">📖 {(c.expanded_note?.verses || []).map((v) => typeof v === "string" ? v : v.ref).join(" · ")}</p>
            )}
          </>
        ),
      })),
    ].slice(0, 5);
  }
  if (flow === "deep_dive") {
    return concepts.map((c: KeyConcept) => ({
      section: "Aprofundamento",
      title: c.title,
      body: (
        <>
          <p>{c.expanded_note?.explanation || c.description}</p>
          {(c.expanded_note?.key_points || []).length > 0 && (
            <ul className="list-disc pl-5 mt-2 space-y-1">
              {c.expanded_note?.key_points?.map((p, i) => <li key={i}>{p}</li>)}
            </ul>
          )}
          {c.expanded_note?.application && <p className="mt-3"><strong>Aplicação:</strong> {c.expanded_note.application}</p>}
        </>
      ),
    }));
  }
  if (flow === "memorize") {
    return [
      { section: "Memorização", title: "Frases-chave", body: <ul className="list-disc pl-5 space-y-1">{phrases.map((p, i) => <li key={i}>{p}</li>)}</ul> },
      { section: "Memorização", title: "Versículos", body: <ul className="list-disc pl-5 space-y-1 font-mono text-sm">{verses.map((v, i) => <li key={i}>📖 {v}</li>)}</ul> },
      { section: "Memorização", title: "Quiz mental", body: <p>Abra a aba <strong>Quiz</strong> no hub para testar o conteúdo.</p> },
      { section: "Memorização", title: "Revisão", body: <p>Repita esta sequência amanhã para fixar o conteúdo.</p> },
    ];
  }
  if (flow === "review") {
    return [
      { section: "Revisão rápida", title: "Tese central", body: <p>{a.summary}</p> },
      { section: "Revisão rápida", title: "Pontos-chave", body: <ul className="list-disc pl-5 space-y-1">{concepts.slice(0, 6).map((c) => <li key={c.id}><strong>{c.title}:</strong> {c.expanded_note?.core_idea || c.description}</li>)}</ul> },
      { section: "Revisão rápida", title: "Versículos", body: <ul className="list-disc pl-5 space-y-1 font-mono text-sm">{verses.slice(0, 10).map((v, i) => <li key={i}>📖 {v}</li>)}</ul> },
    ];
  }
  // teach
  return [
    { section: "Preparar para ensinar", title: "Estrutura geral", body: <ol className="list-decimal pl-5 space-y-1">{concepts.map((c) => <li key={c.id}>{c.title}</li>)}</ol> },
    { section: "Preparar para ensinar", title: "Notas por tópico", body: <ul className="space-y-3">{concepts.map((c) => <li key={c.id}><strong>{c.title}:</strong> {c.expanded_note?.explanation || c.description}</li>)}</ul> },
    { section: "Preparar para ensinar", title: "Versículos para citar", body: <ul className="list-disc pl-5 space-y-1 font-mono text-sm">{verses.map((v, i) => <li key={i}>📖 {v}</li>)}</ul> },
    { section: "Preparar para ensinar", title: "Perguntas para discussão", body: <ul className="list-disc pl-5 space-y-1">{concepts.slice(0, 5).map((c, i) => <li key={i}>O que {c.title.toLowerCase()} ensina sobre nossa vida hoje?</li>)}</ul> },
  ];
}
