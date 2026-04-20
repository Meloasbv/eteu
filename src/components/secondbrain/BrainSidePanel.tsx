import { useEffect, useState } from "react";
import { Brain, Sparkles, BookMarked, Lightbulb, Archive, Trash2, Unlink } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

const PALETTE = {
  bg: "#0B0F14",
  surface: "#11161D",
  surfaceLight: "#1A2129",
  border: "#1F2730",
  primary: "#00FF94",
  text: "#E6EDF3",
  textDim: "#7A8A99",
};

const TYPE_LABELS: Record<string, { emoji: string; label: string }> = {
  problema: { emoji: "🔴", label: "Problema" },
  insight: { emoji: "💡", label: "Insight" },
  estudo: { emoji: "📖", label: "Estudo" },
  reflexão: { emoji: "🪞", label: "Reflexão" },
  oração: { emoji: "🙏", label: "Oração" },
  decisão: { emoji: "⚖️", label: "Decisão" },
  emocional: { emoji: "💛", label: "Emocional" },
  ideia: { emoji: "💭", label: "Ideia" },
  pergunta: { emoji: "❓", label: "Pergunta" },
};

const CONN: Record<string, { emoji: string; label: string; color: string }> = {
  semantic: { emoji: "🔗", label: "Semântica", color: "#00FF94" },
  emotional: { emoji: "💗", label: "Emocional", color: "#f08aa8" },
  thematic: { emoji: "📚", label: "Temática", color: "#5b9fd4" },
  causal: { emoji: "➡️", label: "Causal", color: "#e89047" },
  recurring: { emoji: "🔄", label: "Recorrente", color: "#b97ac4" },
};

interface Thought {
  id: string;
  content: string;
  type: string;
  created_at: string;
  analysis: any;
}
interface Conn {
  thought_a: string;
  thought_b: string;
  connection_type: string;
  strength: number | null;
  explanation: string | null;
  other?: { id: string; content: string; type: string };
}

interface Props {
  thoughtId: string | null;
  userCodeId: string;
  onSelect: (id: string) => void;
  onClose: () => void;
}

export default function BrainSidePanel({ thoughtId, userCodeId, onSelect, onClose }: Props) {
  const [thought, setThought] = useState<Thought | null>(null);
  const [conns, setConns] = useState<Conn[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!thoughtId) {
      setThought(null);
      setConns([]);
      return;
    }
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data: t } = await supabase
        .from("thoughts")
        .select("id, content, type, created_at, analysis")
        .eq("id", thoughtId)
        .maybeSingle();
      if (cancelled) return;
      setThought(t as any);

      const { data: cs } = await supabase
        .from("thought_connections")
        .select("thought_a, thought_b, connection_type, strength, explanation")
        .eq("user_code_id", userCodeId)
        .or(`thought_a.eq.${thoughtId},thought_b.eq.${thoughtId}`);
      if (cancelled) return;

      const otherIds = (cs ?? []).map((c) => (c.thought_a === thoughtId ? c.thought_b : c.thought_a));
      const { data: others } = otherIds.length
        ? await supabase.from("thoughts").select("id, content, type").in("id", otherIds)
        : { data: [] as any };

      const byId = new Map((others ?? []).map((o: any) => [o.id, o]));
      const enriched = (cs ?? [])
        .map((c) => {
          const otherId = c.thought_a === thoughtId ? c.thought_b : c.thought_a;
          return { ...c, other: byId.get(otherId) } as Conn;
        })
        .filter((c) => c.other)
        .sort((a, b) => (b.strength ?? 0) - (a.strength ?? 0));
      setConns(enriched);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [thoughtId, userCodeId]);

  const archive = async () => {
    if (!thoughtId) return;
    await supabase.from("thoughts").update({ archived: true }).eq("id", thoughtId);
    toast({ title: "Arquivado" });
    window.dispatchEvent(new CustomEvent("brain-thought-added"));
    onClose();
  };

  const removeConnections = async () => {
    if (!thoughtId) return;
    await supabase
      .from("thought_connections")
      .delete()
      .or(`thought_a.eq.${thoughtId},thought_b.eq.${thoughtId}`);
    toast({ title: "Conexões removidas" });
    window.dispatchEvent(new CustomEvent("brain-thought-added"));
    setConns([]);
  };

  const destroy = async () => {
    if (!thoughtId) return;
    if (!confirm("Excluir este pensamento permanentemente?")) return;
    await supabase
      .from("thought_connections")
      .delete()
      .or(`thought_a.eq.${thoughtId},thought_b.eq.${thoughtId}`);
    await supabase.from("thoughts").delete().eq("id", thoughtId);
    toast({ title: "Excluído" });
    window.dispatchEvent(new CustomEvent("brain-thought-added"));
    onClose();
  };

  if (!thoughtId) {
    return (
      <div className="h-full flex flex-col items-center justify-center px-6 text-center" style={{ color: PALETTE.textDim }}>
        <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-3"
          style={{ background: `${PALETTE.primary}11`, border: `1px solid ${PALETTE.primary}33` }}>
          <Brain size={20} style={{ color: PALETTE.primary }} />
        </div>
        <p className="text-[12.5px] font-bold mb-1" style={{ color: PALETTE.text }}>
          Selecione um nó
        </p>
        <p className="text-[11.5px] leading-snug">
          Clique em um pensamento no grafo para ver sua análise completa, conexões e ações.
        </p>
      </div>
    );
  }

  if (!thought) {
    return (
      <div className="h-full flex items-center justify-center text-[12px]" style={{ color: PALETTE.textDim }}>
        {loading ? "Carregando…" : "Pensamento não encontrado"}
      </div>
    );
  }

  const tlabel = TYPE_LABELS[thought.type] ?? { emoji: "💭", label: thought.type };
  const a = thought.analysis as any | null;

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-4 border-b shrink-0" style={{ borderColor: PALETTE.border, background: PALETTE.surface }}>
        <div className="flex items-center gap-2 mb-2">
          <span className="text-[10.5px] font-bold uppercase tracking-[1.5px] px-1.5 py-0.5 rounded"
            style={{ background: `${PALETTE.primary}14`, color: PALETTE.primary, border: `1px solid ${PALETTE.primary}33` }}>
            {tlabel.emoji} {tlabel.label}
          </span>
          <span className="text-[10px]" style={{ color: PALETTE.textDim }}>
            {new Date(thought.created_at).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}
          </span>
        </div>
        <p className="text-[14px] leading-[1.65]"
          style={{ color: PALETTE.text, fontFamily: "'Crimson Text', Georgia, serif", fontStyle: "italic" }}>
          {thought.content}
        </p>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {a?.psychological_analysis && (
          <Section icon={<Brain size={10} />} title="Psicológico">
            <p className="text-[12px] font-bold mb-1" style={{ color: PALETTE.text }}>
              {a.psychological_analysis.pattern}
            </p>
            <p className="text-[12px] leading-[1.55] mb-1.5" style={{ color: PALETTE.textDim }}>
              {a.psychological_analysis.explanation}
            </p>
            <p className="text-[11.5px] leading-[1.5] pl-2"
              style={{ color: PALETTE.primary, borderLeft: `2px solid ${PALETTE.primary}55` }}>
              ↻ {a.psychological_analysis.reframe}
            </p>
          </Section>
        )}

        {a?.biblical_analysis && (
          <Section icon={<BookMarked size={10} />} title="Bíblico">
            <p className="text-[12px] font-bold mb-1" style={{ color: PALETTE.text }}>
              {a.biblical_analysis.principle}
            </p>
            <p className="text-[12px] leading-[1.55]" style={{ color: PALETTE.textDim }}>
              {a.biblical_analysis.application}
            </p>
            {a.biblical_analysis.verses?.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-1.5">
                {a.biblical_analysis.verses.map((v: string, i: number) => (
                  <span key={i} className="text-[10.5px] px-1.5 py-0.5 rounded"
                    style={{ background: `${PALETTE.primary}10`, color: PALETTE.primary, border: `1px solid ${PALETTE.primary}33` }}>
                    {v}
                  </span>
                ))}
              </div>
            )}
          </Section>
        )}

        {a?.diagnosis && (
          <Section icon={<Lightbulb size={10} />} title="Diagnóstico">
            <p className="text-[12px] font-semibold mb-1.5" style={{ color: PALETTE.text }}>
              "{a.diagnosis.summary}"
            </p>
            <p className="text-[11.5px] mb-1" style={{ color: PALETTE.textDim }}>
              ⚡ <span style={{ color: PALETTE.text }}>{a.diagnosis.action}</span>
            </p>
            <p className="text-[11.5px] italic" style={{ color: PALETTE.textDim }}>
              ❓ {a.diagnosis.question}
            </p>
          </Section>
        )}

        <div>
          <div className="flex items-center gap-1.5 px-1 mb-1.5">
            <Sparkles size={10} style={{ color: PALETTE.primary }} />
            <span className="text-[9.5px] font-bold uppercase tracking-[1.5px]" style={{ color: PALETTE.textDim }}>
              Conexões ({conns.length})
            </span>
          </div>
          {conns.length === 0 ? (
            <p className="text-[11px] italic px-2 py-3 text-center" style={{ color: PALETTE.textDim }}>
              Nenhuma conexão ainda.
            </p>
          ) : (
            <div className="space-y-1.5">
              {conns.map((c, i) => {
                const ct = CONN[c.connection_type] || CONN.semantic;
                const strength = Math.round((c.strength ?? 0.5) * 100);
                return (
                  <button
                    key={i}
                    onClick={() => c.other && onSelect(c.other.id)}
                    className="w-full text-left p-2 rounded-lg transition-all hover:scale-[1.01]"
                    style={{ background: PALETTE.surfaceLight, border: `1px solid ${ct.color}33` }}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] font-bold" style={{ color: ct.color }}>
                        {ct.emoji} {ct.label}
                      </span>
                      <span className="text-[10px] font-mono" style={{ color: PALETTE.textDim }}>
                        {strength}%
                      </span>
                    </div>
                    <div className="h-0.5 rounded-full mb-1.5 overflow-hidden" style={{ background: `${PALETTE.border}` }}>
                      <div className="h-full rounded-full" style={{ width: `${strength}%`, background: ct.color }} />
                    </div>
                    {c.explanation && (
                      <p className="text-[10.5px] leading-snug italic mb-1" style={{ color: PALETTE.textDim }}>
                        "{c.explanation}"
                      </p>
                    )}
                    {c.other && (
                      <p className="text-[10.5px] line-clamp-2" style={{ color: PALETTE.text }}>
                        {c.other.content}
                      </p>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="p-2 border-t shrink-0 flex gap-1.5" style={{ borderColor: PALETTE.border, background: PALETTE.surface }}>
        <ActionBtn icon={<Archive size={11} />} label="Arquivar" onClick={archive} />
        <ActionBtn icon={<Unlink size={11} />} label="Conexões" onClick={removeConnections} />
        <ActionBtn icon={<Trash2 size={11} />} label="Excluir" onClick={destroy} danger />
      </div>
    </div>
  );
}

function Section({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div className="p-2.5 rounded-lg" style={{ background: PALETTE.surface, border: `1px solid ${PALETTE.border}` }}>
      <div className="flex items-center gap-1.5 mb-1.5">
        <span style={{ color: PALETTE.primary }}>{icon}</span>
        <p className="text-[9.5px] font-bold uppercase tracking-[1.6px]" style={{ color: PALETTE.textDim }}>
          {title}
        </p>
      </div>
      {children}
    </div>
  );
}

function ActionBtn({ icon, label, onClick, danger }: { icon: React.ReactNode; label: string; onClick: () => void; danger?: boolean }) {
  return (
    <button
      onClick={onClick}
      className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg text-[10.5px] font-bold transition-all hover:scale-[1.02]"
      style={{
        background: PALETTE.surfaceLight,
        color: danger ? "#ff7a7a" : PALETTE.text,
        border: `1px solid ${danger ? "#ff7a7a33" : PALETTE.border}`,
      }}
    >
      {icon} {label}
    </button>
  );
}
