import { lazy, Suspense, useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import type { StudySessionRow } from "./types";

const ManualMindMapCanvas = lazy(() => import("@/components/mindmap/ManualMindMapCanvas"));

interface Props {
  session: StudySessionRow;
  userCodeId: string;
  onUpdate?: (s: StudySessionRow) => void;
}

/**
 * Renderiza o mapa mental editável vinculado à sessão.
 * Se a sessão ainda não tem mind_map_id (ex.: sessão antiga, upload sem layout),
 * cria um a partir dos tópicos detectados.
 */
export default function AgentMapTab({ session, userCodeId, onUpdate }: Props) {
  const [mapId, setMapId] = useState<string | null>(session.mind_map_id || null);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    setMapId(session.mind_map_id || null);
  }, [session.mind_map_id]);

  useEffect(() => {
    if (mapId || creating) return;
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
              description: t.keyPoints?.[0] || "",
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
  }, [mapId, creating, session, userCodeId, onUpdate]);

  if (!mapId) {
    return (
      <div className="flex items-center justify-center py-20 text-muted-foreground text-sm gap-2">
        <Loader2 size={14} className="animate-spin" /> Preparando mapa…
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-200px)] lg:h-[calc(100vh-180px)]">
      <Suspense fallback={
        <div className="flex items-center justify-center h-full text-muted-foreground text-sm gap-2">
          <Loader2 size={14} className="animate-spin" /> Carregando canvas…
        </div>
      }>
        <ManualMindMapCanvas
          userCodeId={userCodeId}
          mapId={mapId}
          onClose={() => { /* sem close: aba é parte do hub */ }}
        />
      </Suspense>
    </div>
  );
}
