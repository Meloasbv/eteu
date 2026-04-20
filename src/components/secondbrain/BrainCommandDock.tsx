import { useEffect, useRef, useState } from "react";
import { Send, Mic, MicOff, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { haptic } from "@/hooks/useHaptic";
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

const TYPES: { key: string; emoji: string; label: string }[] = [
  { key: "auto", emoji: "✨", label: "Auto" },
  { key: "ideia", emoji: "💭", label: "Ideia" },
  { key: "reflexão", emoji: "🪞", label: "Reflexão" },
  { key: "decisão", emoji: "⚖️", label: "Decisão" },
  { key: "oração", emoji: "🙏", label: "Oração" },
  { key: "insight", emoji: "💡", label: "Insight" },
];

interface Props {
  userCodeId: string;
  initialContent?: string;
  onCaptured?: (thoughtId: string) => void;
}

export default function BrainCommandDock({ userCodeId, initialContent, onCaptured }: Props) {
  const [content, setContent] = useState(initialContent ?? "");
  const [type, setType] = useState("auto");
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

  useEffect(() => {
    taRef.current?.focus();
  }, []);

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
      const insertType = type === "auto" ? "reflexão" : type;
      const { data: inserted, error: insertErr } = await supabase
        .from("thoughts")
        .insert({ user_code_id: userCodeId, content: text, type: insertType })
        .select("id")
        .single();
      if (insertErr) throw insertErr;

      // Notify graph
      window.dispatchEvent(new CustomEvent("brain-thought-added", { detail: { id: inserted.id } }));
      toast({ title: "⚡ Capturado", description: "Analisando conexões…" });
      setContent("");
      if (taRef.current) taRef.current.style.height = "44px";
      onCaptured?.(inserted.id);

      // Background analysis (don't block UI)
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

          const pastList = (past ?? []).map((p) => ({
            id: p.id,
            type: p.type,
            content: p.content,
            keywords: (p.keywords as string[]) ?? [],
          }));

          const { data: ai, error: aiErr } = await supabase.functions.invoke("analyze-thought", {
            body: { content: text, pastThoughts: pastList.map((p) => p.content) },
          });
          if (aiErr) throw aiErr;

          await supabase
            .from("thoughts")
            .update({
              analysis: ai,
              type: type === "auto" ? ai?.detected_type ?? insertType : insertType,
              keywords: ai?.keywords ?? [],
              emotion_valence: ai?.emotion_score?.valence ?? 0,
              emotion_intensity: ai?.emotion_score?.intensity ?? 0,
            })
            .eq("id", inserted.id);

          // Persist connections
          const conns = Array.isArray(ai?.connections) ? ai.connections : [];
          for (const c of conns) {
            const target = pastList[c.past_index];
            if (!target) continue;
            const [a, b] = [inserted.id, target.id].sort();
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
          window.dispatchEvent(new CustomEvent("brain-thought-added", { detail: { id: inserted.id, analyzed: true } }));
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
    if (recording) {
      recRef.current?.stop();
      setRecording(false);
      return;
    }
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
      if (taRef.current) {
        taRef.current.value = next;
        autosize(taRef.current);
      }
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
        background: PALETTE.surface,
        border: `1px solid ${PALETTE.border}`,
        boxShadow: `0 12px 40px -12px ${PALETTE.primary}33, 0 0 0 1px ${PALETTE.primary}11`,
      }}
    >
      {/* Type chips */}
      <div className="flex items-center gap-1.5 px-3 pt-2.5 pb-1.5 overflow-x-auto no-scrollbar">
        <Sparkles size={11} style={{ color: PALETTE.primary }} className="shrink-0" />
        {TYPES.map((t) => {
          const active = type === t.key;
          return (
            <button
              key={t.key}
              onClick={() => {
                setType(t.key);
                haptic("light");
              }}
              className="shrink-0 px-2 py-0.5 rounded-full text-[10.5px] font-bold transition-all hover:scale-105"
              style={{
                background: active ? `${PALETTE.primary}1a` : "transparent",
                color: active ? PALETTE.primary : PALETTE.textDim,
                border: `1px solid ${active ? PALETTE.primary + "55" : PALETTE.border}`,
              }}
            >
              {t.emoji} {t.label}
            </button>
          );
        })}
      </div>

      <div className="flex items-end gap-2 p-2">
        <textarea
          ref={taRef}
          value={content}
          onChange={(e) => {
            setContent(e.target.value);
            autosize(e.target);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              capture();
            }
          }}
          placeholder="Lance um pensamento, ideia ou plano…"
          className="flex-1 resize-none bg-transparent border-none outline-none px-2.5 py-2 text-[14.5px] placeholder:opacity-40"
          style={{
            fontFamily: "'Crimson Text', Georgia, serif",
            color: PALETTE.text,
            height: "44px",
            maxHeight: "180px",
          }}
        />
        <button
          onClick={toggleVoice}
          className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-all"
          style={{
            background: recording ? `${PALETTE.primary}22` : PALETTE.surfaceLight,
            color: recording ? PALETTE.primary : PALETTE.text,
            border: `1px solid ${recording ? PALETTE.primary + "66" : PALETTE.border}`,
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
            background: PALETTE.primary,
            color: PALETTE.bg,
            boxShadow: `0 4px 16px -4px ${PALETTE.primary}88`,
          }}
        >
          <Send size={13} strokeWidth={2.6} /> Capturar
        </button>
      </div>
      <p className="text-[10px] text-center pb-2" style={{ color: PALETTE.textDim }}>
        Enter captura · Shift+Enter quebra linha · arraste texto sobre o grafo
      </p>
      <style>{`.no-scrollbar::-webkit-scrollbar{display:none}.no-scrollbar{-ms-overflow-style:none;scrollbar-width:none}`}</style>
    </div>
  );
}
