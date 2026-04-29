import { Mic, Trash2, Clock, BookOpen } from "lucide-react";
import type { StudySessionRow } from "./types";

interface Props {
  sessions: StudySessionRow[];
  onOpen: (s: StudySessionRow) => void;
  onDelete: (id: string) => void;
}

function formatDuration(s: number) {
  if (!s) return "—";
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${String(sec).padStart(2, "0")}`;
}

function formatRelative(iso: string) {
  const d = new Date(iso);
  const days = Math.floor((Date.now() - d.getTime()) / 86400000);
  if (days === 0) return "hoje";
  if (days === 1) return "ontem";
  if (days < 7) return `${days} dias atrás`;
  return d.toLocaleDateString("pt-BR");
}

export default function SessionsList({ sessions, onOpen, onDelete }: Props) {
  if (sessions.length === 0) {
    return (
      <div className="text-center text-sm text-muted-foreground py-10 border border-dashed border-border/50 rounded-2xl">
        Nenhuma sessão ainda. Comece gravando uma aula.
      </div>
    );
  }
  return (
    <div className="space-y-2">
      <p className="text-[10px] tracking-[2px] uppercase text-muted-foreground/70 font-ui px-2 mb-1">
        Sessões anteriores
      </p>
      {sessions.map((s) => {
        const topicCount = (s.topics || []).length;
        const verses = (s.topics || []).reduce((acc, t) => acc + (t.verses?.length || 0), 0);
        return (
          <div
            key={s.id}
            className="group flex items-center gap-3 p-3 rounded-xl border border-border/40 hover:border-primary/40 bg-card/30 hover:bg-card/60 transition-all cursor-pointer"
            onClick={() => onOpen(s)}
          >
            <div
              className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
              style={{ background: "hsl(var(--primary) / 0.1)" }}
            >
              <BookOpen size={18} className="text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-ui text-foreground truncate">{s.title}</p>
              <div className="flex items-center gap-3 text-[11px] text-muted-foreground mt-0.5">
                <span className="flex items-center gap-1"><Clock size={10} />{formatDuration(s.duration_seconds)}</span>
                <span>{topicCount} tópicos</span>
                {verses > 0 && <span>{verses} versículos</span>}
                <span className="ml-auto">{formatRelative(s.created_at)}</span>
              </div>
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (confirm("Remover esta sessão?")) onDelete(s.id);
              }}
              className="opacity-0 group-hover:opacity-100 transition-opacity p-2 text-muted-foreground hover:text-destructive"
              aria-label="Remover"
            >
              <Trash2 size={14} />
            </button>
          </div>
        );
      })}
    </div>
  );
}
