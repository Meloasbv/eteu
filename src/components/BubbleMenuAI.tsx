import { useState, useRef, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Editor } from "@tiptap/react";

type AIAction = "comment" | "context" | "meaning" | "question" | "summary";

const AI_OPTIONS: { action: AIAction; icon: string; label: string }[] = [
  { action: "comment", icon: "💬", label: "Comentário" },
  { action: "context", icon: "📖", label: "Contexto bíblico" },
  { action: "meaning", icon: "🔤", label: "Significado original" },
  { action: "question", icon: "❓", label: "Pergunta de reflexão" },
  { action: "summary", icon: "📋", label: "Resumir" },
];

interface BubbleMenuAIProps {
  editor: Editor;
}

export default function BubbleMenuAI({ editor }: BubbleMenuAIProps) {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [resultAction, setResultAction] = useState<AIAction | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const resultRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    if (!dropdownOpen) return;
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [dropdownOpen]);

  // Close result on outside click
  useEffect(() => {
    if (!result) return;
    const handler = (e: MouseEvent) => {
      if (resultRef.current && !resultRef.current.contains(e.target as Node)) {
        setResult(null);
        setResultAction(null);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [result]);

  const handleAction = useCallback(async (action: AIAction) => {
    const { from, to } = editor.state.selection;
    const selectedText = editor.state.doc.textBetween(from, to, " ");
    if (!selectedText.trim()) return;

    setDropdownOpen(false);
    setLoading(true);
    setResult(null);
    setResultAction(action);

    try {
      const { data, error } = await supabase.functions.invoke("selection-ai", {
        body: { action, selectedText },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      setResult(data.result || "Sem resultado.");
    } catch (e: any) {
      setResult(`Erro: ${e.message || "Tente novamente."}`);
    } finally {
      setLoading(false);
    }
  }, [editor]);

  const handleInsert = useCallback(() => {
    if (!result || !editor) return;
    const actionLabel = AI_OPTIONS.find(o => o.action === resultAction)?.label || "IA";

    editor
      .chain()
      .focus()
      .insertContent(
        `<blockquote><p><strong>[${actionLabel}]</strong></p><p><em>${result.replace(/\n/g, "<br/>")}</em></p></blockquote>`
      )
      .run();

    setResult(null);
    setResultAction(null);
  }, [result, resultAction, editor]);

  const handleCopy = useCallback(() => {
    if (!result) return;
    navigator.clipboard.writeText(result);
  }, [result]);

  return (
    <div className="relative" ref={dropdownRef}>
      {/* AI trigger button */}
      <button
        type="button"
        onClick={() => { setDropdownOpen(!dropdownOpen); setResult(null); }}
        className="px-2 h-8 rounded-md border border-primary/30 cursor-pointer flex items-center gap-1 text-xs font-semibold
          bg-primary/10 text-primary hover:bg-primary/20 transition-all duration-150"
        title="IA"
      >
        ✨ IA
      </button>

      {/* Dropdown */}
      {dropdownOpen && (
        <div className="absolute top-full left-0 mt-1 z-50 bg-card border border-border rounded-xl shadow-lg py-1 min-w-[200px] animate-fade-in">
          {AI_OPTIONS.map((opt) => (
            <button
              key={opt.action}
              type="button"
              onClick={() => handleAction(opt.action)}
              className="w-full text-left px-3 py-2 text-sm text-foreground hover:bg-accent/10 transition-colors duration-150 flex items-center gap-2"
            >
              <span>{opt.icon}</span>
              <span>{opt.label}</span>
            </button>
          ))}
        </div>
      )}

      {/* Result card */}
      {(loading || result) && (
        <div
          ref={resultRef}
          className="absolute top-full left-1/2 -translate-x-1/2 mt-2 z-50 w-[360px] max-w-[90vw] bg-card border border-border rounded-xl shadow-lg p-4 animate-fade-in"
        >
          {loading ? (
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full border-2 border-primary border-t-transparent animate-spin" />
              <span className="text-sm text-muted-foreground">Analisando...</span>
            </div>
          ) : result ? (
            <>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-primary">
                  {AI_OPTIONS.find(o => o.action === resultAction)?.icon}{" "}
                  {AI_OPTIONS.find(o => o.action === resultAction)?.label}
                </span>
                <button
                  type="button"
                  onClick={() => { setResult(null); setResultAction(null); }}
                  className="w-6 h-6 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-accent/10 transition-colors text-xs"
                >
                  ✕
                </button>
              </div>
              <div className="text-sm text-foreground leading-relaxed whitespace-pre-wrap max-h-[300px] overflow-y-auto mb-3">
                {result}
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleInsert}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium bg-primary/15 text-primary hover:bg-primary/25 transition-colors"
                >
                  Inserir na nota
                </button>
                <button
                  type="button"
                  onClick={handleCopy}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-accent/10 transition-colors"
                >
                  Copiar
                </button>
              </div>
            </>
          ) : null}
        </div>
      )}
    </div>
  );
}
