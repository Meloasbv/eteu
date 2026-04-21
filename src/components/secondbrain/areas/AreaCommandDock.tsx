import { useEffect, useRef, useState } from "react";
import { Send, Mic, MicOff, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { haptic } from "@/hooks/useHaptic";
import { toast } from "@/hooks/use-toast";
import { AREA_META, type BrainArea } from "@/lib/brainAreas";

interface Props {
  area: BrainArea;
  userCodeId: string;
  initialContent?: string;
  onCaptured?: (id: string) => void;
}

export default function AreaCommandDock({ area, userCodeId, initialContent, onCaptured }: Props) {
  const m = AREA_META[area];
  const [content, setContent] = useState(initialContent ?? "");
  const [busy, setBusy] = useState(false);
  const [recording, setRecording] = useState(false);
  const taRef = useRef<HTMLTextAreaElement>(null);
  const recRef = useRef<any>(null);

  useEffect(() => {
    if (initialContent) {
      setContent(initialContent);
      setTimeout(() => taRef.current?.focus(), 50);
    }
  }, [initialContent]);

  const autosize = (el: HTMLTextAreaElement) => {
    el.style.height = "44px";
    el.style.height = Math.min(el.scrollHeight, 180) + "px";
  };

  const capture = async () => {
    const text = content.trim();
    if (!text || busy) return;
    setBusy(true);
    haptic("medium");
    try {
      const { data: inserted, error } = await supabase
        .from("thoughts")
        .insert({
          user_code_id: userCodeId,
          content: text,
          type: m.defaultType,
          area: area,
          ...(area === "oracao" ? { prayer_status: "pending" } : {}),
          ...(area === "brainstorm" ? { kanban_status: "idea" } : {}),
        } as any)
        .select("id")
        .single();
      if (error) throw error;

      window.dispatchEvent(new CustomEvent("brain-thought-added", { detail: { id: inserted.id, area } }));
      toast({ title: `${m.emoji} ${m.label}`, description: "Pensamento capturado · analisando…" });
      setContent("");
      if (taRef.current) taRef.current.style.height = "44px";
      onCaptured?.(inserted.id);

      // Background analysis
      (async () => {
        try {
          const { data: past } = await supabase
            .from("thoughts")
            .select("id, type, content, keywords")
            .eq("user_code_id", userCodeId)
            .eq("archived", false)
            .neq("id", inserted.id)
            .order("created_at", { ascending: false })
            .limit(25);

          const pastList = (past ?? []).map(p => ({
            id: p.id, type: p.type, content: p.content,
            keywords: (p.keywords as string[]) ?? [],
          }));

          const { data: ai, error: aiErr } = await supabase.functions.invoke("analyze-thought", {
            body: { content: text, area, pastThoughts: pastList },
          });
          if (aiErr) throw aiErr;
          const analysis = ai?.analysis ?? ai;
          if (!analysis) return;

          await supabase
            .from("thoughts")
            .update({
              analysis: analysis as any,
              keywords: analysis.keywords ?? [],
              emotion_valence: analysis.emotion_score?.valence ?? 0,
              emotion_intensity: analysis.emotion_score?.intensity ?? 0,
              ...(analysis.reflection_exercise ? { reflection_exercise: analysis.reflection_exercise } : {}),
            } as any)
            .eq("id", inserted.id);

          // Persist connections
          const conns = Array.isArray(analysis.resolved_connections) ? analysis.resolved_connections : [];
          for (const c of conns) {
            const [a, b] = [inserted.id, c.target_id].sort();
            await supabase.from("thought_connections").upsert(
              {
                user_code_id: userCodeId,
                thought_a: a,
                thought_b: b,
                connection_type: c.type ?? "semantic",
                strength: typeof c.strength === "number" ? c.strength : 0.5,
                explanation: c.explanation ?? null,
              },
              { onConflict: "thought_a,thought_b" },
            );
          }
          window.dispatchEvent(new CustomEvent("brain-thought-added", { detail: { id: inserted.id, analyzed: true, area } }));
        } catch (e) {
          console.error("background analysis failed", e);
        }
      })();
    } catch (e: any) {
      console.error(e);
      toast({ title: "Erro ao capturar", description: e?.message ?? "", variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  const toggleVoice = () => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) {
      toast({ title: "Voz não suportada neste navegador", variant: "destructive" });
      return;
    }
    if (recording) { recRef.current?.stop(); setRecording(false); return; }
    const rec = new SR();
    rec.lang = "pt-BR";
    rec.interimResults = true;
    rec.continuous = true;
    let final = content ? content + " " : "";
    rec.onresult = (ev: any) => {
      let interim = "";
      for (let i = ev.resultIndex; i < ev.results.length; i++) {
        const tr = ev.results[i][0].transcript;
        if (ev.results[i].isFinal) final += tr + " ";
        else interim += tr;
      }
      const next = (final + interim).trim();
      setContent(next);
      if (taRef.current) { taRef.current.value = next; autosize(taRef.current); }
    };
    rec.onerror = () => setRecording(false);
    rec.onend = () => setRecording(false);
    rec.start();
    recRef.current = rec;
    setRecording(true);
    haptic("light");
  };

  return (
    <div
      className="rounded-2xl shadow-2xl"
      style={{
        background: m.surface,
        border: `1px solid ${m.border}`,
        boxShadow: `0 12px 40px -12px ${m.accent}33, 0 0 0 1px ${m.accentGlow}`,
      }}
    >
      <div className="flex items-center gap-1.5 px-3 pt-2.5 pb-1">
        <Sparkles size={11} style={{ color: m.accent }} className="shrink-0" />
        <span className="text-[10px] uppercase tracking-[2px] font-bold" style={{ color: m.muted }}>
          {m.emoji} Modo {m.label}
        </span>
      </div>

      <div className="flex items-end gap-2 p-2">
        <textarea
          ref={taRef}
          value={content}
          onChange={e => { setContent(e.target.value); autosize(e.target); }}
          onKeyDown={e => {
            if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); capture(); }
          }}
          placeholder={m.placeholder}
          className="flex-1 resize-none bg-transparent border-none outline-none px-2.5 py-2 text-[14.5px] placeholder:opacity-40"
          style={{
            fontFamily: area === "oracao" ? "'Crimson Text', Georgia, serif" : "ui-sans-serif, system-ui",
            fontStyle: area === "oracao" ? "italic" : "normal",
            color: m.text,
            height: "44px",
            maxHeight: "180px",
          }}
        />
        <button
          onClick={toggleVoice}
          className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-all"
          style={{
            background: recording ? `${m.accent}22` : `${m.accent}0e`,
            color: recording ? m.accent : m.text,
            border: `1px solid ${recording ? m.accent + "66" : m.border}`,
          }}
          aria-label={recording ? "Parar gravação" : "Capturar por voz"}
        >
          {recording ? <MicOff size={15} /> : <Mic size={15} />}
        </button>
        <button
          onClick={capture}
          disabled={busy || !content.trim()}
          className="h-10 px-3.5 rounded-xl flex items-center gap-1.5 shrink-0 transition-all hover:scale-105 active:scale-95 disabled:opacity-30 disabled:scale-100 text-[12px] font-bold"
          style={{
            background: m.accent,
            color: m.bg,
            boxShadow: `0 4px 16px -4px ${m.accent}88`,
          }}
        >
          <Send size={13} strokeWidth={2.6} /> {m.ctaLabel}
        </button>
      </div>
    </div>
  );
}
