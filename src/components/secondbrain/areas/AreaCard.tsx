import { useState } from "react";
import { ChevronDown, ChevronUp, MoreHorizontal, Trash2, Archive } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { AREA_META, type BrainArea } from "@/lib/brainAreas";
import ReflexaoExercise from "./exts/ReflexaoExercise";
import OracaoSugerida from "./exts/OracaoSugerida";
import BrainstormExpand from "./exts/BrainstormExpand";

export interface AreaThought {
  id: string;
  content: string;
  type: string;
  created_at: string;
  analysis: any;
  keywords: string[];
  emotion_valence: number;
  emotion_intensity: number;
  prayer_status?: string | null;
  prayer_answered_at?: string | null;
  kanban_status?: string | null;
  reflection_exercise?: any;
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "agora";
  if (mins < 60) return `há ${mins}min`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `há ${hrs}h`;
  const days = Math.floor(hrs / 24);
  if (days === 1) return "ontem";
  return `há ${days}d`;
}

interface Props {
  area: BrainArea;
  thought: AreaThought;
  onChanged: () => void;
}

export default function AreaCard({ area, thought, onChanged }: Props) {
  const m = AREA_META[area];
  const [expanded, setExpanded] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const a = thought.analysis ?? {};

  const archive = async () => {
    await supabase.from("thoughts").update({ archived: true }).eq("id", thought.id);
    toast({ title: "Arquivado" });
    onChanged();
  };
  const remove = async () => {
    if (!confirm("Excluir este pensamento permanentemente?")) return;
    await supabase.from("thought_connections").delete()
      .or(`thought_a.eq.${thought.id},thought_b.eq.${thought.id}`);
    await supabase.from("thoughts").delete().eq("id", thought.id);
    toast({ title: "Excluído" });
    onChanged();
  };

  return (
    <article
      className="rounded-xl p-3.5 transition-all"
      style={{
        background: `${m.surface}cc`,
        border: `1px solid ${m.border}`,
        backdropFilter: "blur(6px)",
      }}
    >
      <header className="flex items-start gap-2 mb-2">
        <span className="text-[16px] mt-0.5">{m.emoji}</span>
        <div className="flex-1 min-w-0">
          <p className="text-[10px] uppercase tracking-wider" style={{ color: m.muted }}>
            {thought.type} · {timeAgo(thought.created_at)}
          </p>
          <p className="text-[14px] leading-relaxed mt-1 whitespace-pre-wrap break-words"
             style={{ color: m.text, fontFamily: area === "oracao" ? "'Crimson Text', Georgia, serif" : undefined }}>
            {thought.content}
          </p>
        </div>
        <div className="relative">
          <button
            onClick={() => setMenuOpen(o => !o)}
            className="p-1 rounded hover:bg-white/5"
            style={{ color: m.muted }}
            aria-label="Mais ações"
          >
            <MoreHorizontal size={14} />
          </button>
          {menuOpen && (
            <div
              className="absolute right-0 top-full mt-1 w-36 rounded-md py-1 z-10"
              style={{ background: m.surface, border: `1px solid ${m.border}` }}
            >
              <button onClick={archive} className="w-full px-2.5 py-1.5 text-left text-[11px] hover:bg-white/5 flex items-center gap-1.5"
                      style={{ color: m.text }}>
                <Archive size={11} /> Arquivar
              </button>
              <button onClick={remove} className="w-full px-2.5 py-1.5 text-left text-[11px] hover:bg-white/5 flex items-center gap-1.5"
                      style={{ color: "#e85d5d" }}>
                <Trash2 size={11} /> Excluir
              </button>
            </div>
          )}
        </div>
      </header>

      {/* Area-specific extension always visible (compact) */}
      {area === "oracao" && a.suggested_prayer && (
        <OracaoSugerida thought={thought} suggested={a.suggested_prayer} onChanged={onChanged} />
      )}

      {/* Expand for full analysis */}
      {(a.psychological_analysis || a.biblical_analysis || a.diagnosis || a.expansion || a.reflection_exercise || thought.reflection_exercise) && (
        <button
          onClick={() => setExpanded(e => !e)}
          className="mt-2 flex items-center gap-1 text-[10.5px] uppercase tracking-wider"
          style={{ color: m.accent }}
        >
          {expanded ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
          {expanded ? "Recolher" : "Análise da IA"}
        </button>
      )}

      {expanded && (
        <div className="mt-3 space-y-3 text-[12.5px] leading-relaxed" style={{ color: m.text }}>
          {area !== "oracao" && a.psychological_analysis && (
            <section>
              <p className="text-[10px] uppercase tracking-wider mb-1" style={{ color: m.muted }}>
                🧠 {a.psychological_analysis.pattern}
              </p>
              <p>{a.psychological_analysis.explanation}</p>
              {a.psychological_analysis.reframe && (
                <p className="mt-1 italic" style={{ color: m.accent }}>↳ {a.psychological_analysis.reframe}</p>
              )}
            </section>
          )}
          {a.biblical_analysis && (
            <section>
              <p className="text-[10px] uppercase tracking-wider mb-1" style={{ color: m.muted }}>
                ✝️ {a.biblical_analysis.principle}
              </p>
              <p>{a.biblical_analysis.application}</p>
              {Array.isArray(a.biblical_analysis.verses) && a.biblical_analysis.verses.length > 0 && (
                <p className="mt-1 text-[11px]" style={{ color: m.accent }}>
                  {a.biblical_analysis.verses.join(" · ")}
                </p>
              )}
            </section>
          )}
          {a.diagnosis && (
            <section>
              <p className="text-[10px] uppercase tracking-wider mb-1" style={{ color: m.muted }}>💬 Direção</p>
              <p>{a.diagnosis.summary}</p>
              {a.diagnosis.action && <p className="mt-1"><strong>Ação:</strong> {a.diagnosis.action}</p>}
              {a.diagnosis.question && <p className="mt-1 italic">"{a.diagnosis.question}"</p>}
            </section>
          )}
          {area === "reflexao" && (a.reflection_exercise || thought.reflection_exercise) && (
            <ReflexaoExercise
              thoughtId={thought.id}
              suggested={a.reflection_exercise}
              answered={thought.reflection_exercise}
              onSaved={onChanged}
            />
          )}
          {area === "brainstorm" && a.expansion && (
            <BrainstormExpand expansion={a.expansion} />
          )}
        </div>
      )}
    </article>
  );
}
