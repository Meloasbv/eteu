import { Copy, Check, CheckCircle2 } from "lucide-react";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { AREA_META } from "@/lib/brainAreas";
import type { AreaThought } from "../AreaCard";

interface Props {
  thought: AreaThought;
  suggested: string;
  onChanged: () => void;
}

export default function OracaoSugerida({ thought, suggested, onChanged }: Props) {
  const m = AREA_META.oracao;
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(suggested);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch { /* noop */ }
  };

  const markAnswered = async () => {
    await supabase.from("thoughts")
      .update({ prayer_status: "answered", prayer_answered_at: new Date().toISOString() } as any)
      .eq("id", thought.id);
    toast({ title: "🙏 Oração marcada como respondida" });
    onChanged();
  };

  return (
    <section
      className="rounded-lg p-3 mt-2"
      style={{ background: `${m.accent}0e`, border: `1px solid ${m.border}` }}
    >
      <p className="text-[10px] uppercase tracking-wider mb-2 font-bold" style={{ color: m.accent }}>
        🙏 Oração sugerida
      </p>
      <p
        className="text-[13.5px] italic leading-relaxed whitespace-pre-wrap"
        style={{ color: m.text, fontFamily: "'Crimson Text', Georgia, serif" }}
      >
        {suggested}
      </p>
      <div className="flex flex-wrap gap-2 mt-3">
        <button
          onClick={copy}
          className="px-2.5 py-1 rounded-md text-[11px] flex items-center gap-1.5"
          style={{ background: "transparent", color: m.accent, border: `1px solid ${m.accent}55` }}
        >
          {copied ? <Check size={11} /> : <Copy size={11} />}
          {copied ? "Copiado" : "Copiar oração"}
        </button>
        {thought.prayer_status !== "answered" && (
          <button
            onClick={markAnswered}
            className="px-2.5 py-1 rounded-md text-[11px] font-bold flex items-center gap-1.5"
            style={{ background: m.accent, color: m.bg }}
          >
            <CheckCircle2 size={11} /> Marcar respondida
          </button>
        )}
        {thought.prayer_status === "answered" && (
          <span className="px-2.5 py-1 rounded-md text-[11px]" style={{ color: m.accent }}>
            ✓ Respondida
          </span>
        )}
      </div>
    </section>
  );
}
