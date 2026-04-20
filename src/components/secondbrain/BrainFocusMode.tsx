import { useEffect, useRef, useState } from "react";
import { ArrowLeft, Brain, Zap } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { haptic } from "@/hooks/useHaptic";
import { toast } from "@/hooks/use-toast";
import ThoughtGraph from "./ThoughtGraph";
import BrainCommandDock from "./BrainCommandDock";
import BrainSidePanel from "./BrainSidePanel";

const PALETTE = {
  bg: "#0B0F14",
  surface: "#11161D",
  surfaceLight: "#1A2129",
  border: "#1F2730",
  primary: "#00FF94",
  text: "#E6EDF3",
  textDim: "#7A8A99",
};

interface Props {
  open: boolean;
  userCodeId: string;
  onExit: () => void;
  initialContent?: string;
}

export default function BrainFocusMode({ open, userCodeId, onExit, initialContent }: Props) {
  const [count, setCount] = useState(0);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [graphKey, setGraphKey] = useState(0); // bump to force refetch
  const [dragOver, setDragOver] = useState(false);
  const [seedContent, setSeedContent] = useState(initialContent ?? "");
  const dropRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setSeedContent(initialContent ?? "");
  }, [initialContent, open]);

  // Count
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    (async () => {
      const { count: c } = await supabase
        .from("thoughts")
        .select("id", { count: "exact", head: true })
        .eq("user_code_id", userCodeId)
        .eq("archived", false);
      if (!cancelled) setCount(c ?? 0);
    })();
    return () => {
      cancelled = true;
    };
  }, [open, userCodeId, graphKey]);

  // Listen for new thoughts captured anywhere → refresh graph
  useEffect(() => {
    if (!open) return;
    const onAdded = (e: Event) => {
      setGraphKey((k) => k + 1);
      const id = (e as CustomEvent<{ id?: string }>).detail?.id;
      if (id) setSelectedId(id);
    };
    const onSelect = (e: Event) => {
      const id = (e as CustomEvent<{ id: string }>).detail?.id;
      if (id) setSelectedId(id);
    };
    window.addEventListener("brain-thought-added", onAdded as EventListener);
    window.addEventListener("brain-node-select", onSelect as EventListener);
    return () => {
      window.removeEventListener("brain-thought-added", onAdded as EventListener);
      window.removeEventListener("brain-node-select", onSelect as EventListener);
    };
  }, [open]);

  // Drop handler — captures dropped text as a thought
  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const text = e.dataTransfer.getData("text/plain") || e.dataTransfer.getData("text");
    if (!text || !text.trim()) return;
    haptic("medium");
    try {
      const { data: inserted, error } = await supabase
        .from("thoughts")
        .insert({ user_code_id: userCodeId, content: text.trim(), type: "ideia" })
        .select("id")
        .single();
      if (error) throw error;
      toast({ title: "⚡ Pensamento solto no cérebro" });
      window.dispatchEvent(new CustomEvent("brain-thought-added", { detail: { id: inserted.id } }));
    } catch (err: any) {
      toast({ title: "Falha ao soltar pensamento", description: err?.message, variant: "destructive" });
    }
  };

  if (!open) return null;

  return (
    <div
      className="absolute inset-0 z-[250] flex flex-col animate-fade-in"
      style={{ background: PALETTE.bg, color: PALETTE.text }}
    >
      {/* Top bar */}
      <div
        className="flex items-center gap-3 px-4 py-2.5 border-b shrink-0"
        style={{ background: PALETTE.surface, borderColor: PALETTE.border }}
      >
        <button
          onClick={() => {
            onExit();
            haptic("light");
          }}
          className="w-9 h-9 rounded-lg flex items-center justify-center transition-colors"
          style={{ background: PALETTE.surfaceLight, color: PALETTE.text, border: `1px solid ${PALETTE.border}` }}
          aria-label="Voltar ao chat do Foco"
        >
          <ArrowLeft size={15} />
        </button>
        <div className="w-7 h-7 rounded-lg flex items-center justify-center"
          style={{ background: `${PALETTE.primary}14`, border: `1px solid ${PALETTE.primary}55` }}>
          <Brain size={14} style={{ color: PALETTE.primary }} />
        </div>
        <div className="leading-tight">
          <p className="text-[9px] uppercase tracking-[2px]" style={{ color: PALETTE.textDim }}>Modo</p>
          <p className="text-[12px] font-bold" style={{ color: PALETTE.primary }}>SEGUNDO CÉREBRO</p>
        </div>
        <div className="flex-1" />
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px]"
          style={{ background: PALETTE.surfaceLight, border: `1px solid ${PALETTE.border}` }}>
          <Zap size={11} style={{ color: PALETTE.primary }} />
          <span className="font-bold tabular-nums" style={{ color: PALETTE.primary }}>{count}</span>
          <span style={{ color: PALETTE.textDim }}>pensamentos</span>
        </div>
      </div>

      {/* Main split */}
      <div
        ref={dropRef}
        onDragOver={(e) => { e.preventDefault(); if (!dragOver) setDragOver(true); }}
        onDragLeave={(e) => {
          if (e.currentTarget === e.target) setDragOver(false);
        }}
        onDrop={handleDrop}
        className="flex-1 flex overflow-hidden min-h-0 relative"
      >
        {/* Graph area */}
        <div className="flex-1 relative min-w-0">
          <ThoughtGraph
            key={graphKey}
            userCodeId={userCodeId}
            theme="neon"
            embedded
            onSelectNode={(id) => setSelectedId(id)}
          />

          {/* Floating dock */}
          <div
            className="absolute left-1/2 -translate-x-1/2 w-[min(720px,calc(100%-24px))]"
            style={{ bottom: "max(env(safe-area-inset-bottom), 16px)" }}
          >
            <BrainCommandDock
              userCodeId={userCodeId}
              initialContent={seedContent}
              onCaptured={(id) => {
                setSeedContent("");
                setSelectedId(id);
              }}
            />
          </div>

          {/* Drag overlay */}
          {dragOver && (
            <div
              className="absolute inset-0 flex items-center justify-center pointer-events-none animate-fade-in"
              style={{
                background: `${PALETTE.primary}10`,
                border: `2px dashed ${PALETTE.primary}`,
                backdropFilter: "blur(2px)",
              }}
            >
              <div className="text-center">
                <Brain size={42} style={{ color: PALETTE.primary }} className="mx-auto mb-2" />
                <p className="text-[14px] font-bold" style={{ color: PALETTE.primary }}>
                  Solte para capturar
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Side panel (desktop) */}
        <aside
          className="hidden md:flex w-[340px] shrink-0 border-l flex-col"
          style={{ background: PALETTE.bg, borderColor: PALETTE.border }}
        >
          <BrainSidePanel
            thoughtId={selectedId}
            userCodeId={userCodeId}
            onSelect={(id) => setSelectedId(id)}
            onClose={() => setSelectedId(null)}
          />
        </aside>
      </div>

      {/* Mobile selected sheet */}
      {selectedId && (
        <div
          className="md:hidden absolute bottom-0 left-0 right-0 z-[260] rounded-t-2xl flex flex-col animate-fade-in"
          style={{
            background: PALETTE.surface,
            border: `1px solid ${PALETTE.border}`,
            borderBottom: "none",
            maxHeight: "70vh",
            boxShadow: "0 -8px 24px rgba(0,0,0,0.5)",
          }}
        >
          <BrainSidePanel
            thoughtId={selectedId}
            userCodeId={userCodeId}
            onSelect={(id) => setSelectedId(id)}
            onClose={() => setSelectedId(null)}
          />
        </div>
      )}
    </div>
  );
}
