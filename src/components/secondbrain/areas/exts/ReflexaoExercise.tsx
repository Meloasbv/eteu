import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { AREA_META } from "@/lib/brainAreas";

interface Props {
  thoughtId: string;
  suggested?: { questions?: string[] } | null;
  answered?: { questions?: string[]; answers?: string[] } | null;
  onSaved: () => void;
}

const FALLBACK_QUESTIONS = [
  "O que você pode controlar nessa situação?",
  "O que está fora do seu controle?",
  "Qual seria o próximo passo mais sábio?",
];

export default function ReflexaoExercise({ thoughtId, suggested, answered, onSaved }: Props) {
  const m = AREA_META.reflexao;
  const questions = (suggested?.questions && suggested.questions.length >= 1)
    ? suggested.questions.slice(0, 3)
    : (answered?.questions ?? FALLBACK_QUESTIONS);
  const [answers, setAnswers] = useState<string[]>(
    answered?.answers ?? questions.map(() => ""),
  );
  const [editing, setEditing] = useState(!answered);
  const [busy, setBusy] = useState(false);

  const save = async () => {
    setBusy(true);
    try {
      await supabase.from("thoughts")
        .update({ reflection_exercise: { questions, answers } as any })
        .eq("id", thoughtId);
      toast({ title: "Exercício salvo" });
      setEditing(false);
      onSaved();
    } catch (e: any) {
      toast({ title: "Erro ao salvar", description: e?.message, variant: "destructive" });
    } finally { setBusy(false); }
  };

  return (
    <section
      className="rounded-lg p-3 mt-1"
      style={{ background: `${m.accent}0e`, border: `1px solid ${m.border}` }}
    >
      <p className="text-[10px] uppercase tracking-wider mb-2 font-bold" style={{ color: m.accent }}>
        🪞 Exercício de Reflexão
      </p>
      <ol className="space-y-2.5">
        {questions.map((q, i) => (
          <li key={i}>
            <p className="text-[12px] mb-1" style={{ color: m.text }}>
              <strong>{i + 1}.</strong> {q}
            </p>
            {editing ? (
              <textarea
                value={answers[i] ?? ""}
                onChange={e => setAnswers(a => a.map((v, j) => j === i ? e.target.value : v))}
                placeholder="Sua resposta…"
                rows={2}
                className="w-full px-2 py-1.5 rounded-md text-[12px] bg-transparent outline-none resize-none"
                style={{ border: `1px solid ${m.border}`, color: m.text }}
              />
            ) : (
              <p className="text-[12px] italic px-2" style={{ color: m.muted }}>
                {answers[i] || "—"}
              </p>
            )}
          </li>
        ))}
      </ol>
      <div className="flex gap-2 mt-2.5">
        {editing ? (
          <button
            onClick={save}
            disabled={busy}
            className="px-3 py-1 rounded-md text-[11px] font-bold disabled:opacity-50"
            style={{ background: m.accent, color: m.bg }}
          >
            Salvar
          </button>
        ) : (
          <button
            onClick={() => setEditing(true)}
            className="px-3 py-1 rounded-md text-[11px] font-bold"
            style={{ background: "transparent", color: m.accent, border: `1px solid ${m.accent}55` }}
          >
            Editar respostas
          </button>
        )}
      </div>
    </section>
  );
}
