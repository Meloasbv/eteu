import { X } from "lucide-react";
import { FLOW_META, type StudyFlowType } from "./types";

interface Props {
  onPick: (f: StudyFlowType) => void;
  onClose: () => void;
}

const ORDER: StudyFlowType[] = ["first_pass", "deep_dive", "memorize", "review", "teach"];

export default function FlowSelector({ onPick, onClose }: Props) {
  return (
    <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-end lg:items-center justify-center p-3" onClick={onClose}>
      <div
        className="w-full max-w-lg bg-card border border-border/50 rounded-2xl p-5 max-h-[85vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-display text-lg text-foreground">Como quer estudar?</h3>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><X size={18} /></button>
        </div>
        <div className="space-y-2">
          {ORDER.map((k) => {
            const m = FLOW_META[k];
            return (
              <button
                key={k}
                onClick={() => onPick(k)}
                className="w-full text-left p-4 rounded-xl border border-border/40 hover:border-primary/40 hover:bg-primary/[0.04] transition-all"
              >
                <div className="flex items-center justify-between mb-1">
                  <p className="font-ui text-sm font-bold text-foreground">{m.icon} {m.title}</p>
                  <span className="text-[10px] text-muted-foreground">~{m.minutes} min</span>
                </div>
                <p className="text-xs text-muted-foreground">{m.subtitle}</p>
              </button>
            );
          })}
        </div>
        <button onClick={onClose} className="mt-4 w-full text-center text-xs text-muted-foreground hover:text-foreground py-2">
          Pular e explorar livre
        </button>
      </div>
    </div>
  );
}
