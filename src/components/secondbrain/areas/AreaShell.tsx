import { useEffect, useMemo, useRef, useState, lazy, Suspense } from "react";
import { ArrowLeft, Map, List, Layers } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { haptic } from "@/hooks/useHaptic";
import { toast } from "@/hooks/use-toast";
import { AREA_META, areaCSSVars, type BrainArea } from "@/lib/brainAreas";
import AreaAmbience from "./AreaAmbience";
import AreaCommandDock from "./AreaCommandDock";
import AreaFeed from "./AreaFeed";
import AreaSoundToggle from "./AreaSoundToggle";
import { useAreaSound } from "@/hooks/useAreaSound";
import PrayerWall from "./exts/PrayerWall";
import MiniKanban from "./exts/MiniKanban";

const ThoughtGraph = lazy(() => import("../ThoughtGraph"));

type View = "feed" | "graph" | "ext";

interface Props {
  area: BrainArea;
  userCodeId: string;
  initialContent?: string;
  onClose: () => void;
}

export default function AreaShell({ area, userCodeId, initialContent, onClose }: Props) {
  const m = AREA_META[area];
  const [view, setView] = useState<View>("feed");
  const [seed, setSeed] = useState(initialContent ?? "");
  const [refreshKey, setRefreshKey] = useState(0);
  const [highlightId, setHighlightId] = useState<string | null>(null);
  const [filterIds, setFilterIds] = useState<Set<string> | null>(null);
  const [ghostIds, setGhostIds] = useState<Set<string> | null>(null);
  const [dragOver, setDragOver] = useState(false);

  // Audio
  const { iframeRef, pref, resolvedVideoId, setSound, setVolume, toggleMute } = useAreaSound(area, true);

  useEffect(() => { setSeed(initialContent ?? ""); }, [initialContent, area]);

  // Refresh feed/graph + load filterIds whenever a new thought is captured
  useEffect(() => {
    const onAdded = (e: Event) => {
      const detail = (e as CustomEvent<{ id?: string; area?: BrainArea }>).detail;
      setRefreshKey(k => k + 1);
      if (detail?.id) setHighlightId(detail.id);
    };
    window.addEventListener("brain-thought-added", onAdded as EventListener);
    return () => window.removeEventListener("brain-thought-added", onAdded as EventListener);
  }, []);

  // Compute filterIds for graph: this area = full, others = ghosts
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("thoughts")
        .select("id, area")
        .eq("user_code_id", userCodeId)
        .eq("archived", false);
      if (cancelled || !data) return;
      const fIds = new Set<string>();
      const gIds = new Set<string>();
      data.forEach((t: any) => {
        if (t.area === area) fIds.add(t.id);
        else gIds.add(t.id);
      });
      setFilterIds(fIds);
      setGhostIds(gIds);
    })();
    return () => { cancelled = true; };
  }, [userCodeId, area, refreshKey]);

  // ESC to close
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  // Drag-drop capture
  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const text = e.dataTransfer.getData("text/plain") || e.dataTransfer.getData("text");
    if (!text || !text.trim()) return;
    haptic("medium");
    try {
      const { data: inserted, error } = await supabase
        .from("thoughts")
        .insert({
          user_code_id: userCodeId,
          content: text.trim(),
          type: m.defaultType,
          area: area,
          ...(area === "oracao" ? { prayer_status: "pending" } : {}),
          ...(area === "brainstorm" ? { kanban_status: "idea" } : {}),
        } as any)
        .select("id")
        .single();
      if (error) throw error;
      toast({ title: `${m.emoji} Solto na área ${m.label}` });
      window.dispatchEvent(new CustomEvent("brain-thought-added", { detail: { id: inserted.id, area } }));
    } catch (err: any) {
      toast({ title: "Falha ao soltar", description: err?.message, variant: "destructive" });
    }
  };

  const ExtensionPanel = useMemo(() => {
    if (area === "oracao") return <PrayerWall userCodeId={userCodeId} refreshKey={refreshKey} />;
    if (area === "brainstorm") return <MiniKanban userCodeId={userCodeId} refreshKey={refreshKey} />;
    return (
      <p className="text-[12px] text-center py-8" style={{ color: m.muted }}>
        Esta área usa o feed. Toque em um card para abrir o exercício de reflexão.
      </p>
    );
  }, [area, userCodeId, refreshKey, m.muted]);

  return (
    <div
      className="absolute inset-0 z-[300] flex flex-col animate-fade-in overflow-hidden"
      style={{ ...areaCSSVars(area), background: m.bg, color: m.text }}
    >
      {/* Hidden YouTube iframe (singleton) */}
      {resolvedVideoId && (
        <iframe
          ref={iframeRef}
          src={`https://www.youtube.com/embed/${resolvedVideoId}?enablejsapi=1&autoplay=1&loop=1&playlist=${resolvedVideoId}&controls=0`}
          allow="autoplay; encrypted-media"
          className="absolute pointer-events-none"
          style={{ width: 1, height: 1, opacity: 0.01, bottom: 0, right: 0, border: "none" }}
          title="Area ambient sound"
        />
      )}

      {/* Ambience background */}
      <AreaAmbience area={area} />

      {/* Top bar */}
      <header
        className="relative z-10 flex items-center gap-2 px-3 sm:px-4 py-2.5 border-b shrink-0"
        style={{ background: `${m.surface}cc`, borderColor: m.border, backdropFilter: "blur(10px)" }}
      >
        <button
          onClick={() => { onClose(); haptic("light"); }}
          className="w-9 h-9 rounded-lg flex items-center justify-center transition-colors shrink-0"
          style={{ background: m.surface, color: m.text, border: `1px solid ${m.border}` }}
          aria-label="Voltar"
        >
          <ArrowLeft size={15} />
        </button>
        <span className="text-[20px] leading-none">{m.emoji}</span>
        <div className="leading-tight min-w-0">
          <p className="text-[9px] uppercase tracking-[2px]" style={{ color: m.muted }}>Área</p>
          <p className="text-[13px] font-bold truncate" style={{ color: m.accent }}>{m.label.toUpperCase()}</p>
        </div>
        <div className="flex-1" />

        {/* View switcher */}
        <div className="flex items-center gap-1 p-1 rounded-lg shrink-0"
          style={{ background: m.surface, border: `1px solid ${m.border}` }}>
          {([
            { k: "feed",  Icon: List,   label: "Feed" },
            { k: "graph", Icon: Map,    label: "Grafo" },
            { k: "ext",   Icon: Layers, label: m.id === "oracao" ? "Muro" : m.id === "brainstorm" ? "Kanban" : "Exerc." },
          ] as const).map(({ k, Icon, label }) => (
            <button
              key={k}
              onClick={() => { setView(k); haptic("light"); }}
              className="flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-bold transition-all"
              style={{
                background: view === k ? `${m.accent}1f` : "transparent",
                color: view === k ? m.accent : m.muted,
                border: `1px solid ${view === k ? m.accent + "55" : "transparent"}`,
              }}
            >
              <Icon size={11} />
              <span className="hidden sm:inline">{label}</span>
            </button>
          ))}
        </div>

        <AreaSoundToggle
          area={area}
          pref={pref}
          setSound={setSound}
          setVolume={setVolume}
          toggleMute={toggleMute}
        />
      </header>

      {/* Content area */}
      <div
        onDragOver={(e) => { e.preventDefault(); if (!dragOver) setDragOver(true); }}
        onDragLeave={(e) => { if (e.currentTarget === e.target) setDragOver(false); }}
        onDrop={handleDrop}
        className="relative flex-1 overflow-hidden min-h-0"
      >
        {/* views */}
        {view === "feed" && (
          <div className="absolute inset-0 overflow-y-auto px-3 sm:px-5 pt-4 pb-[200px]">
            <div className="max-w-2xl mx-auto">
              <AreaFeed area={area} userCodeId={userCodeId} refreshKey={refreshKey} highlightId={highlightId} />
            </div>
          </div>
        )}

        {view === "graph" && (
          <div className="absolute inset-0">
            <Suspense fallback={<div className="h-full flex items-center justify-center text-[12px]" style={{ color: m.muted }}>Carregando grafo…</div>}>
              <ThoughtGraph
                userCodeId={userCodeId}
                theme="area"
                themeColor={m.accent}
                embedded
                filterIds={filterIds ?? undefined}
                ghostIds={ghostIds ?? undefined}
                onSelectNode={(id) => { setHighlightId(id); setView("feed"); }}
              />
            </Suspense>
          </div>
        )}

        {view === "ext" && (
          <div className="absolute inset-0 overflow-y-auto px-3 sm:px-5 pt-4 pb-[200px]">
            <div className="max-w-2xl mx-auto">{ExtensionPanel}</div>
          </div>
        )}

        {/* Floating dock */}
        <div
          className="absolute left-1/2 -translate-x-1/2 w-[min(720px,calc(100%-20px))] z-20"
          style={{ bottom: "max(env(safe-area-inset-bottom), 14px)" }}
        >
          <AreaCommandDock
            area={area}
            userCodeId={userCodeId}
            initialContent={seed}
            onCaptured={(id) => { setSeed(""); setHighlightId(id); setView("feed"); }}
          />
        </div>

        {/* Drag overlay */}
        {dragOver && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none animate-fade-in z-30"
            style={{ background: `${m.accent}10`, border: `2px dashed ${m.accent}`, backdropFilter: "blur(2px)" }}>
            <div className="text-center">
              <p className="text-[42px]">{m.emoji}</p>
              <p className="text-[14px] font-bold mt-2" style={{ color: m.accent }}>Solte aqui para capturar</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
