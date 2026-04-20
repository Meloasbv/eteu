import { CheckCircle2, Loader2, Circle, AlertCircle, FileText } from "lucide-react";
import type { PipelineProgress } from "@/lib/mindMapPipeline";

interface Props {
  fileName: string;
  progress: PipelineProgress | null;
  preExtractStep?: "uploading" | "extracting" | null;
  pages?: number;
}

export default function PipelineProgressView({ fileName, progress, preExtractStep, pages }: Props) {
  // Pre-extract phase (before we have groups)
  if (!progress || preExtractStep) {
    const preSteps = [
      { key: "uploading", label: "Upload do PDF" },
      { key: "extracting", label: pages ? `Extraindo texto (${pages} páginas)` : "Extraindo texto..." },
      { key: "preprocessing", label: "Identificando seções..." },
    ];
    const activeIdx =
      preExtractStep === "uploading" ? 0 :
      preExtractStep === "extracting" ? 1 : 2;

    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] px-4 py-8 animate-fade-in">
        <div
          className="w-full max-w-md rounded-2xl p-6"
          style={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }}
        >
          <div className="flex items-center gap-3 mb-5">
            <FileText size={18} className="text-primary flex-shrink-0" />
            <p className="text-sm font-display font-semibold text-foreground truncate">{fileName}</p>
          </div>
          <div className="space-y-3">
            {preSteps.map((s, i) => {
              const done = i < activeIdx;
              const active = i === activeIdx;
              return (
                <div
                  key={s.key}
                  className={`flex items-center gap-3 text-sm font-ui transition-opacity ${
                    done || active ? "opacity-100" : "opacity-30"
                  }`}
                >
                  {done ? (
                    <CheckCircle2 size={15} className="text-primary flex-shrink-0" />
                  ) : active ? (
                    <Loader2 size={15} className="animate-spin text-primary flex-shrink-0" />
                  ) : (
                    <Circle size={15} className="text-muted-foreground/40 flex-shrink-0" />
                  )}
                  <span className={done || active ? "text-foreground" : "text-muted-foreground"}>
                    {s.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  const { totalGroups, doneGroups, statuses } = progress;
  const percent = Math.round((doneGroups / Math.max(1, totalGroups)) * 100);

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-4 py-8 animate-fade-in">
      <div
        className="w-full max-w-md rounded-2xl p-6"
        style={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }}
      >
        <div className="flex items-center gap-3 mb-2">
          <FileText size={18} className="text-primary flex-shrink-0" />
          <p className="text-sm font-display font-semibold text-foreground truncate">{fileName}</p>
        </div>
        <p className="text-[11px] text-muted-foreground font-ui mb-5">
          {progress.pages} páginas · {totalGroups} seções identificadas
        </p>

        {/* Section list — scrollable when long */}
        <div className="space-y-2 mb-5 max-h-[40vh] overflow-y-auto pr-1">
          {statuses.map((s, i) => {
            const Icon =
              s.state === "done" ? CheckCircle2 :
              s.state === "running" ? Loader2 :
              s.state === "error" ? AlertCircle :
              Circle;
            const iconClass =
              s.state === "done" ? "text-primary" :
              s.state === "running" ? "text-primary animate-spin" :
              s.state === "error" ? "text-destructive" :
              "text-muted-foreground/40";
            const opacity =
              s.state === "pending" ? "opacity-40" : "opacity-100";
            return (
              <div
                key={`${s.groupId}-${i}`}
                className={`flex items-start gap-2.5 text-[13px] font-ui transition-all ${opacity}`}
              >
                <Icon size={14} className={`${iconClass} flex-shrink-0 mt-0.5`} />
                <div className="min-w-0 flex-1">
                  <p className="text-foreground truncate leading-snug">
                    {s.isQuiz ? "🎯 " : ""}{s.title}
                  </p>
                  <p className="text-[10px] text-muted-foreground/60">
                    Slides {s.pageRange[0]}{s.pageRange[1] !== s.pageRange[0] ? `–${s.pageRange[1]}` : ""}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Progress bar */}
        <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ background: "hsl(var(--muted))" }}>
          <div
            className="h-full rounded-full transition-all duration-300 ease-out"
            style={{ width: `${percent}%`, background: "hsl(var(--primary))" }}
          />
        </div>
        <div className="flex items-center justify-between mt-1.5">
          <p className="text-[11px] text-muted-foreground font-ui">
            {doneGroups}/{totalGroups} seções
          </p>
          <p className="text-[11px] text-primary/80 font-ui font-medium">{percent}%</p>
        </div>
      </div>
    </div>
  );
}
