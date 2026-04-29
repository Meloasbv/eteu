import { lazy, Suspense, useEffect, useMemo, useState } from "react";
import { Loader2, BookOpen, Quote, ListTree, Network, ChevronRight, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import type { StudySessionRow, DetectedTopic } from "./types";

const ManualMindMapCanvas = lazy(() => import("@/components/mindmap/ManualMindMapCanvas"));

interface Props {
  session: StudySessionRow;
  userCodeId: string;
  onUpdate?: (s: StudySessionRow) => void;
}

type View = "outline" | "canvas" | "split";

/**
 * Aba Mapa do StudyHub — combina:
 *   • Outline editorial (resumo intuitivo, hierarquia clara)
 *   • Canvas mental (mapa interativo)
 * Usuário escolhe ver outline, canvas, ou split (desktop).
 */
export default function AgentMapTab({ session, userCodeId, onUpdate }: Props) {
  const [mapId, setMapId] = useState<string | null>(session.mind_map_id || null);
  const [creating, setCreating] = useState(false);
  const [view, setView] = useState<View>("outline");

  useEffect(() => { setMapId(session.mind_map_id || null); }, [session.mind_map_id]);

  // Cria mapa lazy — apenas se aba canvas/split for ativada e não houver mapId.
  useEffect(() => {
    if (mapId || creating) return;
    if (view === "outline") return;
    let cancelled = false;
    (async () => {
      setCreating(true);
      try {
        const topics = session.topics || [];
        const rootId = "root";
        const nodes: any[] = [{
          id: rootId,
          type: "manualRoot",
          position: { x: 0, y: -180 },
          data: { label: (session.title || "Sessão").slice(0, 60) },
        }];
        topics.forEach((t, i) => {
          const cols = 3;
          const col = i % cols;
          const row = Math.floor(i / cols);
          nodes.push({
            id: t.id,
            type: "simpleNode",
            position: { x: (col - 1) * 240, y: row * 130 + 60 },
            data: {
              title: t.title,
              description: t.summary || t.keyPoints?.[0] || "",
              color: "#c4a46a",
              colorMode: "border",
              level: "title",
            },
          });
        });
        const edges = topics.map((t) => ({ id: `er-${t.id}`, source: rootId, target: t.id, type: "smoothstep" }));

        const { data: mm, error } = await supabase
          .from("mind_maps")
          .insert({
            user_code_id: userCodeId,
            title: session.title || "Sessão",
            source_type: "agent",
            nodes: nodes as any,
            edges: edges as any,
          })
          .select("id")
          .single();
        if (error) throw error;
        if (cancelled) return;

        await supabase.from("study_sessions").update({ mind_map_id: mm.id }).eq("id", session.id);
        if (cancelled) return;
        setMapId(mm.id);
        onUpdate?.({ ...session, mind_map_id: mm.id });
      } catch (e: any) {
        toast({ title: "Falha ao criar mapa", description: e?.message, variant: "destructive" });
      } finally {
        if (!cancelled) setCreating(false);
      }
    })();
    return () => { cancelled = true; };
  }, [mapId, creating, session, userCodeId, onUpdate, view]);

  const topics = useMemo(() => session.topics || [], [session.topics]);

  return (
    <div className="h-[calc(100vh-200px)] lg:h-[calc(100vh-180px)] flex flex-col">
      {/* View toggle */}
      <div className="px-4 lg:px-6 py-2 border-b border-border/30 flex items-center gap-1 shrink-0">
        <ViewBtn active={view === "outline"} onClick={() => setView("outline")} icon={<ListTree size={12} />} label="Resumo" />
        <ViewBtn active={view === "canvas"} onClick={() => setView("canvas")} icon={<Network size={12} />} label="Mapa" />
        <ViewBtn active={view === "split"} onClick={() => setView("split")} icon={<><ListTree size={11} /><Network size={11} /></>} label="Lado a lado" hideOnMobile />
        <span className="ml-auto text-[10px] text-muted-foreground/60">{topics.length} blocos · {topics.reduce((a, t) => a + t.verses.length, 0)} versículos</span>
      </div>

      <div className={`flex-1 overflow-hidden ${view === "split" ? "grid grid-cols-1 lg:grid-cols-2" : ""}`}>
        {(view === "outline" || view === "split") && (
          <OutlineView topics={topics} title={session.title} />
        )}
        {(view === "canvas" || view === "split") && (
          <div className={`${view === "split" ? "lg:border-l border-border/40" : ""} h-full`}>
            {!mapId ? (
              <div className="flex items-center justify-center h-full text-muted-foreground text-sm gap-2">
                <Loader2 size={14} className="animate-spin" /> Preparando mapa…
              </div>
            ) : (
              <Suspense fallback={
                <div className="flex items-center justify-center h-full text-muted-foreground text-sm gap-2">
                  <Loader2 size={14} className="animate-spin" /> Carregando canvas…
                </div>
              }>
                <ManualMindMapCanvas userCodeId={userCodeId} mapId={mapId} onClose={() => { /* aba */ }} />
              </Suspense>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ─────────── Outline editorial ───────────
function OutlineView({ topics, title }: { topics: DetectedTopic[]; title: string }) {
  if (!topics.length) {
    return (
      <div className="flex items-center justify-center h-full text-sm italic text-muted-foreground/70">
        Nenhum tópico detectado nesta sessão.
      </div>
    );
  }
  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-3xl mx-auto px-5 lg:px-10 py-8 lg:py-12">
        {/* Header editorial */}
        <header className="mb-10 pb-6 border-b border-border/40">
          <p className="text-[10px] tracking-[3px] uppercase text-primary/70 font-ui mb-2 flex items-center gap-1.5">
            <Sparkles size={10} /> Resumo intuitivo
          </p>
          <h2 className="font-display text-2xl lg:text-3xl text-foreground leading-tight">{title}</h2>
          <p className="text-xs text-muted-foreground mt-2">
            {topics.length} blocos · clique em um para expandir
          </p>
        </header>

        <ol className="space-y-6">
          {topics.map((t, i) => (
            <OutlineItem key={t.id} topic={t} index={i + 1} />
          ))}
        </ol>
      </div>
    </div>
  );
}

function OutlineItem({ topic, index }: { topic: DetectedTopic; index: number }) {
  const [open, setOpen] = useState(index <= 3); // primeiros 3 abertos
  const fmt = (ms: number) => {
    const s = Math.floor(ms / 1000);
    return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
  };
  return (
    <li className="group">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full text-left flex items-baseline gap-3 group/btn"
      >
        <span
          className="font-display text-2xl text-primary/30 group-hover/btn:text-primary/70 transition-colors w-10 shrink-0 leading-none"
          style={{ fontFeatureSettings: "'tnum'" }}
        >
          {String(index).padStart(2, "0")}
        </span>
        <div className="flex-1 min-w-0 pt-1">
          <div className="flex items-baseline gap-2">
            <ChevronRight
              size={12}
              className={`text-muted-foreground transition-transform shrink-0 ${open ? "rotate-90" : ""}`}
            />
            <h3 className="font-display text-base lg:text-lg text-foreground leading-snug group-hover/btn:text-primary transition-colors">
              {topic.title}
            </h3>
            <span className="text-[10px] font-mono text-muted-foreground/60 ml-auto shrink-0">{fmt(topic.startTimestamp)}</span>
          </div>
        </div>
      </button>

      {open && (
        <div className="ml-13 pl-13 mt-3 space-y-3 animate-in fade-in slide-in-from-top-1 duration-200" style={{ paddingLeft: 52 }}>
          {topic.summary && (
            <p
              className="text-[15px] text-foreground/85 leading-relaxed border-l-2 pl-4"
              style={{ fontFamily: "'Crimson Text', Georgia, serif", borderColor: "hsl(var(--primary) / 0.4)" }}
            >
              {topic.summary}
            </p>
          )}

          {topic.keyPoints.length > 1 && (
            <ul className="space-y-1.5 pl-4">
              {topic.keyPoints.slice(1).map((kp, i) => (
                <li key={i} className="text-sm text-foreground/80 flex gap-2" style={{ fontFamily: "'Crimson Text', Georgia, serif" }}>
                  <span className="text-primary/60 mt-1">·</span>
                  <span>{kp}</span>
                </li>
              ))}
            </ul>
          )}

          {topic.impactPhrases.length > 0 && topic.impactPhrases.map((p, i) => (
            <blockquote
              key={i}
              className="pl-4 italic text-sm flex gap-2"
              style={{
                borderLeft: "3px solid hsl(var(--primary) / 0.7)",
                color: "hsl(var(--primary))",
                fontFamily: "'Crimson Text', Georgia, serif",
              }}
            >
              <Quote size={12} className="mt-1 shrink-0 opacity-60" />
              "{p}"
            </blockquote>
          ))}

          {topic.verses.length > 0 && (
            <div className="flex items-center flex-wrap gap-1.5 pt-1 pl-4">
              <BookOpen size={11} className="text-primary/70" />
              {topic.verses.map((v) => (
                <span
                  key={v}
                  className="text-[11px] px-2 py-0.5 rounded-full font-mono text-primary"
                  style={{ background: "hsl(var(--primary) / 0.08)", border: "1px solid hsl(var(--primary) / 0.2)" }}
                >
                  {v}
                </span>
              ))}
            </div>
          )}
        </div>
      )}
    </li>
  );
}

function ViewBtn({
  active, onClick, icon, label, hideOnMobile,
}: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string; hideOnMobile?: boolean }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-[11px] font-ui transition-all ${
        hideOnMobile ? "hidden lg:flex" : ""
      } ${active ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground"}`}
    >
      <span className="flex items-center gap-0.5">{icon}</span> {label}
    </button>
  );
}
